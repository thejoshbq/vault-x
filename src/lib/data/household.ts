import { createClient } from "@/lib/supabase/server";

export async function getCurrentHouseholdId() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return data?.household_id ?? null;
}

export async function getExpenseCategories() {
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();
  if (!supabase || !householdId) {
    return [
      { id: "00000000-0000-4000-8000-000000000001", name: "Groceries" },
      { id: "00000000-0000-4000-8000-000000000002", name: "Dining" },
      { id: "00000000-0000-4000-8000-000000000003", name: "Transport" },
      { id: "00000000-0000-4000-8000-000000000004", name: "Housing" },
      { id: "00000000-0000-4000-8000-000000000005", name: "Utilities" },
      { id: "00000000-0000-4000-8000-000000000006", name: "Insurance" },
      { id: "00000000-0000-4000-8000-000000000007", name: "Subscriptions" },
      { id: "00000000-0000-4000-8000-000000000008", name: "Giving" },
      { id: "00000000-0000-4000-8000-000000000009", name: "Savings" },
    ];
  }
  const { data } = await supabase
    .from("categories")
    .select("id,name")
    .eq("household_id", householdId)
    .eq("kind", "expense")
    .order("name");
  return data ?? [];
}
