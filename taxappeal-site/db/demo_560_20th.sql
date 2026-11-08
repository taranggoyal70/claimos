-- 560 20th St, San Francisco 94107: Y Combinator's office, Pier 70 Building 104 (1896 Union Iron Works office).
-- Facts (public): the land and building belong to the Port of San Francisco; Historic Pier 70, LLC (Orton
-- Development) holds a 66-year master lease (Port lease L-15814) and sublets to Y Combinator (since mid-2023).
-- The City's own parcels (Block 4052, lots 2-12) sit on the secured roll at $0 as "Possessory Interest / Government";
-- the taxable thing is the leasehold, assessed on the UNSECURED roll, which the city does not publish.
-- Estimates (labelled as such on the page, use = possessory_interest):
--   taxable value  ~ $12.4M: Port memo (Aug 2023) projects $709k/yr of IFD tax increment for the Historic Core in
--                   FY2024-25; the IFD keeps 89.918% of the 1% increment, so the increment base is ~$78.9M for the
--                   ~300,000 sq ft core (~$263/sq ft); Building 104 is 45,237 sq ft (Port) -> $11.9M, +2%/yr Prop 13
--                   to the 2026-27 roll -> $12.4M.
--   defensible     ~ $10.2M: $225/sq ft, between 2026 San Francisco office sales (~$200/sq ft average, $300-350 for
--                   larger buildings) with a discount for a leasehold with ~58 years left.
--   savings        (12.4M - 10.2M) x 1.18162182% (FY2026-27 rate) = ~$26,000/yr.
-- Re-runnable. Apply (the CLI reads a leading "--" as a flag, so strip the comments):
--   naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(grep -v '^--' db/demo_560_20th.sql)"
insert into candidates (case_id, county, tax_year, parcel_id, address, unit, city, zip, use, homestead,
  just_value, assessed_value, defensible_value, annual_savings, tier, filing_closes, filing_status, run_id, addr_key)
values ('CA-075-2026-PIER70-B104', 'San Francisco', 2026, 'Pier 70 Building 104 · Port Block 4052 (possessory interest)',
  '560 20TH ST', null, 'SAN FRANCISCO', '94107', 'possessory_interest', false,
  12400000, 12400000, 10200000, 26000, 'possible', '2026-09-15', 'closed', 'CA-20261108T000000Z', '560 20TH ST|94107')
on conflict (case_id) do update set just_value = excluded.just_value, assessed_value = excluded.assessed_value,
  defensible_value = excluded.defensible_value, annual_savings = excluded.annual_savings, tier = excluded.tier,
  use = excluded.use, parcel_id = excluded.parcel_id, run_id = excluded.run_id, addr_key = excluded.addr_key;
select case_id, address, zip, use, just_value, defensible_value, annual_savings, tier from candidates where zip = '94107';
