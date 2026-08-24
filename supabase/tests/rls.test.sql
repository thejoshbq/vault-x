begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.com', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);

select ok(
  (select count(*) = 1 from public.households),
  'owner can read their generated household'
);

select ok(
  (select count(*) >= 1 from public.categories),
  'owner can read seeded household categories'
);

insert into public.accounts (id, household_id, name, type, balance_minor)
select '00000000-0000-4000-8000-000000000201', id, 'Owner account', 'checking', 0
from public.households;

insert into public.categories (id, household_id, name, kind)
select '00000000-0000-4000-8000-000000000202', id, 'Temporary', 'expense'
from public.households;

insert into public.transactions (
  id, household_id, account_id, category_id, kind, merchant, amount_minor, occurred_on
)
select
  '00000000-0000-4000-8000-000000000203',
  id,
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  'expense',
  'Delete behavior',
  100,
  current_date
from public.households;

delete from public.categories where id = '00000000-0000-4000-8000-000000000202';

select is(
  (select category_id is null from public.transactions where id = '00000000-0000-4000-8000-000000000203'),
  true,
  'deleting a category nulls the tenant-safe transaction reference'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);

select is(
  (select count(*)::integer from public.households),
  1,
  'outsider sees only their own generated household'
);

select throws_like(
  $$
    insert into public.transactions (
      household_id, account_id, kind, merchant, amount_minor, occurred_on
    )
    select id, '00000000-0000-4000-8000-000000000201', 'expense', 'Invalid', 100, current_date
    from public.households
  $$,
  '%transactions_household_account_fkey%',
  'cross-household account references are rejected'
);

select * from finish();
rollback;
