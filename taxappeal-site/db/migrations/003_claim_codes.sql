-- Letters to owners carry a claim code (taxappeal-site-sync/letters.py); /check resolves it to the case and the
-- sign-up records which code was used. Additive only. Applied with:
--   naive db migrate db/migrations/003_claim_codes.sql --app app_nkhc92xe21cyzfd5qakpkcj4g4
create table if not exists claim_codes (
  code text primary key,                                   -- 8 chars, A-Z and 2-9 without O/I, from sha256(case_id + TRACK_SECRET)
  case_id text not null references candidates(case_id),   -- the FK keeps every code resolvable on /check and insertable on signups
  created_at timestamptz default now(),
  mailed_at timestamptz,                                   -- a person sets it after posting the letter
  used_at timestamptz                                      -- set by /api/signup when the owner signs up with the code
);
create index if not exists claim_codes_case on claim_codes (case_id);
alter table signups add column if not exists claim_code text references claim_codes(code);
