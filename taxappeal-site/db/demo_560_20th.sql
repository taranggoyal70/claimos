-- 560 20th St, San Francisco 94107: Y Combinator's office, Pier 70 Building 104 (1896 Union Iron Works office).
-- Facts (public): the land and building belong to the Port of San Francisco; Historic Pier 70, LLC (Orton
-- Development) holds a 66-year master lease (Port lease L-15814) and sublets to Y Combinator (since mid-2023).
-- The City's own parcels (Block 4052, lots 2-12) sit on the secured roll at $0 as "Possessory Interest / Government";
-- the taxable thing is the leasehold, assessed on the UNSECURED roll, which the city does not publish.
-- Most accurate estimate (2026-11-08, research agents yc-assessed + yc-market):
--   taxable value ~ $17M (range $12M-$22M): Port Feb 2026 budget memo: ~$5.6M Historic Core (IFD G-1) increment received through
--   FY2025-26, receipts stabilising at ~$1.0M/yr -> ~$111M core AV at 89.92% of the 1% levy (Aug 2023 memo: $709k -> $79M);
--   Building 104 = 45,237 of ~280k sq ft (~16%). Tax ~ $200k/yr at 1.18162182%.
--   market value ~ $21M (range $15M-$28M): Rule 21 income approach: $70/sf full service (Avison Young Q3 2026 Potrero/Dogpatch
--   $67.69), 10% vacancy, $15.80/sf opex incl. Port maintenance share, ~$0.35M Port participation, 8.5% loaded cap (Kidder 7.34%).
--   Cross-check: 2019 CMBS appraisal of the whole historic leasehold ~$217M (322,814 sf) less the 2019-2026 cap-rate move ~ $20M.
--   Market >= taxable at the midpoints: no over-assessment; defensible = taxable, savings 0, tier cap_absorbs.
-- Re-runnable. Apply (the CLI reads a leading "--" as a flag, so strip the comments):
--   naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(grep -v '^--' db/demo_560_20th.sql)"
insert into candidates (case_id, county, tax_year, parcel_id, address, unit, city, zip, use, homestead,
  just_value, assessed_value, defensible_value, annual_savings, tier, filing_closes, filing_status, run_id, addr_key)
values ('CA-075-2026-PIER70-B104', 'San Francisco', 2026, 'Pier 70 Building 104 · Port Block 4052 (possessory interest)',
  '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'possessory_interest', false,
  17000000, 17000000, 17000000, 0, 'cap_absorbs', '2026-09-15', 'closed', 'CA-20261108T000000Z', '560 20TH ST|94107')
on conflict (case_id) do update set just_value = excluded.just_value, assessed_value = excluded.assessed_value,
  defensible_value = excluded.defensible_value, annual_savings = excluded.annual_savings, tier = excluded.tier,
  use = excluded.use, parcel_id = excluded.parcel_id, run_id = excluded.run_id, addr_key = excluded.addr_key;
select case_id, address, zip, use, just_value, defensible_value, annual_savings, tier from candidates where zip = '94107';

-- The same property on the demo dashboard (francesco.rosciano@me.com), at the evidence step. The board mirror leaves
-- this owner's rows alone (sync.py DEMO_OWNER). Remove with: delete from cases where case_id = 'CA-075-2026-PIER70-B104';
insert into cases (case_id, address, unit, city, zip, county, owner_email, stage, status, county_value, requested_value, decided_value,
  annual_savings, filing_deadline, petition_number, hearing_date, needs_from_owner, stop_reason, history, documents, messages, updated_at)
values ('CA-075-2026-PIER70-B104', '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'San Francisco', 'francesco.rosciano@me.com',
 'stopped', 'stopped', 17000000, null, null, 0, null, null, null, null,
 'No case: 2026 sales nearby put the market value above the taxable value.',
 $j$[
  {"date":"2026-11-08","line":"You checked 560 20th St on our site: Pier 70 Building 104, on Port of San Francisco land under a 66-year lease. The taxable interest is the leasehold, on the unsecured roll."},
  {"date":"2026-11-08","line":"Port of San Francisco tax-increment filings put the taxable value near $17M, about $200,000 a year in tax. 2026 Dogpatch rents and San Francisco office cap rates put the market value near $21M."},
  {"date":"2026-11-08","line":"Closed: no case to appeal. No fee, nothing filed. We check again when the next roll posts."}
 ]$j$::jsonb,
 '[]'::jsonb,
 $j$[
  {"at":"2026-11-08","from":"claimos","text":"We checked 560 20th St. Claim OS is a private company and is not affiliated with any government agency. The building sits on Port of San Francisco land under a long lease, so what is taxed is the leasehold. Port filings put its taxable value near $17 million, and 2026 rents and cap rates put its market value near $21 million, so we see no case to appeal this year. No fee, nothing filed. We will look again when the next roll posts."}
 ]$j$::jsonb,
 '2026-11-08 10:00-08')
on conflict (case_id) do update set stage = excluded.stage, status = excluded.status, county_value = excluded.county_value,
  requested_value = excluded.requested_value, annual_savings = excluded.annual_savings, filing_deadline = excluded.filing_deadline,
  needs_from_owner = excluded.needs_from_owner, stop_reason = excluded.stop_reason, history = excluded.history,
  documents = excluded.documents, messages = excluded.messages, updated_at = excluded.updated_at, owner_email = excluded.owner_email;
select case_id, stage, county_value, annual_savings from cases where case_id = 'CA-075-2026-PIER70-B104';
