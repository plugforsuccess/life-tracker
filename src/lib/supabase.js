import { createClient } from '@supabase/supabase-js'

// Confirmed life-tracker project (lscgejzogtikkftwlnjn). The previous fallback
// pointed at the wrong project (ghnpzllykteelveezhnv / quotesync) — fixed.
const FALLBACK_URL = 'https://lscgejzogtikkftwlnjn.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzY2dlanpvZ3Rpa2tmdHdsbmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzc0NDcsImV4cCI6MjA5MTA1MzQ0N30.5DTFb-E9-gWy_opVqPLB7ctnw2HuIki7qPyxKQPzC8w'

function isValidUrl(str) {
  try { return /^https?:\/\//.test(str) && Boolean(new URL(str)); }
  catch { return false; }
}

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = isValidUrl(envUrl) ? envUrl : FALLBACK_URL
const supabaseAnonKey = (envKey && envKey.length > 20) ? envKey : FALLBACK_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── EVENTS DATA LAYER ───────────────────────────────────────────────────────
// Mirrors the task CRUD helpers in App.jsx, against the `events` table.

export const fetchEvents = async () => {
  return await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });
};

export const addEvent = async (event) => {
  return await supabase
    .from("events")
    .insert([event])
    .select()
    .single();
};

export const updateEvent = async (id, patch) => {
  return await supabase
    .from("events")
    .update(patch)
    .eq("id", id);
};

export const deleteEvent = async (id) => {
  return await supabase
    .from("events")
    .delete()
    .eq("id", id);
};
