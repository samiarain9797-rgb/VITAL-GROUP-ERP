-- Supabase Schema Migration corresponding to Firebase Blueprint

-- Warning: If you want to start fresh, you can uncomment these DROP statements:
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP TABLE IF EXISTS public.shipments CASCADE;
-- DROP TABLE IF EXISTS public.vessels CASCADE;
-- DROP TABLE IF EXISTS public.fleet_vehicles CASCADE;
-- DROP TABLE IF EXISTS public.invoices CASCADE;
-- DROP TABLE IF EXISTS public.documents CASCADE;
-- DROP TABLE IF EXISTS public.companies CASCADE;
-- DROP TABLE IF EXISTS public.complaints CASCADE;
-- DROP TABLE IF EXISTS public.fuel_prices CASCADE;
-- DROP TABLE IF EXISTS public.transporter_rates CASCADE;
-- DROP TABLE IF EXISTS public.chats CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;

-- 1. Users Table (Maps to Firebase Users)
-- Note: Supabase already has auth.users, but we create a public.users profile table.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  username TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'admin',
  permissions JSONB,
  photo_url TEXT,
  is_temporary BOOLEAN DEFAULT false,
  assigned_location TEXT,
  warehouse_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Shipments Table
CREATE TABLE IF NOT EXISTS public.shipments (
  id TEXT PRIMARY KEY, -- trackingId
  status TEXT DEFAULT 'Pending',
  vessel_name TEXT,
  vessel_arrival_details TEXT,
  container_number TEXT,
  container_size_and_type TEXT,
  gross_weight TEXT,
  number_of_packages INTEGER,
  commodity_description TEXT,
  duty_pay_date TEXT,
  clearance_date TEXT,
  customs_clearance_status TEXT,
  port_gate_in_time TEXT,
  port_gate_out_time TEXT,
  gate_pass_pickup_details TEXT,
  lift_details TEXT,
  empty_return_details TEXT,
  clearing_agent_id TEXT,
  transporter_id TEXT,
  eirs_hardcopy_url TEXT,
  eirs_softcopy_url TEXT,
  logistics_team_notes TEXT,
  vehicle_details TEXT,
  driver_details TEXT,
  estimated_lifting_time TEXT,
  estimated_arrival_time TEXT,
  actual_lifting_time TEXT,
  actual_arrival_time TEXT,
  manual_tracking_info TEXT,
  live_tracking_url TEXT,
  receiving_doc_url TEXT,
  receiving_time TEXT,
  factory_gate_in_time TEXT,
  unloading_time TEXT,
  unloading_location TEXT,
  unloading_arrival_date TEXT,
  unloading_date TEXT,
  unloading_gate_out_date TEXT,
  factory_gate_out_time TEXT,
  receiver_id TEXT,
  return_station_name TEXT,
  return_warehouse_details TEXT,
  return_materials_details TEXT,
  has_return_load BOOLEAN DEFAULT false,
  transport_cost NUMERIC DEFAULT 0,
  clearing_cost NUMERIC DEFAULT 0,
  other_costs NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Vessels Table 
CREATE TABLE IF NOT EXISTS public.vessels (
  id TEXT PRIMARY KEY,
  name TEXT,
  expected_date TEXT,
  total_containers INTEGER,
  status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Fleet Vehicles Table
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
  id TEXT PRIMARY KEY,
  type TEXT,
  status TEXT,
  current_driver_id TEXT,
  last_maintenance TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  shipment_id TEXT,
  amount NUMERIC,
  payment_status TEXT,
  payments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  shipment_id TEXT,
  name TEXT,
  url TEXT,
  type TEXT,
  path TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  address TEXT,
  ntn TEXT,
  contact_number TEXT,
  logo_url TEXT,
  type TEXT,
  transporter_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 8. Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  subject TEXT,
  description TEXT,
  priority TEXT,
  status TEXT DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 9. Fuel Prices Table
CREATE TABLE IF NOT EXISTS public.fuel_prices (
  id TEXT PRIMARY KEY,
  price NUMERIC,
  effective_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
);

-- 10. Transporter Rates Table
CREATE TABLE IF NOT EXISTS public.transporter_rates (
  id TEXT PRIMARY KEY,
  transporter_id TEXT,
  route_point_a TEXT,
  route_point_b TEXT,
  vehicle_type TEXT,
  container_size TEXT,
  rate NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 11. Chats Table
CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY,
  shipment_id TEXT,
  participants JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 12. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT,
  sender_id TEXT,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Enable Realtime for these tables
-- Run these individually if they are not already in the publication:
-- alter publication supabase_realtime add table public.shipments;
-- alter publication supabase_realtime add table public.invoices;
-- alter publication supabase_realtime add table public.documents;
-- alter publication supabase_realtime add table public.users;
-- alter publication supabase_realtime add table public.vessels;
-- alter publication supabase_realtime add table public.fleet_vehicles;
-- alter publication supabase_realtime add table public.companies;
-- alter publication supabase_realtime add table public.complaints;
-- alter publication supabase_realtime add table public.fuel_prices;
-- alter publication supabase_realtime add table public.transporter_rates;
-- alter publication supabase_realtime add table public.chats;
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.notifications;

-- RLS (Row Level Security) - Basic open rules (you can tighten these later)
-- Note: If policies already exist, running these again will cause errors. You can drop them or skip them.
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for shipments" ON public.shipments FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for vessels" ON public.vessels FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for fleet_vehicles" ON public.fleet_vehicles FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for complaints" ON public.complaints FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for fuel_prices" ON public.fuel_prices FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.transporter_rates ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for transporter_rates" ON public.transporter_rates FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Supabase Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Update Access" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads');
CREATE POLICY "Delete Access" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');

-- Fallback updates for existing schemas
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS warehouse_location TEXT;

-- Reload the PostgREST schema cache to ensure new columns are immediately available
NOTIFY pgrst, 'reload schema';
