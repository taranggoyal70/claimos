-- 560 20th St, San Francisco 94107: Y Combinator's office, Pier 70 Building 104 (1896 Union Iron Works office).
-- Facts (public): the land and building belong to the Port of San Francisco; Historic Pier 70, LLC (Orton
-- Development) holds a 66-year master lease (Port lease L-15814) and sublets to Y Combinator (since mid-2023).
-- The City's own parcels (Block 4052, lots 2-12) sit on the secured roll at $0 as "Possessory Interest / Government";
-- the taxable thing is the leasehold, assessed on the UNSECURED roll, which the city does not publish.
-- Estimates, BEST CASE (labelled as such on the page, use = possessory_interest):
--   taxable value  ~ $18.1M: assessors enrol a rehabilitated leasehold near its cost; the $120M Historic Core rehab over
--                   ~300,000 sq ft is ~$400/sq ft; Building 104 is 45,237 sq ft (Port) -> $18.1M. (The Port's tax-increment
--                   projection implies a lower ~$12.4M; the unsecured roll that holds the real figure is not published.)
--   defensible     ~ $9.0M: $200/sq ft, the 2025-26 San Francisco office sale average (The Real Deal, Aug 2025), for a
--                   leasehold with ~58 years left.
--   savings        (18.1M - 9.0M) x 1.18162182% (FY2026-27 rate) = ~$107,000/yr. Whole bill on $18.1M is ~$214k/yr.
-- Re-runnable. Apply (the CLI reads a leading "--" as a flag, so strip the comments):
--   naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(grep -v '^--' db/demo_560_20th.sql)"
insert into candidates (case_id, county, tax_year, parcel_id, address, unit, city, zip, use, homestead,
  just_value, assessed_value, defensible_value, annual_savings, tier, filing_closes, filing_status, run_id, addr_key)
values ('CA-075-2026-PIER70-B104', 'San Francisco', 2026, 'Pier 70 Building 104 · Port Block 4052 (possessory interest)',
  '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'possessory_interest', false,
  18100000, 18100000, 9000000, 107000, 'strong', '2026-09-15', 'closed', 'CA-20261108T000000Z', '560 20TH ST|94107')
on conflict (case_id) do update set just_value = excluded.just_value, assessed_value = excluded.assessed_value,
  defensible_value = excluded.defensible_value, annual_savings = excluded.annual_savings, tier = excluded.tier,
  use = excluded.use, parcel_id = excluded.parcel_id, run_id = excluded.run_id, addr_key = excluded.addr_key;
select case_id, address, zip, use, just_value, defensible_value, annual_savings, tier from candidates where zip = '94107';

-- The same property on the demo dashboard (francesco.rosciano@me.com), at the evidence step. The board mirror leaves
-- this owner's rows alone (sync.py DEMO_OWNER). Remove with: delete from cases where case_id = 'CA-075-2026-PIER70-B104';
insert into cases (case_id, address, unit, city, zip, county, owner_email, stage, status, county_value, requested_value, decided_value,
  annual_savings, filing_deadline, petition_number, hearing_date, needs_from_owner, stop_reason, history, documents, messages, updated_at)
values ('CA-075-2026-PIER70-B104', '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'San Francisco', 'francesco.rosciano@me.com',
 'evidence', 'doing', 18100000, 9000000, null, 107000, '2027-09-15', null, null,
 'Send the latest unsecured property tax bill for the leasehold so we can read the enrolled value; the city does not publish it.', null,
 $j$[
  {"date":"2026-11-08","line":"You checked 560 20th St on our site: Pier 70 Building 104, land owned by the Port of San Francisco under a 66-year lease. The taxable interest is the leasehold, assessed on the unsecured roll."},
  {"date":"2026-11-08","line":"You signed up."},
  {"date":"2026-11-08","line":"Best-case estimate: a leasehold enrolled near its $18.1M rehabilitation cost against a $9.0M market value at $200 per square foot. Strong case, about $107,000 a year at the 2026-27 rate; the Assessor decides."},
  {"date":"2026-11-08","line":"San Francisco's 2026 appeal window (July 2 to September 15) has closed. This is a 2027 filing with the Assessment Appeals Board; evidence is being assembled now so it is ready when the July 2027 value notice arrives."}
 ]$j$::jsonb,
 '[]'::jsonb,
 $j$[
  {"at":"2026-11-08","from":"claimos","text":"Thanks for signing up for 560 20th St. Claim OS is a private company and is not affiliated with any government agency. This building sits on Port of San Francisco land under a long lease, so what is taxed is the leasehold, on the unsecured roll. Our best-case estimate puts the enrolled value near $18.1 million against a market value near $9.0 million; if the Assessment Appeals Board agreed, that would be about $107,000 a year at today's rate. The Board decides. To firm this up, please send the latest unsecured tax bill for the leasehold."}
 ]$j$::jsonb,
 '2026-11-08 09:30-08')
on conflict (case_id) do update set stage = excluded.stage, status = excluded.status, county_value = excluded.county_value,
  requested_value = excluded.requested_value, annual_savings = excluded.annual_savings, filing_deadline = excluded.filing_deadline,
  needs_from_owner = excluded.needs_from_owner, history = excluded.history, documents = excluded.documents, messages = excluded.messages,
  updated_at = excluded.updated_at, owner_email = excluded.owner_email;
select case_id, stage, status, owner_email, annual_savings from cases where case_id = 'CA-075-2026-PIER70-B104';