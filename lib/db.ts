import crypto from "node:crypto";

export type Param = string | number | bigint | null | Uint8Array;

type Row = Record<string, unknown>;
type Statement = { sql: string; params?: Param[] };

type Driver = {
  all(sql: string, params: Param[]): Promise<Row[]>;
  run(sql: string, params: Param[]): Promise<{ changes: number; lastInsertRowid: number }>;
  batch(statements: Statement[]): Promise<void>;
};

/**
 * Two interchangeable drivers keep the same SQL working in both places:
 *  - local development reads and writes a SQLite file through node:sqlite;
 *  - production (Vercel) talks to a hosted libSQL/Turso database over HTTPS,
 *    because a Vercel function's filesystem is read-only and per-instance.
 */
const remoteUrl = (process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "").trim();
const remoteToken = (process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN ?? "").trim();
export const isRemoteDatabase = /^(libsql|https?):\/\//i.test(remoteUrl);

type DbGlobal = typeof globalThis & { __mboDriver?: Promise<Driver>; __mboReady?: Promise<void> };
const g = globalThis as DbGlobal;

async function createLocalDriver(): Promise<Driver> {
  const { DatabaseSync } = await import("node:sqlite");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = process.env.MBO_DB_PATH ?? path.join(dataDir, "myboakeno.db");
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA busy_timeout = 15000;");
  database.exec("PRAGMA journal_mode = WAL;");
  return {
    async all(sql, params) {
      // node:sqlite rows have a null prototype, which React refuses to serialize
      // into client components. Spread them into ordinary objects at the boundary.
      return (database.prepare(sql).all(...params) as Row[]).map((row) => ({ ...row }));
    },
    async run(sql, params) {
      const info = database.prepare(sql).run(...params);
      return { changes: Number(info.changes), lastInsertRowid: Number(info.lastInsertRowid) };
    },
    async batch(statements) {
      // One writer at a time: schema rebuilds and seeds must not race a second process.
      database.exec("BEGIN IMMEDIATE;");
      try {
        for (const statement of statements) database.prepare(statement.sql).run(...(statement.params ?? []));
        database.exec("COMMIT;");
      } catch (error) {
        try {
          database.exec("ROLLBACK;");
        } catch {
          // SQLite may already have rolled the transaction back.
        }
        throw error;
      }
    },
  };
}

function toRemoteArg(value: Param) {
  // libSQL expects binary values as an ArrayBuffer of their own.
  if (value instanceof Uint8Array) return new Uint8Array(value).buffer;
  return value === undefined ? null : value;
}

function fromRemoteRow(row: Record<string, unknown>): Row {
  const record: Row = {};
  for (const [key, value] of Object.entries(row)) {
    record[key] = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
  }
  return record;
}

async function createRemoteDriver(): Promise<Driver> {
  // Official libSQL client: handles the HTTPS pipeline, transactions and retries.
  const { createClient } = await import("@libsql/client/web");
  const client = createClient({ url: remoteUrl, authToken: remoteToken });
  const args = (params: Param[]) => params.map(toRemoteArg) as never;

  return {
    async all(sql, params) {
      const result = await client.execute({ sql, args: args(params) });
      return result.rows.map((row) => fromRemoteRow(row as Record<string, unknown>));
    },
    async run(sql, params) {
      const result = await client.execute({ sql, args: args(params) });
      return {
        changes: Number(result.rowsAffected ?? 0),
        lastInsertRowid: Number(result.lastInsertRowid ?? 0),
      };
    },
    async batch(statements) {
      const steps = statements.map((statement) => ({
        sql: statement.sql,
        args: args(statement.params ?? []),
      }));
      // Two cold starts can try to create and seed the schema at the same moment;
      // the loser waits for the winner instead of failing the request.
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          await client.batch(steps, "write");
          return;
        } catch (error) {
          lastError = error;
          const message = String((error as Error)?.message ?? "");
          if (!/lock|busy|conflict|transaction/i.test(message)) throw error;
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
      throw lastError;
    },
  };
}

function getDriver(): Promise<Driver> {
  return (g.__mboDriver ??= isRemoteDatabase ? createRemoteDriver() : createLocalDriver());
}

function ready(): Promise<void> {
  return (g.__mboReady ??= initDatabase().catch((error) => {
    // Let the next request retry a failed schema setup instead of caching the failure.
    g.__mboReady = undefined;
    throw error;
  }));
}

export async function query<T>(sql: string, ...params: Param[]): Promise<T[]> {
  await ready();
  const driver = await getDriver();
  return (await driver.all(sql, params)) as T[];
}

export async function queryOne<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  const rows = await query<T>(sql, ...params);
  return rows[0];
}

export async function execute(sql: string, ...params: Param[]) {
  await ready();
  const driver = await getDriver();
  return driver.run(sql, params);
}

function insertStatement(table: string, values: Record<string, Param>): Statement {
  const keys = Object.keys(values);
  return {
    sql: `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
    params: keys.map((key) => values[key]),
  };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/**
 * Bump this whenever the seeded reference content changes. The prototype database is
 * rebuilt from the verified Boac reference data below when the version differs.
 */
const CONTENT_VERSION = "4";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  barangay TEXT,
  role TEXT NOT NULL DEFAULT 'resident',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  category TEXT NOT NULL,
  barangay TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏪',
  accent TEXT NOT NULL DEFAULT 'from-brand-500 to-brand-800',
  rating REAL NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  is_open INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pc',
  stock INTEGER NOT NULL DEFAULT 20,
  emoji TEXT NOT NULL DEFAULT '🛍️',
  image_id INTEGER REFERENCES media(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS delivery_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  fee INTEGER NOT NULL,
  eta TEXT NOT NULL DEFAULT '30–45 mins'
);
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  line TEXT NOT NULL,
  barangay TEXT NOT NULL,
  notes TEXT,
  lat REAL,
  lng REAL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  mode TEXT NOT NULL DEFAULT 'delivery',
  address_id INTEGER REFERENCES addresses(id),
  address_text TEXT,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'placed',
  note TEXT,
  placed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🛍️'
);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  barangay TEXT NOT NULL,
  description TEXT NOT NULL,
  lat REAL,
  lng REAL,
  hours TEXT,
  fee TEXT,
  duration TEXT,
  rating REAL NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '📍',
  accent TEXT NOT NULL DEFAULT 'from-moss-500 to-moss-800',
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bucket_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planned',
  visited_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, destination_id)
);
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  description TEXT NOT NULL,
  barangay TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  reporter_phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  team TEXT,
  lat REAL,
  lng REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS park_venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  hours TEXT NOT NULL DEFAULT 'Hours not posted',
  emoji TEXT NOT NULL DEFAULT '🎡',
  capacity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS park_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL REFERENCES park_venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  days TEXT NOT NULL DEFAULT 'Daily',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS officers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  full_name TEXT NOT NULL,
  barangay TEXT NOT NULL,
  badge_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'update',
  href TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Announcement',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Community',
  barangay TEXT,
  kind TEXT NOT NULL DEFAULT 'news',
  source_name TEXT,
  source_url TEXT,
  emoji TEXT NOT NULL DEFAULT '📰',
  accent TEXT NOT NULL DEFAULT 'from-brand-600 to-brand-900',
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  author_id INTEGER REFERENCES users(id),
  image_id INTEGER REFERENCES media(id),
  published_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);
`;

const SCHEMA_STATEMENTS: Statement[] = SCHEMA.split(";")
  .map((statement) => statement.trim())
  .filter(Boolean)
  .map((sql) => ({ sql }));

async function columnNames(driver: Driver, table: string): Promise<string[]> {
  const rows = await driver.all(`PRAGMA table_info(${table})`, []);
  return rows.map((row) => String(row.name));
}

/**
 * Seed data is limited to verifiable reference content about Boac, Marinduque:
 * the 61 barangays live in code, and these places are drawn from the Provincial
 * Government of Marinduque, the Department of Tourism, Wikipedia and Wikivoyage.
 *
 * Nothing here is invented: no fictional shops, products, orders, incidents,
 * announcements, ratings, reviews, officers, schedules or people. Coordinates are
 * only set where a public source publishes them; hours and fees only where sourced.
 */
const BOAC_PLACES = [
  {
    slug: "boac-cathedral",
    name: "Boac Cathedral",
    category: "Heritage",
    barangay: "Mataas na Bayan (Poblacion)",
    description:
      "The Immaculate Conception Cathedral, seat of the Diocese of Boac, is a hilltop fortress church dedicated in 1792 and ringed by centuries-old defensive walls. The Immaculate Conception is Boac's patron saint, and the cathedral is the focal point of the town's Holy Week devotion.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "⛪",
    accent: "from-amber-500 to-orange-800",
    featured: 1,
  },
  {
    slug: "national-museum-of-marinduque",
    name: "National Museum of Marinduque",
    category: "Culture",
    barangay: "Malusak (Poblacion)",
    description:
      "The Marinduque–Romblon Area Museum of the National Museum of the Philippines, beside the town plaza. Exhibits cover the island's archaeology, shipwreck finds, Moriones costumes and local craft traditions. Entrance is free.",
    lat: 13.44781,
    lng: 121.84008,
    hours: "10:00 AM – 5:00 PM",
    fee: "Free",
    duration: null,
    emoji: "🏛️",
    accent: "from-indigo-500 to-blue-800",
    featured: 1,
  },
  {
    slug: "boac-town-plaza-and-rizal-park",
    name: "Boac Town Plaza & Rizal Park",
    category: "Landmark",
    barangay: "San Miguel (Poblacion)",
    description:
      "The civic heart of Boac, where the town's major gatherings and festivals are held. The municipal building and the National Museum branch are close by, and the plaza is the natural starting point for a walk through the poblacion.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🌳",
    accent: "from-emerald-500 to-teal-800",
    featured: 0,
  },
  {
    slug: "boac-town-arena",
    name: "Boac Town Arena (Moriones Arena)",
    category: "Culture",
    barangay: "San Miguel (Poblacion)",
    description:
      "The arena where Boac stages the senakulo, the street play at the centre of the Moriones Festival. Outside Holy Week it hosts town assemblies, sports leagues and community events.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🎭",
    accent: "from-fuchsia-600 to-purple-900",
    featured: 0,
  },
  {
    slug: "boac-heritage-houses",
    name: "Boac Heritage Houses",
    category: "Heritage",
    barangay: "Poblacion",
    description:
      "Boac is a heritage town, and its streets still hold Spanish-era ancestral houses with capiz windows and hardwood interiors. Several have been restored and opened to visitors, including Casa de Don Emilio near the plaza.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🏘️",
    accent: "from-amber-600 to-stone-800",
    featured: 0,
  },
  {
    slug: "casa-de-don-emilio",
    name: "Casa de Don Emilio",
    category: "Heritage",
    barangay: "Poblacion",
    description:
      "A restored ancestral home in the heritage core of Boac, now serving Marinduque dishes and local delicacies in a Spanish-era setting. Listed by the Department of Tourism among the town's heritage stops.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🏠",
    accent: "from-rose-500 to-rose-900",
    featured: 0,
  },
  {
    slug: "biglang-awa-bridge",
    name: "Biglang Awa Bridge",
    category: "Landmark",
    barangay: "Tampus (Poblacion) / Bantad",
    description:
      "At 186 metres, the longest bridge in Marinduque, connecting Barangay Tampus and Barangay Bantad over the Boac River. People stop on the bridge at sunset for a view of the cathedral on the hill.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🌉",
    accent: "from-orange-500 to-pink-800",
    featured: 1,
  },
  {
    slug: "laylay-port",
    name: "Laylay Port",
    category: "Heritage",
    barangay: "Laylay",
    description:
      "A historical port in Boac where Japanese and American troops landed during the Second World War. It once served as a commercial port bringing goods to the island, and remains a quiet spot on the coast.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "⚓",
    accent: "from-sky-600 to-blue-900",
    featured: 0,
  },
  {
    slug: "marinduque-provincial-capitol",
    name: "Marinduque Provincial Capitol",
    category: "Landmark",
    barangay: "Santol",
    description:
      "The neo-classical provincial capitol of Marinduque stands in Barangay Santol, near the Dr. Damian Reyes Memorial Hospital and Camp Maximo Abad. The capitol grounds are a common stop on a Boac heritage walk.",
    lat: 13.44503,
    lng: 121.8301,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🏛️",
    accent: "from-yellow-600 to-amber-900",
    featured: 0,
  },
  {
    slug: "kilometer-zero-marinduque",
    name: "Kilometer Zero, Marinduque",
    category: "Landmark",
    barangay: "Boac",
    description:
      "The island's kilometre-zero marker on the Boac–Gasan–Torrijos Road, the reference point for road distances across Marinduque. It is a short stop and a popular photo marker in the capital.",
    lat: 13.4453,
    lng: 121.82985,
    hours: "Open 24 hours",
    fee: "Free",
    duration: null,
    emoji: "📍",
    accent: "from-slate-500 to-slate-800",
    featured: 0,
  },
  {
    slug: "boac-public-market",
    name: "Boac Public Market",
    category: "Culture",
    barangay: "Mercado (Poblacion)",
    description:
      "One of the province's key landmarks, with dry and wet goods across four air-conditioned buildings and a food court. Often described as the province's “mini-supermarket”, with transport terminals nearby.",
    lat: 13.4481,
    lng: 121.83952,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🧺",
    accent: "from-emerald-600 to-green-900",
    featured: 0,
  },
  {
    slug: "marinduque-wildlife-sanctuary",
    name: "Marinduque Wildlife Sanctuary",
    category: "Nature",
    barangay: "Central Marinduque (Boac access)",
    description:
      "A protected forest spanning roughly 9,000 hectares of central Marinduque, including parts of Boac, Gasan, Buenavista, Torrijos and Santa Cruz. Visits require a local guide.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🌿",
    accent: "from-green-600 to-emerald-950",
    featured: 0,
  },
  {
    slug: "bulating-site-malbog",
    name: "Bulating, Malbog",
    category: "Culture",
    barangay: "Malbog",
    description:
      "A Holy Week penitential tradition in Barangay Malbog, where devotees cover themselves in river mud and walk the barangay. It takes place only during Lent.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🪷",
    accent: "from-stone-600 to-amber-900",
    featured: 0,
  },
  {
    slug: "cawit-beach",
    name: "Cawit Beach",
    category: "Beach",
    barangay: "Cawit",
    description:
      "Boac's coastal barangay south of the poblacion, with a shoreline facing Tayabas Bay. It is reached by tricycle from the town centre and is a straightforward stop on a half-day Boac circuit.",
    lat: null,
    lng: null,
    hours: null,
    fee: null,
    duration: null,
    emoji: "🏖️",
    accent: "from-cyan-500 to-blue-800",
    featured: 0,
  },
];

const BOAC_REFERENCE_NEWS = [
  {
    slug: "boac-cathedral-1792",
    title: "Boac Cathedral: a fortress church since 1792",
    summary:
      "The Immaculate Conception Cathedral sits on a hill above the Poblacion, ringed by defensive walls built in the Spanish period.",
    body:
      "The Immaculate Conception Cathedral is the seat of the Diocese of Boac. The hilltop church was dedicated in 1792 and is surrounded by centuries-old defensive walls, a reminder of the town's role as a coastal stronghold.\n\nThe Immaculate Conception is Boac's patron saint, and the cathedral is the focal point of the town's Holy Week devotion. Visitors reach it through the heritage streets of the Poblacion.",
    category: "Heritage",
    barangay: "Mataas na Bayan (Poblacion)",
    source_name: "Provincial Government of Marinduque",
    source_url: "https://marinduque.gov.ph/",
    emoji: "⛪",
    accent: "from-amber-500 to-orange-800",
  },
  {
    slug: "moriones-festival",
    title: "Moriones Festival: Boac's Holy Week tradition",
    summary:
      "Every Holy Week, masked penitents in Roman-soldier costumes walk the streets of Boac as part of the Moriones Festival.",
    body:
      "The Moriones Festival is Marinduque's best-known observance and takes place every Holy Week. Participants wear elaborate Roman-soldier masks and costumes and walk the streets of Boac in penitence, retelling the story of Longinus, the centurion who pierced Christ's side.\n\nThe festival draws visitors to the Poblacion, where the cathedral, heritage houses and plaza host most of the town's Holy Week activity.",
    category: "Culture",
    barangay: "San Miguel (Poblacion)",
    source_name: "Department of Tourism",
    source_url: "https://tourism.gov.ph/",
    emoji: "🎭",
    accent: "from-rose-600 to-brand-900",
  },
  {
    slug: "boac-capital-town",
    title: "Why Boac is Marinduque's capital town",
    summary:
      "Boac is the capital municipality of Marinduque and the seat of the provincial government, on the island's western coast.",
    body:
      "Boac is the capital municipality of the island province of Marinduque and hosts the provincial government and its offices. The town is also the seat of the Diocese of Boac.\n\nIt carries the nickname Montserrat de Marinduque, and local tradition calls it Ang Bayang Biak after the word biak, referring to the town's early settlement along the river.",
    category: "Community",
    barangay: "San Miguel (Poblacion)",
    source_name: "Wikipedia — Boac, Marinduque",
    source_url: "https://en.wikipedia.org/wiki/Boac,_Marinduque",
    emoji: "🏛️",
    accent: "from-indigo-500 to-indigo-900",
  },
  {
    slug: "biglang-awa-bridge",
    title: "Biglang Awa Bridge, the province's longest",
    summary:
      "Biglang Awa Bridge spans 186 metres across the Boac River, linking the Poblacion with the town's western barangays.",
    body:
      "Biglang Awa Bridge crosses the Boac River and is described as the longest bridge in Marinduque, with a span of about 186 metres. It connects the Poblacion with barangays on the town's western side.\n\nThe bridge is a familiar landmark for travellers heading along the province's coastal road.",
    category: "Travel",
    barangay: "Tampus (Poblacion) / Bantad",
    source_name: "Wikipedia — Boac, Marinduque",
    source_url: "https://en.wikipedia.org/wiki/Boac,_Marinduque",
    emoji: "🌉",
    accent: "from-cyan-500 to-blue-900",
  },
  {
    slug: "national-museum-marinduque",
    title: "The National Museum of Marinduque in Boac",
    summary:
      "The National Museum of Marinduque occupies a heritage building in the Poblacion, with free entry during posted hours.",
    body:
      "The National Museum of Marinduque is located in Boac's Poblacion. Its galleries cover the island's archaeology, ethnography and history, including material on the Moriones tradition.\n\nEntry is free, and the museum is open from 10:00 AM to 5:00 PM according to its published schedule. Hours can change on holidays, so confirm before travelling.",
    category: "Culture",
    barangay: "Malusak (Poblacion)",
    source_name: "National Museum of the Philippines",
    source_url: "https://www.nationalmuseum.gov.ph/",
    emoji: "🖼️",
    accent: "from-fuchsia-600 to-purple-900",
  },
  {
    slug: "boac-barangays",
    title: "61 barangays, one Boac",
    summary:
      "Boac is made up of 61 barangays, from the Poblacion's urban villages to coastal and upland communities.",
    body:
      "Boac is divided into 61 barangays. The Poblacion is made up of seven urban barangays, while the rest of the town stretches along the coast and into the uplands.\n\nThe 2024 census recorded a population of 54,365 for the municipality. Community services in the app are grouped by these same barangays.",
    category: "Community",
    barangay: "Isok 1 (Poblacion)",
    source_name: "Philippine Statistics Authority",
    source_url: "https://psa.gov.ph/",
    emoji: "🗺️",
    accent: "from-emerald-500 to-teal-900",
  },
  {
    slug: "boac-public-market",
    title: "Boac Public Market: the town's daily trading floor",
    summary:
      "The public market in Mercado serves the Poblacion with produce, fish and household goods brought in from nearby barangays.",
    body:
      "The Boac Public Market sits in the barangay of Mercado, at the centre of the Poblacion. It is the town's daily trading floor, where vendors sell produce, fish and household goods brought in from nearby barangays.\n\nThe market is also the traditional starting point for a walk through the Poblacion's heritage streets.",
    category: "Community",
    barangay: "Mercado (Poblacion)",
    source_name: "Municipality of Boac",
    source_url: "https://marinduque.gov.ph/",
    emoji: "🧺",
    accent: "from-lime-600 to-emerald-900",
  },
  {
    slug: "poblacion-heritage-houses",
    title: "The heritage houses of the Poblacion",
    summary:
      "A cluster of Spanish-era and American-era houses lines the streets around the cathedral and plaza.",
    body:
      "The streets around the Boac Cathedral and the town plaza retain a cluster of heritage houses built in the Spanish and American periods. Several are still in family use, while others have been adapted for shops and offices.\n\nThey form the backdrop to the town's Holy Week activities and are best seen on foot from the public market.",
    category: "Heritage",
    barangay: "Mataas na Bayan (Poblacion)",
    source_name: "Provincial Government of Marinduque",
    source_url: "https://marinduque.gov.ph/",
    emoji: "🏠",
    accent: "from-amber-600 to-rose-900",
  },
];

function seedStatements(): Statement[] {
  const now = new Date().toISOString();
  const statements: Statement[] = [];
  for (const place of BOAC_PLACES) {
    statements.push(insertStatement("destinations", {
      slug: place.slug,
      name: place.name,
      category: place.category,
      barangay: place.barangay,
      description: place.description,
      lat: place.lat,
      lng: place.lng,
      hours: place.hours,
      fee: place.fee,
      duration: place.duration,
      rating: 0,
      emoji: place.emoji,
      accent: place.accent,
      featured: place.featured,
      status: "published",
      created_at: now,
    }));
  }
  for (const post of BOAC_REFERENCE_NEWS) {
    statements.push(insertStatement("news", {
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      body: post.body,
      category: post.category,
      barangay: post.barangay,
      kind: "reference",
      source_name: post.source_name,
      source_url: post.source_url,
      emoji: post.emoji,
      accent: post.accent,
      featured: 0,
      status: "published",
      author_id: null,
      published_at: null,
      created_at: now,
    }));
  }
  statements.push({
    sql: "INSERT INTO app_meta (k, v) VALUES ('content_version', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
    params: [CONTENT_VERSION],
  });
  return statements;
}

async function initDatabase() {
  if (process.env.VERCEL && !isRemoteDatabase) {
    throw new Error(
      "No database configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Vercel project's environment variables.",
    );
  }

  const driver = await getDriver();
  const existing = await driver.all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'",
    [],
  );
  const stored = existing.length
    ? (await driver.all("SELECT v FROM app_meta WHERE k = 'content_version'", []))[0]?.v
    : undefined;
  const rebuild = String(stored ?? "") !== CONTENT_VERSION;

  const statements: Statement[] = [];
  if (rebuild) {
    // Previous prototype content was fictional demo data; rebuild from the verified seed.
    const tables = await driver.all(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      [],
    );
    for (const table of tables) statements.push({ sql: `DROP TABLE IF EXISTS "${String(table.name)}"` });
  }
  statements.push(...SCHEMA_STATEMENTS);

  if (rebuild) {
    statements.push(...seedStatements());
  } else {
    // An older database may predate a column; add it without wiping user data.
    if (!(await columnNames(driver, "news")).includes("image_id")) {
      statements.push({ sql: "ALTER TABLE news ADD COLUMN image_id INTEGER REFERENCES media(id)" });
    }
    if (!(await columnNames(driver, "products")).includes("image_id")) {
      statements.push({ sql: "ALTER TABLE products ADD COLUMN image_id INTEGER REFERENCES media(id)" });
    }
  }

  // One writer at a time: the version check, rebuild and seed must not race.
  await driver.batch(statements);
}
