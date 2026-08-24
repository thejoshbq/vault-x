create or replace function public.confirm_receipt(
  target_receipt_id uuid,
  target_account_id uuid,
  target_category_id uuid,
  reviewed_merchant text,
  reviewed_occurred_on date,
  reviewed_total_minor bigint
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  receipt_row public.receipts%rowtype;
  transaction_id uuid;
  transaction_fingerprint text;
begin
  select * into receipt_row
  from public.receipts
  where id = target_receipt_id
  for update;

  if not found or not public.is_household_member(receipt_row.household_id) then
    raise exception 'Receipt not found';
  end if;
  if receipt_row.status <> 'needs_review' then
    raise exception 'Receipt is not ready for confirmation';
  end if;
  if reviewed_total_minor <= 0 then
    raise exception 'Receipt total must be positive';
  end if;

  transaction_fingerprint := encode(
    extensions.digest(
      receipt_row.household_id::text || '|' ||
      target_account_id::text || '|' ||
      lower(reviewed_merchant) || '|' ||
      reviewed_total_minor::text || '|' ||
      reviewed_occurred_on::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.transactions (
    household_id, account_id, category_id, receipt_id, kind, merchant,
    amount_minor, currency, occurred_on, status, fingerprint
  )
  values (
    receipt_row.household_id, target_account_id, target_category_id,
    receipt_row.id, 'expense', reviewed_merchant, reviewed_total_minor,
    receipt_row.currency, reviewed_occurred_on, 'posted', transaction_fingerprint
  )
  returning id into transaction_id;

  update public.receipts
  set status = 'confirmed',
      merchant = reviewed_merchant,
      occurred_on = reviewed_occurred_on,
      total_minor = reviewed_total_minor,
      category_id = target_category_id,
      confirmed_transaction_id = transaction_id
  where id = receipt_row.id;

  insert into public.audit_events (household_id, actor_id, action, entity_type, entity_id)
  values (receipt_row.household_id, auth.uid(), 'receipt.confirmed', 'receipt', receipt_row.id);

  return transaction_id;
exception
  when unique_violation then
    raise exception 'A matching transaction already exists';
end;
$$;

revoke all on function public.confirm_receipt(uuid, uuid, uuid, text, date, bigint) from public;
grant execute on function public.confirm_receipt(uuid, uuid, uuid, text, date, bigint) to authenticated;
