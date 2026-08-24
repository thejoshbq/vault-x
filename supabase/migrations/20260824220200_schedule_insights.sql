create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_scheduled_insights()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  cron_secret text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'vault_x_project_url';

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'vault_x_cron_secret';

  if project_url is null or cron_secret is null then
    raise warning 'Vault X scheduled insights require vault_x_project_url and vault_x_cron_secret in Supabase Vault';
    return;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/generate-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

select cron.schedule(
  'vault-x-weekly-insights',
  '0 7 * * 1',
  $$select public.invoke_scheduled_insights();$$
);
