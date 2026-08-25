export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type BaseRow = {
  id: string;
  household_id: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      households: Table<{
        id: string;
        name: string;
        currency: string;
        owner_id: string;
        created_at: string;
        updated_at: string;
      }>;
      household_members: Table<{
        id: string;
        household_id: string;
        user_id: string;
        role: "owner" | "member";
        created_at: string;
      }>;
      accounts: Table<
        BaseRow & {
          name: string;
          type: string;
          balance_minor: number;
          currency: string;
          color: string;
          is_archived: boolean;
          institution: string | null;
          purpose: string;
          owner_label: string | null;
          apy: number;
          source_key: string | null;
        }
      >;
      income_sources: Table<
        BaseRow & {
          name: string;
          kind: "salary" | "hourly" | "other";
          gross_monthly_minor: number;
          expected_monthly_cash_minor: number;
          employer_benefits_monthly_minor: number;
          employee_taxes_monthly_minor: number;
          employee_pretax_monthly_minor: number;
          hourly_rate_minor: number | null;
          expected_hours_per_week: number | null;
          variable: boolean;
          tax_treatment: "withheld" | "unwithheld" | "unknown";
          tax_reserve_percent: number;
          status: "active" | "paused";
          source_key: string | null;
        }
      >;
      income_components: Table<
        BaseRow & {
          income_source_id: string;
          name: string;
          component_type:
            | "gross_pay"
            | "employee_tax"
            | "employee_pretax_deduction"
            | "employer_benefit";
          monthly_amount_minor: number;
          source_key: string | null;
        }
      >;
      categories: Table<
        BaseRow & {
          name: string;
          kind: "income" | "expense";
          color: string;
          icon: string;
          parent_id: string | null;
          is_system: boolean;
        }
      >;
      transactions: Table<
        BaseRow & {
          account_id: string;
          category_id: string | null;
          income_source_id: string | null;
          receipt_id: string | null;
          kind: "income" | "expense" | "transfer";
          merchant: string;
          note: string | null;
          amount_minor: number;
          currency: string;
          occurred_on: string;
          status: "posted" | "pending";
          fingerprint: string | null;
        }
      >;
      recurring_bills: Table<
        BaseRow & {
          account_id: string | null;
          category_id: string | null;
          name: string;
          amount_minor: number;
          currency: string;
          recurrence: string;
          next_due_on: string | null;
          autopay: boolean;
          status: "active" | "paused";
          reminder_days: number;
          expense_type: "fixed" | "variable" | "subscription" | "insurance" | "contribution";
          billing_account_label: string | null;
          payment_method: string | null;
          privacy_mask: "none" | "privacy" | "virtual_card" | null;
          essential: boolean;
          source_key: string | null;
          notes: string | null;
        }
      >;
      budgets: Table<
        BaseRow & {
          category_id: string;
          name: string;
          limit_minor: number;
          period_start: string;
          period_end: string;
          rollover: boolean;
        }
      >;
      goals: Table<
        BaseRow & {
          name: string;
          target_minor: number;
          current_minor: number;
          target_date: string | null;
        }
      >;
      scenario_plans: Table<
        BaseRow & {
          name: string;
          monthly_income_minor: number;
          monthly_spending_minor: number;
          starting_balance_minor: number;
          months: number;
        }
      >;
      receipts: Table<
        BaseRow & {
          storage_path: string;
          status: string;
          merchant: string | null;
          occurred_on: string | null;
          subtotal_minor: number | null;
          tax_minor: number | null;
          total_minor: number | null;
          currency: string;
          category_id: string | null;
          payment_hint: string | null;
          confidence: Json;
          error_message: string | null;
          content_hash: string | null;
          confirmed_transaction_id: string | null;
        }
      >;
      receipt_items: Table<
        BaseRow & {
          receipt_id: string;
          description: string;
          quantity: number | null;
          unit_price_minor: number | null;
          total_minor: number;
          confidence: number | null;
          sort_order: number;
        }
      >;
      insight_runs: Table<
        BaseRow & {
          status: string;
          period_start: string;
          period_end: string;
          snapshot: Json;
          provider: string | null;
          model: string | null;
          error_message: string | null;
          completed_at: string | null;
        }
      >;
      insights: Table<
        BaseRow & {
          insight_run_id: string | null;
          title: string;
          body: string;
          severity: string;
          action_label: string | null;
          action_href: string | null;
          source_period: string;
          dismissed_at: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      confirm_receipt: {
        Args: {
          target_receipt_id: string;
          target_account_id: string;
          target_category_id: string | null;
          reviewed_merchant: string;
          reviewed_occurred_on: string;
          reviewed_total_minor: number;
        };
        Returns: string;
      };
      consume_ai_quota: {
        Args: {
          target_bucket: string;
          max_requests: number;
          window_seconds: number;
        };
        Returns: boolean;
      };
      is_household_member: {
        Args: { target_household_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
