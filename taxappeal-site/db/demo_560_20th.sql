-- 560 20th St, San Francisco 94107: Y Combinator's office, Pier 70 Building 104 (1896 Union Iron Works office).
-- Facts (public): the land and building belong to the Port of San Francisco; Historic Pier 70, LLC (Orton
-- Development) holds a 66-year master lease (Port lease L-15814) and sublets to Y Combinator (since mid-2023).
-- The City's own parcels (Block 4052, lots 2-12) sit on the secured roll at $0 as "Possessory Interest / Government";
-- the taxable thing is the leasehold, assessed on the UNSECURED roll, which the city does not publish.
-- Appeal position shown in the demo (2026-11-08, Francesco's call), labelled "our appeal case" on the page:
--   roll value $22M = top of the Port-implied range (Feb 2026 budget memo: IFD G-1 receipts ~$1.0M/yr -> ~$111M core AV; Building 104
--   ~16% of floor area; most likely ~$17M, range $12M-$22M).
--   our value ~$9.0M = Rule 21 income valuation at sourced low-end inputs: $58/sf achieved (Avison Young Q3 2026 Potrero/Dogpatch asking
--   $67.69), 25% vacancy (non-CBD availability 28.8%), $15.80/sf opex incl. Port maintenance share, ~$0.35M Port participation,
--   9.5% cap (Kidder SF office 7.34% + tax load + premium for an 1896 single-tenant building).
--   over-assessed $13.0M; saving $13.0M x 1.18162182% = $153,611/yr. Most likely reading (midpoints $17M vs $21M) is no case.
-- Re-runnable. Apply (the CLI reads a leading "--" as a flag, so strip the comments):
--   naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(grep -v '^--' db/demo_560_20th.sql)"
insert into candidates (case_id, county, tax_year, parcel_id, address, unit, city, zip, use, homestead,
  just_value, assessed_value, defensible_value, annual_savings, tier, filing_closes, filing_status, run_id, addr_key)
values ('CA-075-2026-PIER70-B104', 'San Francisco', 2026, 'Pier 70 Building 104 · Port Block 4052 (possessory interest)',
  '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'possessory_interest', false,
  22000000, 22000000, 9000000, 153611, 'possible', '2026-09-15', 'closed', 'CA-20261108T000000Z', '560 20TH ST|94107')
on conflict (case_id) do update set just_value = excluded.just_value, assessed_value = excluded.assessed_value,
  defensible_value = excluded.defensible_value, annual_savings = excluded.annual_savings, tier = excluded.tier,
  use = excluded.use, parcel_id = excluded.parcel_id, run_id = excluded.run_id, addr_key = excluded.addr_key;
select case_id, address, zip, use, just_value, defensible_value, annual_savings, tier from candidates where zip = '94107';

-- The same property on the demo dashboard (francesco.rosciano@me.com), at the evidence step. The board mirror leaves
-- this owner's rows alone (sync.py DEMO_OWNER). Remove with: delete from cases where case_id = 'CA-075-2026-PIER70-B104';
insert into cases (case_id, address, unit, city, zip, county, owner_email, stage, status, county_value, requested_value, decided_value,
  annual_savings, filing_deadline, petition_number, hearing_date, needs_from_owner, stop_reason, history, documents, messages, updated_at)
values ('CA-075-2026-PIER70-B104', '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'San Francisco', 'francesco.rosciano@me.com',
 'evidence', 'doing', 22000000, 9000000, null, 153611, '2027-09-15', null, null,
 'Send the latest unsecured property tax bill for the leasehold so we can confirm the roll value; the city does not publish it.', null,
 $j$[
  {"date":"2026-11-08","line":"You checked 560 20th St on our site: Pier 70 Building 104, on Port of San Francisco land under a 66-year lease. The taxable interest is the leasehold, on the unsecured roll."},
  {"date":"2026-11-08","line":"You signed up."},
  {"date":"2026-11-08","line":"Our appeal case: Port tax-increment filings put the roll value between $12M and $22M; at the top of that range, an income valuation from 2026 Dogpatch rents (25% vacancy, 9.5% cap rate) supports about $9.0M. About $153,611 a year at the 2026-27 rate if the board agreed. The Assessor decides."},
  {"date":"2026-11-08","line":"San Francisco's 2026 appeal window (July 2 to September 15) has closed. This is a 2027 filing with the Assessment Appeals Board; the tax bill confirms the roll value first."}
 ]$j$::jsonb,
 '[]'::jsonb,
 $j$[
  {"at":"2026-11-08","from":"claimos","text":"Thanks for signing up for 560 20th St. Claim OS is a private company and is not affiliated with any government agency. The building sits on Port of San Francisco land under a long lease, so what is taxed is the leasehold, on a roll the city does not publish. Port filings put that value between $12 million and $22 million. If it is at the top of that range, an income valuation from 2026 Dogpatch rents supports about $9.0 million, which would be about $153,611 a year at today's rate if the Assessment Appeals Board agreed. The board decides. Please send the latest unsecured tax bill for the leasehold so we can confirm the roll value."}
 ]$j$::jsonb,
 '2026-11-08 10:30-08')
on conflict (case_id) do update set stage = excluded.stage, status = excluded.status, county_value = excluded.county_value,
  requested_value = excluded.requested_value, annual_savings = excluded.annual_savings, filing_deadline = excluded.filing_deadline,
  needs_from_owner = excluded.needs_from_owner, stop_reason = excluded.stop_reason, history = excluded.history,
  documents = excluded.documents, messages = excluded.messages, updated_at = excluded.updated_at, owner_email = excluded.owner_email;
select case_id, stage, county_value, annual_savings from cases where case_id = 'CA-075-2026-PIER70-B104';
