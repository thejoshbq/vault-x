grant usage on schema public to authenticated;

grant select, update on public.households to authenticated;
grant select on public.household_members to authenticated;

grant select, insert, update, delete on
  public.accounts,
  public.categories,
  public.transactions,
  public.recurring_bills,
  public.receipts,
  public.receipt_items,
  public.budgets,
  public.goals,
  public.scenario_plans,
  public.insight_runs,
  public.insights
to authenticated;

grant select, insert on public.audit_events to authenticated;
