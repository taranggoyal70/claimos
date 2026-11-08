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
