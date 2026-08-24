create extension if not exists pgcrypto with schema extensions;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  currency char(3) not null default 'USD',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
  );
$$;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('checking', 'savings', 'cash', 'credit', 'investment', 'loan')),
  balance_minor bigint not null default 0,
  currency char(3) not null default 'USD',
  color text not null default '#285d52',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('income', 'expense')),
  color text not null default '#6f8e63',
  icon text not null default 'circle',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, name, kind)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'needs_review', 'confirmed', 'failed')),
  merchant text,
  occurred_on date,
  subtotal_minor bigint,
  tax_minor bigint,
  total_minor bigint check (total_minor is null or total_minor >= 0),
  currency char(3) not null default 'USD',
  category_id uuid references public.categories(id) on delete set null,
  payment_hint text,
  confidence jsonb not null default '{}'::jsonb,
  error_message text,
  content_hash text,
  confirmed_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null,
  kind text not null check (kind in ('income', 'expense', 'transfer')),
  merchant text not null check (char_length(merchant) between 1 and 160),
  note text check (note is null or char_length(note) <= 1000),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  occurred_on date not null,
  status text not null default 'posted' check (status in ('posted', 'pending')),
  fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.receipts
  add constraint receipts_confirmed_transaction_fkey
  foreign key (confirmed_transaction_id) references public.transactions(id) on delete set null;

create unique index transactions_household_fingerprint_key
  on public.transactions (household_id, fingerprint)
  where fingerprint is not null;
create unique index receipts_household_content_hash_key
  on public.receipts (household_id, content_hash)
  where content_hash is not null;

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 300),
  quantity numeric(10, 3),
  unit_price_minor bigint,
  total_minor bigint not null check (total_minor >= 0),
  confidence numeric(4, 3) check (confidence between 0 and 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  recurrence text not null check (recurrence in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_on date not null,
  autopay boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused')),
  reminder_days integer not null default 3 check (reminder_days between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  limit_minor bigint not null check (limit_minor > 0),
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  target_minor bigint not null check (target_minor > 0),
  current_minor bigint not null default 0 check (current_minor >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  monthly_income_minor bigint not null check (monthly_income_minor >= 0),
  monthly_spending_minor bigint not null check (monthly_spending_minor >= 0),
  starting_balance_minor bigint not null default 0,
  months integer not null default 12 check (months between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insight_runs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  period_start date not null,
  period_end date not null,
  snapshot jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  insight_run_id uuid references public.insight_runs(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1000),
  severity text not null default 'neutral' check (severity in ('positive', 'neutral', 'attention')),
  action_label text,
  action_href text,
  source_period text not null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index transactions_household_date_idx on public.transactions (household_id, occurred_on desc);
create index transactions_household_category_idx on public.transactions (household_id, category_id, occurred_on desc);
create index recurring_bills_household_due_idx on public.recurring_bills (household_id, next_due_on);
create index receipts_household_status_idx on public.receipts (household_id, status, created_at desc);
create index insights_household_created_idx on public.insights (household_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'households', 'accounts', 'categories', 'transactions', 'recurring_bills',
    'receipts', 'receipt_items', 'budgets', 'goals', 'scenario_plans',
    'insight_runs', 'insights'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
  display_name text;
begin
  display_name := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
  insert into public.households (name, owner_id)
  values (display_name || '''s household', new.id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  insert into public.categories (household_id, name, kind, color, icon, is_system)
  values
    (new_household_id, 'Income', 'income', '#285d52', 'wallet', true),
    (new_household_id, 'Housing', 'expense', '#487654', 'house', true),
    (new_household_id, 'Groceries', 'expense', '#d19b52', 'shopping-basket', true),
    (new_household_id, 'Dining', 'expense', '#b97053', 'utensils', true),
    (new_household_id, 'Transport', 'expense', '#6f8e63', 'car', true),
    (new_household_id, 'Utilities', 'expense', '#617d8a', 'zap', true),
    (new_household_id, 'Subscriptions', 'expense', '#8d6c94', 'repeat', true),
    (new_household_id, 'Other', 'expense', '#9c9485', 'circle', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.scenario_plans enable row level security;
alter table public.insight_runs enable row level security;
alter table public.insights enable row level security;
alter table public.audit_events enable row level security;

create policy "members can read households" on public.households
  for select using (public.is_household_member(id));
create policy "owners can update households" on public.households
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "members can read memberships" on public.household_members
  for select using (public.is_household_member(household_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts', 'categories', 'transactions', 'recurring_bills', 'receipts',
    'receipt_items', 'budgets', 'goals', 'scenario_plans', 'insight_runs',
    'insights'
  ]
  loop
    execute format('create policy "household select" on public.%I for select using (public.is_household_member(household_id))', table_name);
    execute format('create policy "household insert" on public.%I for insert with check (public.is_household_member(household_id))', table_name);
    execute format('create policy "household update" on public.%I for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id))', table_name);
    execute format('create policy "household delete" on public.%I for delete using (public.is_household_member(household_id))', table_name);
  end loop;
end
$$;

create policy "members can read audit events" on public.audit_events
  for select using (public.is_household_member(household_id));
create policy "members can create audit events" on public.audit_events
  for insert with check (
    public.is_household_member(household_id)
    and actor_id = (select auth.uid())
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "members can read receipt files" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "members can upload receipt files" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "members can update receipt files" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );
create policy "members can delete receipt files" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and public.is_household_member((storage.foldername(name))[1]::uuid)
  );

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
