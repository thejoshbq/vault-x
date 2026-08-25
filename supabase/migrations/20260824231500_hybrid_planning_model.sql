create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('salary', 'hourly', 'other')),
  gross_monthly_minor bigint not null default 0 check (gross_monthly_minor >= 0),
  expected_monthly_cash_minor bigint not null default 0 check (expected_monthly_cash_minor >= 0),
  employer_benefits_monthly_minor bigint not null default 0 check (employer_benefits_monthly_minor >= 0),
  employee_taxes_monthly_minor bigint not null default 0 check (employee_taxes_monthly_minor >= 0),
  employee_pretax_monthly_minor bigint not null default 0 check (employee_pretax_monthly_minor >= 0),
  hourly_rate_minor bigint check (hourly_rate_minor is null or hourly_rate_minor >= 0),
  expected_hours_per_week numeric(8, 2) check (expected_hours_per_week is null or expected_hours_per_week >= 0),
  variable boolean not null default false,
  tax_treatment text not null default 'withheld' check (tax_treatment in ('withheld', 'unwithheld', 'unknown')),
  tax_reserve_percent numeric(5, 2) not null default 0
    check (
      tax_reserve_percent between 0 and 100
      and (tax_treatment <> 'withheld' or tax_reserve_percent = 0)
    ),
  status text not null default 'active' check (status in ('active', 'paused')),
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, id)
);

create unique index income_sources_household_source_key
  on public.income_sources (household_id, source_key)
  where source_key is not null;

create table public.income_components (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  income_source_id uuid not null,
  name text not null check (char_length(name) between 1 and 160),
  component_type text not null check (
    component_type in ('gross_pay', 'employee_tax', 'employee_pretax_deduction', 'employer_benefit')
  ),
  monthly_amount_minor bigint not null check (monthly_amount_minor >= 0),
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, income_source_id)
    references public.income_sources (household_id, id)
    on delete cascade
);

create unique index income_components_source_key
  on public.income_components (income_source_id, source_key)
  where source_key is not null;

alter table public.transactions
  add column income_source_id uuid,
  add constraint transactions_household_income_source_fkey
    foreign key (household_id, income_source_id)
    references public.income_sources (household_id, id)
    on delete set null (income_source_id);

alter table public.accounts
  add column institution text,
  add column purpose text not null default 'other'
    check (purpose in ('operating', 'income_holding', 'emergency', 'dependent_savings', 'investment', 'other')),
  add column owner_label text,
  add column apy numeric(8, 4) not null default 0 check (apy >= 0),
  add column source_key text;

create unique index accounts_household_source_key
  on public.accounts (household_id, source_key)
  where source_key is not null;

alter table public.recurring_bills
  drop constraint recurring_bills_recurrence_check,
  drop constraint recurring_bills_amount_minor_check,
  alter column next_due_on drop not null,
  add constraint recurring_bills_recurrence_check
    check (recurrence in ('weekly', 'monthly', 'quarterly', 'semiannual', 'yearly')),
  add constraint recurring_bills_amount_minor_check check (amount_minor >= 0),
  add column expense_type text not null default 'fixed'
    check (expense_type in ('fixed', 'variable', 'subscription', 'insurance', 'contribution')),
  add column billing_account_label text,
  add column payment_method text,
  add column privacy_mask text
    check (privacy_mask is null or privacy_mask in ('none', 'privacy', 'virtual_card')),
  add column essential boolean not null default false,
  add column source_key text,
  add column notes text check (notes is null or char_length(notes) <= 1000);

create unique index recurring_bills_household_source_key
  on public.recurring_bills (household_id, source_key)
  where source_key is not null;

create trigger set_income_sources_updated_at
  before update on public.income_sources
  for each row execute function public.set_updated_at();
create trigger set_income_components_updated_at
  before update on public.income_components
  for each row execute function public.set_updated_at();

alter table public.income_sources enable row level security;
alter table public.income_components enable row level security;

create policy "household select" on public.income_sources
  for select using (public.is_household_member(household_id));
create policy "household insert" on public.income_sources
  for insert with check (public.is_household_member(household_id));
create policy "household update" on public.income_sources
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy "household delete" on public.income_sources
  for delete using (public.is_household_member(household_id));

create policy "household select" on public.income_components
  for select using (public.is_household_member(household_id));
create policy "household insert" on public.income_components
  for insert with check (public.is_household_member(household_id));
create policy "household update" on public.income_components
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy "household delete" on public.income_components
  for delete using (public.is_household_member(household_id));

grant select, insert, update, delete on
  public.income_sources,
  public.income_components
to authenticated;
