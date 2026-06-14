-- ============================================================
-- ShopeeClipAI — Supabase Database Schema
-- วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → New Query
-- วางโค้ดทั้งหมดนี้ → กด Run
-- ============================================================

-- ตาราง License Keys
create table if not exists license_keys (
  code text primary key,
  type text not null check (type in ('monthly','yearly','lifetime')),
  buyer_name text,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  login_count integer not null default 0,
  last_login timestamptz
);

-- ตาราง Post Queue (คิวโพส)
create table if not exists post_queue (
  id text primary key,
  license_key text not null references license_keys(code) on delete cascade,
  title text,
  platform text,
  datetime timestamptz,
  caption text,
  status text default 'pending',
  created_at timestamptz default now(),
  link text,
  price text,
  script text
);

create index if not exists idx_post_queue_license_key on post_queue(license_key);

-- ============================================================
-- Row Level Security (RLS)
-- เปิดไว้เพื่อความปลอดภัย แต่อนุญาตให้ anon key อ่าน/เขียนได้
-- (เหมาะสำหรับแอปที่ตรวจสอบสิทธิ์ด้วย License Key เอง)
-- ============================================================

alter table license_keys enable row level security;
alter table post_queue enable row level security;

-- อนุญาตให้ทุกคน (ที่มี anon key) อ่าน/เขียนได้
-- หากต้องการความปลอดภัยสูงขึ้น ควรย้าย logic การสร้าง/ลบ Key ไปทำผ่าน Edge Function แทน
create policy "allow all on license_keys" on license_keys
  for all using (true) with check (true);

create policy "allow all on post_queue" on post_queue
  for all using (true) with check (true);
