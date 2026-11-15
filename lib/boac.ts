export const MUNICIPALITY = {
  name: "Boac",
  province: "Marinduque",
  tagline: "Ang Bayang Biak · Montserrat de Marinduque",
  population: 54365,
  barangayCount: 61,
  center: { lat: 13.4465, lng: 121.8403 },
};

export const BARANGAYS = [
  "Agot", "Agumaymayan", "Amoingon", "Apitong", "Balagasan", "Balaring", "Balimbing",
  "Balogo", "Bamban", "Bangbangalon", "Bantad", "Bantay", "Bayuti", "Binunga", "Boi",
  "Boton", "Buliasnin", "Bunganay", "Caganhao", "Canat", "Catubugan", "Cawit", "Daig",
  "Daypay", "Duyay", "Hinapulan", "Ihatub", "Isok 1 (Poblacion)", "Isok 2 (Poblacion)",
  "Laylay", "Lupac", "Mahinhin", "Mainit", "Malbog", "Maligaya", "Malusak (Poblacion)",
  "Mansiwat", "Mataas na Bayan (Poblacion)", "Maybo", "Mercado (Poblacion)",
  "Murallon (Poblacion)", "Ogbac", "Pawa", "Pili", "Poctoy", "Poras", "Putting Buhangin",
  "Puyog", "Sabong", "San Miguel (Poblacion)", "Santol", "Sawi", "Tabi", "Tabigue",
  "Tagwak", "Tambunan", "Tampus (Poblacion)", "Tanza", "Tugos", "Tumagabok", "Tumapon",
];

export const EMERGENCY_CONTACTS = [
  { name: "National Emergency Hotline", number: "911", detail: "Police, fire, medical — nationwide", emoji: "🚨" },
  { name: "Provincial DRRMO – Marinduque", number: "0968-226-5727", detail: "Disaster response, rescue and relief", emoji: "🛟" },
  { name: "Philippine Red Cross – Marinduque", number: "0917-826-1395", detail: "Ambulance, first aid, blood services", emoji: "🚑" },
  { name: "Boac Municipal Hall / LGU", number: "(042) 311-1378", detail: "Municipal offices and citizen assistance", emoji: "🏛️" },
  { name: "Boac Police Station (PNP)", number: "(042) 332-0166", detail: "Crime reporting and police assistance", emoji: "👮" },
  { name: "Boac Fire Station (BFP)", number: "(042) 332-0255", detail: "Fire and rescue response", emoji: "🚒" },
];

export const DESTINATION_CATEGORIES = ["Heritage", "Culture", "Beach", "Nature", "Landmark"] as const;
export const SHOP_CATEGORIES = ["Delicacies", "Seafood", "Crafts", "Coffee", "Grocery", "Souvenirs"] as const;
export const NEWS_CATEGORIES = ["Heritage", "Culture", "Community", "Travel", "Advisory", "LGU"] as const;
export const ANNOUNCEMENT_CATEGORIES = ["Announcement", "Tourism", "Advisory", "Community", "LGU"] as const;
export const VENUE_STATUSES = ["open", "closed", "maintenance"] as const;

/** Keep a submitted value only when it is one of the app's known options. */
export function pickOption<T extends readonly string[]>(options: T, value: unknown, fallback: T[number]): T[number] {
  const candidate = String(value ?? "").trim();
  return (options as readonly string[]).includes(candidate) ? (candidate as T[number]) : fallback;
}

export const CATEGORY_STYLES: Record<string, string> = {
  Heritage: "bg-amber-100 text-amber-800",
  Culture: "bg-rose-100 text-rose-800",
  Beach: "bg-sky-100 text-sky-800",
  Nature: "bg-moss-100 text-moss-800",
  Landmark: "bg-indigo-100 text-indigo-800",
  Delicacies: "bg-orange-100 text-orange-800",
  Seafood: "bg-cyan-100 text-cyan-800",
  Crafts: "bg-lime-100 text-lime-800",
  Coffee: "bg-stone-200 text-stone-800",
  Grocery: "bg-emerald-100 text-emerald-800",
  Souvenirs: "bg-fuchsia-100 text-fuchsia-800",
  Travel: "bg-teal-100 text-teal-800",
  Advisory: "bg-amber-100 text-amber-900",
  LGU: "bg-indigo-100 text-indigo-800",
};

export const ORDER_FLOW = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
] as const;

export const ORDER_LABELS: Record<string, string> = {
  placed: "Order placed",
  confirmed: "Confirmed by seller",
  preparing: "Preparing your order",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ROLE_LABELS: Record<string, string> = {
  resident: "Resident",
  seller: "Seller",
  mdrrmo: "MDRRMO Personnel",
  tourism: "Tourism Officer",
  admin: "LGU Administrator",
};

export const PAYMENT_LABELS: Record<string, string> = {
  gcash: "GCash",
  maya: "Maya",
  cod: "Cash on delivery",
};

export const INCIDENT_TYPES = [
  "Flood",
  "Fire",
  "Medical emergency",
  "Road accident",
  "Landslide",
  "Fallen tree",
  "Power outage",
  "Missing person",
  "Other",
];
