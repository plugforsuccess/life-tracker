-- Events table (calendar). Dedicated table (not a flag on tasks).
-- Mirrors the tasks table's open RLS model so the app can reach it with the anon key.
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  event_date  date not null,
  start_time  time,            -- null = all-day
  end_time    time,
  all_day     boolean not null default true,
  category    text not null default 'Personal' check (category in ('Business', 'Personal')),
  location    text,
  notes       text,
  recurrence  text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on row change (reuse the shared trigger function from tasks)
drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security
alter table public.events enable row level security;

-- Policy: allow all operations — identical to the tasks table (open access with anon key)
drop policy if exists "Allow all access" on public.events;
create policy "Allow all access"
  on public.events
  for all
  using (true)
  with check (true);

-- Mirror realtime: add the table to the supabase_realtime publication (no-op if absent)
do $$
begin
  alter publication supabase_realtime add table public.events;
exception when others then null;
end $$;
