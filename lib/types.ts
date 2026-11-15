export type Destination = {
  id: number;
  slug: string;
  name: string;
  category: string;
  barangay: string;
  description: string;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  fee: string | null;
  duration: string | null;
  rating: number;
  emoji: string;
  accent: string;
  featured: number;
  status: string;
  created_at: string;
};

export type Shop = {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  category: string;
  barangay: string;
  emoji: string;
  accent: string;
  rating: number;
  orders_count: number;
  is_open: number;
  created_at: string;
};

export type Product = {
  id: number;
  shop_id: number;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock: number;
  emoji: string;
  image_id: number | null;
  is_active: number;
  created_at: string;
};

export type DeliveryRate = { id: number; shop_id: number; label: string; fee: number; eta: string };

export type Address = {
  id: number;
  user_id: number;
  label: string;
  line: string;
  barangay: string;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  is_default: number;
  created_at: string;
};

export type Order = {
  id: number;
  code: string;
  user_id: number;
  shop_id: number;
  mode: string;
  address_id: number | null;
  address_text: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  payment_ref: string | null;
  status: string;
  note: string | null;
  placed_at: string;
  updated_at: string;
};

export type OrderItem = { id: number; order_id: number; product_id: number | null; name: string; price: number; qty: number; emoji: string };
export type OrderEvent = { id: number; order_id: number; status: string; note: string | null; created_at: string };

export type Incident = {
  id: number;
  code: string;
  type: string;
  severity: string;
  description: string;
  barangay: string;
  reporter_name: string;
  reporter_phone: string | null;
  status: string;
  team: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};

export type Venue = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  hours: string;
  emoji: string;
  capacity: number;
  updated_at: string;
};

export type Schedule = {
  id: number;
  venue_id: number;
  title: string;
  days: string;
  start_time: string;
  end_time: string;
  note: string | null;
};

export type NotificationRow = {
  id: number;
  user_id: number | null;
  title: string;
  body: string;
  kind: string;
  href: string | null;
  is_read: number;
  created_at: string;
};

export type Officer = {
  id: number;
  user_id: number | null;
  full_name: string;
  barangay: string;
  badge_no: string;
  status: string;
  created_at: string;
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
  category: string;
  pinned: number;
  created_at: string;
};

export type NewsPost = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  barangay: string | null;
  kind: string;
  source_name: string | null;
  source_url: string | null;
  emoji: string;
  accent: string;
  featured: number;
  status: string;
  author_id: number | null;
  image_id: number | null;
  published_at: string | null;
  created_at: string;
};

export type BucketRow = {
  id: number;
  user_id: number;
  destination_id: number;
  status: string;
  visited_at: string | null;
  created_at: string;
};
