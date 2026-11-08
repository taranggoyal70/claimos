-- Site sign-ups reach the company board: taxappeal-site-sync/mirror_board.py gives every consented row a
-- `Sign up ·` card and records the card id here, which is also what makes the pass idempotent. Applied with:
--   naive db migrate db/migrations/004_signup_card.sql --app app_nkhc92xe21cyzfd5qakpkcj4g4
alter table signups add column if not exists card_id text;
