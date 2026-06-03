-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Tasks table
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text not null check (category in ('Business', 'Personal')),
  status       text not null check (status in (
                 'broke', 'fixed',
                 'open', 'closed',
                 'lost', 'found',
                 'dirty', 'cleaned',
                 'pending', 'complete',
                 'draft', 'sent',
                 'idea', 'launched',
                 'due', 'paid'
               )),
  priority     text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date     date,
  blocked_by   uuid[] not null default '{}',
  notes        text default '',
  activity_log jsonb not null default '[]',
  log_checklist_items boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on public.tasks
for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security
alter table public.tasks enable row level security;

-- Policy: allow all operations (open access - tighten later with Auth)
create policy "Allow all access"
  on public.tasks
  for all
  using (true)
  with check (true);

-- Events table (calendar) — dedicated table, mirrors the tasks open RLS model
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  event_date   date not null,
  start_time   time,            -- null = all-day
  end_time     time,
  all_day      boolean not null default true,
  category     text not null default 'Personal' check (category in ('Business', 'Personal')),
  location     text,
  notes        text,
  recurrence   text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger set_events_updated_at
before update on public.events
for each row execute procedure public.handle_updated_at();

alter table public.events enable row level security;

create policy "Allow all access"
  on public.events
  for all
  using (true)
  with check (true);
