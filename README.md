# Vault X

Vault X is a mobile-first personal finance PWA for manually tracking transactions, planning recurring bills and budgets, scanning receipts, and receiving AI-assisted explanations grounded in deterministic financial calculations.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, Row Level Security, Storage, Cron, and Edge Functions
- Vercel deployment
- Provider-neutral AI boundaries with an OpenAI adapter
- Vitest, pgTAP, and Playwright

## Product areas

- **Home:** expected-versus-actual reconciliation, spendable income, true monthly cost, sinking funds, emergency runway, and an AI briefing
- **Income:** gross pay, spendable cash, employee taxes, pre-tax deductions, employer-paid benefits, variable hours, and tax-reserve assumptions
- **Transactions:** actual ledger entry, income-source/category assignment, search/filtering, CSV export, duplicate protection, and receipt linkage
- **Receipts:** private camera/file upload, asynchronous extraction, field confidence, review, and atomic confirmation
- **Bills:** fixed/variable/subscription classification, monthly normalization, semiannual and annual sinking funds, billing route, privacy mask, schedule review, and posting progression
- **Plan:** budgets, savings goals, and deterministic what-if projections
- **Insights:** generated cards and Ask Vault, grounded in a server-created aggregate snapshot

Bank synchronization and native mobile apps are intentionally outside the first release.

## Local development

Requirements: Node.js 22+, npm, Docker, and the Supabase CLI.

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

Open `http://localhost:3000`. Without working Supabase environment values, the app runs in read-only preview mode with representative data.

Generate local database types after schema changes:

```bash
npm run db:types
```

## Private finance import

Sensitive spreadsheet values are intentionally excluded from Git. The default private input lives at `.private/finance-seed.json`, which is ignored by `.gitignore`.

1. Update `ownerEmail` to the email of an existing Supabase Auth user.
2. Edit income assumptions, account balances/APYs, obligations, billing routes, and due dates as they change.
3. Validate without connecting to Supabase:

```bash
npm run data:import -- --validate
```

4. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then preview the changes:

```bash
npm run data:import
```

5. Apply the reviewed changes:

```bash
npm run data:import:apply
```

The importer is idempotent by stable `sourceKey`. Re-running updates the existing private plan rather than duplicating it; removing an imported item pauses or archives it rather than deleting history. Variable monthly obligations also create or update the current month’s category budgets. Missing due dates remain `null` and appear in the Bills review queue instead of receiving guessed dates.

Income with unknown/unwithheld tax treatment and a zero reserve is shown in Income but excluded from the safe monthly plan until a reserve percentage is configured.

## AI and receipt processing

Set `OPENAI_API_KEY`, `AI_MODEL`, and a long random `CRON_SECRET` in Supabase Edge Function secrets and Vercel. Deploy functions:

```bash
npx supabase functions deploy process-receipt
npx supabase functions deploy generate-insights --no-verify-jwt
```

`process-receipt` verifies the caller's Supabase JWT and checks receipt access through RLS before service-role processing. `generate-insights` requires `x-cron-secret`.

For scheduled insight generation, add these values to Supabase Vault:

- `vault_x_project_url`: the Supabase project URL
- `vault_x_cron_secret`: the same value as `CRON_SECRET`

The database migration schedules generation at 07:00 UTC every Monday.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npx supabase test db
npm run build
```

`npm run verify` runs lint, type checking, unit tests, and a production build.

## Deployment

1. Create and link a Supabase project: `npx supabase link`.
2. Apply migrations: `npx supabase db push`.
3. Configure Auth site/redirect URLs for the Vercel domain.
4. Deploy both Edge Functions and set their secrets.
5. Import the repository into Vercel and copy `.env.example` values into project settings.
6. Add the two Supabase Vault secrets used by the weekly job.
7. Run the production smoke and RLS isolation checks.

The former Go/SQLite, Docker, and k3s application was intentionally replaced. A legacy JWT secret was previously present in repository history; rotate it anywhere the old deployment may still be reachable. Deleting the file does not revoke the credential.

## Security model

- Every finance row carries `household_id` and is protected by RLS.
- Receipt objects are private, size/type constrained, and addressed under household-scoped paths.
- Service-role and AI credentials never enter browser bundles.
- Receipt extraction does not create a transaction until the user reviews it.
- AI insight prompts contain deterministic aggregate snapshots rather than raw receipt images.
- Money is stored as integer minor units plus an ISO currency code.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system details.
