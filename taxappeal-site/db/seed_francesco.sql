-- Demo owner for the Sunday portal walk-through: francesco.rosciano@me.com with five properties at five stages.
-- Idempotent: every row has a fixed key and upserts. Run as one call:
--   naive db query --app app_nkhc92xe21cyzfd5qakpkcj4g4 "$(cat db/seed_francesco.sql)"
-- Numbers follow Find's roll data where the address is in `candidates` (b, c, d, e); savings = difference x 1.5%
-- (the millage Find uses). The Lee case (a) is hand-checked: Lee County has not been scanned.
-- Calendar: 2026 petition windows closed 9 Sep (Hendry, Bay) / 11 Sep (Lee); (b) and (c) are 2027 filings.
-- Dates are Aug 2026 to Jan 2027; the demo runs on 8 Nov 2026.

insert into cases (case_id, address, unit, city, zip, county, owner_email, stage, status, county_value, requested_value, decided_value,
  annual_savings, filing_deadline, petition_number, hearing_date, needs_from_owner, stop_reason, history, documents, messages, updated_at)
values
-- (a) Lee, waiting on the county: petition filed, hearing set
('FL-46-2026-03-44-23-C4-04119.0280', '4220 NW 13TH ST', null, 'CAPE CORAL', '33993', 'Lee', 'francesco.rosciano@me.com',
 'waiting', 'doing', 412300, 356000, null, 845, '2026-09-11', '2026-00847', '2027-01-14', null, null,
 $j$[
  {"date":"2026-08-20","line":"You checked this address on our site. Lee County is not in our scan, so we checked the parcel by hand."},
  {"date":"2026-08-21","line":"Hand check: the county's just value of $412,300 sits above eight comparable sales from the past year. Strong case."},
  {"date":"2026-08-24","line":"You signed the agreement and the DR-486POA."},
  {"date":"2026-09-02","line":"Evidence packet assembled: 8 comparable sales, 8 neighbouring assessments."},
  {"date":"2026-09-08","line":"Petition 2026-00847 filed with the Lee County Value Adjustment Board; $15 filing fee paid by Claim OS."},
  {"date":"2026-10-14","line":"The VAB clerk acknowledged the petition."},
  {"date":"2026-11-03","line":"Hearing scheduled for January 14, 2027 before a special magistrate. We attend; you do not have to."}
 ]$j$::jsonb,
 $j$[
  {"name":"Agreement (signed)","kind":"agreement","at":"2026-08-24"},
  {"name":"DR-486POA (signed)","kind":"dr486poa","at":"2026-08-24"},
  {"name":"Evidence packet","kind":"evidence","at":"2026-09-02"},
  {"name":"Petition 2026-00847 as filed","kind":"petition","at":"2026-09-08"},
  {"name":"Hearing notice","kind":"notice","at":"2026-11-03"}
 ]$j$::jsonb,
 $j$[
  {"at":"2026-08-21","from":"claimos","text":"Hi Francesco. Lee County is not in our last scan, so we pulled the parcel by hand. The county has 4220 NW 13th St at $412,300; eight nearby sales from the past year point to about $356,000. That is a strong case. If you would like us to take it on, the agreement and the DR-486POA are attached. Nothing is filed before you sign."},
  {"at":"2026-08-24","from":"owner","text":"Signed both, attached. Go ahead."},
  {"at":"2026-09-08","from":"claimos","text":"Filed. Petition 2026-00847 is in with the Lee County VAB and the fee is paid. The clerk usually takes a few weeks to acknowledge it; the hearing will likely be set for the winter. We will email the date."},
  {"at":"2026-11-03","from":"claimos","text":"Your hearing is set: January 14, 2027, before a special magistrate. We present the evidence; you are welcome but not needed. Nothing to do until then."}
 ]$j$::jsonb,
 '2026-11-03 14:20-05'),

-- (b) Hendry, evidence: the real case with real evidence files; blocked on the owner's DR-486POA signature
('FL-36-2026-1 28 44 31 A00 0179.0000', '7969    1ST PL', null, 'WHEELER', '33935', 'Hendry', 'francesco.rosciano@me.com',
 'evidence', 'blocked', 669625, 508000, null, 2424, null, null, null,
 'Sign the DR-486POA (power of attorney) so we can file in your name.', null,
 $j$[
  {"date":"2026-10-27","line":"We wrote to you about 7969 1st Pl: the county's 2026 value looks high against nearby sales."},
  {"date":"2026-10-30","line":"You replied and asked us to look closer."},
  {"date":"2026-11-02","line":"Qualified: the county's $669,625 is 32% above the eight nearest comparable sales, and neighbours are assessed lower. Strong case."},
  {"date":"2026-11-04","line":"You signed the agreement."},
  {"date":"2026-11-07","line":"Evidence packet drafted from the 2026 roll and recorded sales (see Documents)."},
  {"date":"2026-11-07","line":"DR-486POA drafted for your signature. The 2026 petition window closed on September 9; we file the day the 2027 TRIM notice arrives (August 2027) and refresh the evidence against the 2027 roll."}
 ]$j$::jsonb,
 $j$[
  {"name":"Agreement (signed)","kind":"agreement","at":"2026-11-04"},
  {"name":"Evidence packet (readable)","kind":"evidence","file_id":"fil_wpwjbwvfpghqrqy8zd08v6wgd9","at":"2026-11-07"},
  {"name":"Evidence packet (data)","kind":"evidence","file_id":"fil_1hkfp3f5xck5625vfsbyjwk5j2","at":"2026-11-07"},
  {"name":"DR-486POA draft, needs your signature","kind":"dr486poa","file_id":"fil_3nvxdyyby9agw88w2hedp9ze8t","at":"2026-11-07"}
 ]$j$::jsonb,
 $j$[
  {"at":"2026-10-27","from":"claimos","text":"Hello. Claim OS is a private company that appeals over-assessed Florida homes; we are not the county. Hendry County has 7969 1st Pl at $669,625 for 2026, while the eight closest comparable sales point to roughly $508,000. If that is your home and you would like us to look closer, reply to this email. No cost to look."},
  {"at":"2026-10-30","from":"owner","text":"It is my place. What would it take?"},
  {"at":"2026-11-02","from":"claimos","text":"We ran the full check: strong case, about $2,424 a year at today's millage if the value came down to $508,000. That is an estimate; the county decides. Two signatures: the agreement (our share of the first year's savings, only if the value goes down; the share is in the agreement) and a DR-486POA so we can file as your agent. The 2026 window closed on September 9, so this is a 2027 filing; the evidence is ready early so we file on day one."},
  {"at":"2026-11-04","from":"owner","text":"Agreement signed and attached. Where do I sign the POA?"},
  {"at":"2026-11-07","from":"claimos","text":"The evidence packet and the DR-486POA draft are in your portal under Documents. Sign the POA, photograph or scan it, and reply here, or bring it to the call on November 12."}
 ]$j$::jsonb,
 '2026-11-07 22:57-05'),

-- (c) Bay condo, signed up: owner of record and TRIM notice still to confirm
('FL-13-2026-34801143000', '520 RICHARD JACKSON BLVD', '1203', 'PANAMA CITY BEACH', '32407', 'Bay', 'francesco.rosciano@me.com',
 'signup', 'doing', 258086, 221200, null, 553, null, null, null,
 'Confirm you are the owner of record (the roll shows a different name), and send us a copy of your 2026 TRIM notice.', null,
 $j$[
  {"date":"2026-11-04","line":"You checked Unit 1203 on our site: strong case from the Bay County roll."},
  {"date":"2026-11-04","line":"You signed up."},
  {"date":"2026-11-05","line":"Parcel 34801143000 confirmed by hand. The roll lists the owner under a different name, often a trust or a company; we need to confirm before we go on."},
  {"date":"2026-11-05","line":"The 2026 petition window closed on September 9; this is a 2027 filing."}
 ]$j$::jsonb,
 '[]'::jsonb,
 $j$[
  {"at":"2026-11-05","from":"claimos","text":"Thanks for signing up for Unit 1203 at 520 Richard Jackson Blvd. Two things before we go on. The roll shows the owner under a different name than yours; if that is your trust or company, tell us which and we draft the paperwork in that name. And please send a copy of your 2026 TRIM notice, the August letter from the Property Appraiser: it tells us the exemptions and the mailing date. The 2026 window closed on September 9, so this one is a 2027 filing."},
  {"at":"2026-11-06","from":"owner","text":"It is held in my LLC. I will dig out the TRIM notice this weekend."},
  {"at":"2026-11-06","from":"claimos","text":"Perfect. Send the LLC's exact name as it appears on the roll and we will draft the DR-486POA to match."}
 ]$j$::jsonb,
 '2026-11-06 09:12-05'),

-- (d) Hendry, won: value lowered after the hearing; our invoice follows the corrected bill
('FL-36-2026-4 29 43 10 HP1 0001-001.0', '2002    ANCHOR LN', null, 'PORT LABELLE', '33935', 'Hendry', 'francesco.rosciano@me.com',
 'won', 'done', 199026, 128800, 128800, 1053, '2026-09-09', '2026-0117', '2026-10-27', null, null,
 $j$[
  {"date":"2026-08-14","line":"Flagged in our Hendry scan: just value $199,026 against comparable sales near $128,800."},
  {"date":"2026-08-17","line":"You checked the address on our site and signed up."},
  {"date":"2026-08-19","line":"You signed the agreement and the DR-486POA."},
  {"date":"2026-08-28","line":"Evidence packet assembled: 8 comparable sales, 8 neighbouring assessments."},
  {"date":"2026-09-03","line":"Petition 2026-0117 filed with the Hendry County VAB; $15 filing fee paid by Claim OS."},
  {"date":"2026-10-27","line":"Hearing before the special magistrate. We presented our evidence; the property appraiser presented theirs."},
  {"date":"2026-11-03","line":"Decision: value lowered from $199,026 to $128,800. The county reissues your bill; our invoice for the share set in your agreement follows the corrected bill."}
 ]$j$::jsonb,
 $j$[
  {"name":"Agreement (signed)","kind":"agreement","at":"2026-08-19"},
  {"name":"DR-486POA (signed)","kind":"dr486poa","at":"2026-08-19"},
  {"name":"Evidence packet","kind":"evidence","at":"2026-08-28"},
  {"name":"Petition 2026-0117 as filed","kind":"petition","at":"2026-09-03"},
  {"name":"VAB decision","kind":"decision","at":"2026-11-03"}
 ]$j$::jsonb,
 $j$[
  {"at":"2026-08-17","from":"claimos","text":"Thanks for signing up for 2002 Anchor Ln. Hendry County has it at $199,026; the eight closest sales point to about $128,800. A strong case: around $1,053 a year at today's rates if the board agrees, which is theirs to decide. The agreement and the DR-486POA are attached. The petition deadline is September 9, so please sign by the end of August if you would like us to file."},
  {"at":"2026-08-19","from":"owner","text":"Signed, attached."},
  {"at":"2026-09-03","from":"claimos","text":"Filed: petition 2026-0117, fee paid. We will email the hearing date."},
  {"at":"2026-11-03","from":"claimos","text":"Good news: the special magistrate set the value at $128,800. The county will reissue your bill in the next few weeks. Our invoice, the share set in your agreement, follows the corrected bill, not before."}
 ]$j$::jsonb,
 '2026-11-03 16:45-05'),

-- (e) Hendry, stopped: the home's own 2025 sale supports the county's value
('FL-36-2026-4 29 43 10 080 2260-015.0', '9014 E  MAC CT', null, 'PORT LABELLE', '33935', 'Hendry', 'francesco.rosciano@me.com',
 'stopped', 'stopped', 458598, null, null, 0, '2026-09-09', null, null, null,
 'Your own 2025 purchase is in line with the county''s $458,598, and a magistrate weighs a home''s own recent sale above nearby sales. An appeal would not hold.',
 $j$[
  {"date":"2026-08-14","line":"Flagged in our Hendry scan: just value $458,598 against comparable sales near $376,600."},
  {"date":"2026-08-20","line":"You checked the address on our site and signed up."},
  {"date":"2026-08-22","line":"Closer look: the home itself sold in 2025 at a price in line with the county's value. A board weighs a home's own recent sale above neighbouring sales."},
  {"date":"2026-08-23","line":"Stopped. No fee, nothing filed. We check again when the 2027 roll posts."}
 ]$j$::jsonb,
 '[]'::jsonb,
 $j$[
  {"at":"2026-08-23","from":"claimos","text":"We looked closer at 9014 E Mac Ct and have to stop here. Your own 2025 purchase is in line with the county's $458,598, and a magistrate weighs a home's own recent sale above nearby sales. Filing would cost you time and win nothing. You owe nothing. We check again when the 2027 roll posts in the summer."},
  {"at":"2026-08-23","from":"owner","text":"Appreciate the honesty."}
 ]$j$::jsonb,
 '2026-08-23 11:30-05')
on conflict (case_id) do update set
  address = excluded.address, unit = excluded.unit, city = excluded.city, zip = excluded.zip, county = excluded.county,
  owner_email = excluded.owner_email, stage = excluded.stage, status = excluded.status, county_value = excluded.county_value,
  requested_value = excluded.requested_value, decided_value = excluded.decided_value, annual_savings = excluded.annual_savings,
  filing_deadline = excluded.filing_deadline, petition_number = excluded.petition_number, hearing_date = excluded.hearing_date,
  needs_from_owner = excluded.needs_from_owner, stop_reason = excluded.stop_reason, history = excluded.history,
  documents = excluded.documents, messages = excluded.messages, updated_at = excluded.updated_at;

-- The two sign-ups that came through the site (a: Lee, hand-checked; c: the condo). signups.case_id references
-- candidates, and Lee is not in candidates, so (a) carries none.
insert into signups (id, created_at, address, city, zip, email, phone, call_ok, consent, case_id, verdict, status, notes)
values
('a0000000-0000-4000-8000-000000000001', '2026-08-20 18:04-04', '4220 NW 13th St', 'Cape Coral', '33993', 'francesco.rosciano@me.com', null, false, true, null, 'not_found', 'replied', 'Lee not scanned; checked by hand 2026-08-21'),
('a0000000-0000-4000-8000-000000000003', '2026-11-04 20:41-05', '520 Richard Jackson Blvd', 'Panama City Beach', '32407', 'francesco.rosciano@me.com', null, false, true, 'FL-13-2026-34801143000', 'found', 'replied', 'Unit 1203')
on conflict (id) do update set created_at = excluded.created_at, address = excluded.address, city = excluded.city, zip = excluded.zip,
  email = excluded.email, case_id = excluded.case_id, verdict = excluded.verdict, status = excluded.status, notes = excluded.notes;

-- One upcoming meeting with a licensed tax professional, about (b).
insert into meetings (id, created_at, email, name, address, case_id, slot, status, notes)
values ('b0000000-0000-4000-8000-000000000001', '2026-11-07 23:02-05', 'francesco.rosciano@me.com', 'Francesco Rosciano',
  '7969 1st Pl, Wheeler', 'FL-36-2026-1 28 44 31 A00 0179.0000', '2026-11-12 15:00-05', 'confirmed',
  'Go over the DR-486POA and the evidence packet with a licensed tax professional.')
on conflict (id) do update set email = excluded.email, name = excluded.name, address = excluded.address, case_id = excluded.case_id,
  slot = excluded.slot, status = excluded.status, notes = excluded.notes;

select stage, count(*) from cases where owner_email = 'francesco.rosciano@me.com' group by 1 order by 1;
