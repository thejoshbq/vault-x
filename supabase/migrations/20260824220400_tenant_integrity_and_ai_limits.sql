alter table public.accounts add constraint accounts_household_id_id_key unique (household_id, id);
alter table public.categories add constraint categories_household_id_id_key unique (household_id, id);
alter table public.receipts add constraint receipts_household_id_id_key unique (household_id, id);
alter table public.insight_runs add constraint insight_runs_household_id_id_key unique (household_id, id);

alter table public.transactions
  drop constraint transactions_account_id_fkey,
  drop constraint transactions_category_id_fkey,
  drop constraint transactions_receipt_id_fkey;
alter table public.recurring_bills
  drop constraint recurring_bills_account_id_fkey,
  drop constraint recurring_bills_category_id_fkey;
alter table public.receipts drop constraint receipts_category_id_fkey;
alter table public.receipt_items drop constraint receipt_items_receipt_id_fkey;
alter table public.budgets drop constraint budgets_category_id_fkey;
alter table public.insights drop constraint insights_insight_run_id_fkey;

alter table public.transactions
  add constraint transactions_household_account_fkey
    foreign key (household_id, account_id)
    references public.accounts (household_id, id)
    on delete restrict,
  add constraint transactions_household_category_fkey
    foreign key (household_id, category_id)
    references public.categories (household_id, id)
    on delete set null (category_id),
  add constraint transactions_household_receipt_fkey
    foreign key (household_id, receipt_id)
    references public.receipts (household_id, id)
    on delete set null (receipt_id);

alter table public.recurring_bills
  add constraint recurring_bills_household_account_fkey
    foreign key (household_id, account_id)
    references public.accounts (household_id, id)
    on delete set null (account_id),
  add constraint recurring_bills_household_category_fkey
    foreign key (household_id, category_id)
    references public.categories (household_id, id)
    on delete set null (category_id);

alter table public.receipts
  add constraint receipts_household_category_fkey
    foreign key (household_id, category_id)
    references public.categories (household_id, id)
    on delete set null (category_id);

alter table public.receipt_items
  add constraint receipt_items_household_receipt_fkey
    foreign key (household_id, receipt_id)
    references public.receipts (household_id, id)
    on delete cascade;

alter table public.budgets
  add constraint budgets_household_category_fkey
    foreign key (household_id, category_id)
    references public.categories (household_id, id)
    on delete cascade;

alter table public.insights
  add constraint insights_household_run_fkey
    foreign key (household_id, insight_run_id)
    references public.insight_runs (household_id, id)
    on delete set null (insight_run_id);

create table public.ai_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, bucket)
);

alter table public.ai_rate_limits enable row level security;

create or replace function public.consume_ai_quota(
  target_bucket text,
  max_requests integer,
  window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  resulting_count integer;
begin
  if caller_id is null then
    return false;
  end if;
  if max_requests < 1 or window_seconds < 1 or char_length(target_bucket) > 80 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  insert into public.ai_rate_limits (user_id, bucket, window_started_at, request_count)
  values (caller_id, target_bucket, now(), 1)
  on conflict (user_id, bucket) do update
  set window_started_at = case
        when public.ai_rate_limits.window_started_at <= now() - make_interval(secs => window_seconds)
          then now()
        else public.ai_rate_limits.window_started_at
      end,
      request_count = case
        when public.ai_rate_limits.window_started_at <= now() - make_interval(secs => window_seconds)
          then 1
        else public.ai_rate_limits.request_count + 1
      end
  returning request_count into resulting_count;

  return resulting_count <= max_requests;
end;
$$;

revoke all on table public.ai_rate_limits from public, anon, authenticated;
revoke all on function public.consume_ai_quota(text, integer, integer) from public;
grant execute on function public.consume_ai_quota(text, integer, integer) to authenticated;
