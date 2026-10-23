import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type StageStatus = {
  amount_due?: number;
  amount_received?: number;
  outstanding?: number;
  paid?: boolean;
  paid_date?: string | null;
  entry_id?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function matchesSecret(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    difference |= candidate.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function normalizeTm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("CMS_LEDGER_INTEGRATION_SECRET");
  const presentedSecret = request.headers.get("x-brandex-ledger-integration-secret") ?? "";
  if (!expectedSecret || !matchesSecret(presentedSecret, expectedSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("CMS payment bridge is missing Ledger server configuration");
    return json({ error: "Ledger payment status is unavailable" }, 503);
  }

  let input: { tm_digits?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!Array.isArray(input.tm_digits) || input.tm_digits.length < 1 || input.tm_digits.length > 50) {
    return json({ error: "Provide between 1 and 50 TM numbers" }, 400);
  }
  const tmNumbers = [...new Set(input.tm_digits.map(normalizeTm))];
  if (tmNumbers.includes(null)) return json({ error: "Each TM number must contain exactly six digits" }, 400);

  const ledger = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const payments: Record<string, Record<string, StageStatus>> = {};
  for (const tm of tmNumbers as string[]) {
    const { data, error } = await ledger.rpc("get_stage_payment_status", { p_tm_digits: tm });
    if (error) {
      console.error("Ledger stage status RPC failed", { code: error.code });
      return json({ error: "Could not read Ledger payment status" }, 502);
    }
    payments[tm] = (data ?? {}) as Record<string, StageStatus>;
  }

  return json({ payments });
});
