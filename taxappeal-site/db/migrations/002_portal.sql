-- Customer portal (/portal): what an owner sees per case, plus booked meetings. Additive only; site-sync
-- keeps writing its nine columns on cases and never touches these. Applied with:
--   naive db migrate db/migrations/002_portal.sql --app app_nkhc92xe21cyzfd5qakpkcj4g4
-- (the ledger already holds a "002_workflow_snapshot" from another workflow; names are distinct.)
alter table cases
  add column if not exists unit text,
  add column if not exists city text,
  add column if not exists zip text,
  add column if not exists petition_number text,
  add column if not exists hearing_date date,
  add column if not exists decided_value numeric,      -- the county's final value once the case is won or lost
  add column if not exists stop_reason text,           -- set when stage = 'stopped'; shown to the owner as-is
  add column if not exists documents jsonb default '[]', -- [{name, kind, file_id?, url?, at}] file_id = org file (naive file …)
  add column if not exists messages jsonb default '[]';  -- [{at, from: 'claimos'|'owner', text}] oldest first

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(), created_at timestamptz default now(),
  email text not null, name text, address text, case_id text references cases(case_id),
  slot timestamptz not null,
  status text default 'requested',  -- requested | confirmed | done | cancelled
  notes text
);
create index if not exists meetings_email on meetings (lower(email));
