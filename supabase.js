import { createClient } from "@supabase/supabase-js";

// ตั้งค่า 2 ค่านี้จาก Supabase Project ของคุณ
// Settings → API → Project URL และ anon public key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const isSupabaseConfigured = !!supabase;
