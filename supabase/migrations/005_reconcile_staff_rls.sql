-- Reconcile the production policies with the staff-authentication workflow.
-- Earlier databases retained anon-only development policies after 004 was added.
BEGIN;

DROP POLICY IF EXISTS "dev_select_series" ON public.series;
DROP POLICY IF EXISTS "dev_all_series" ON public.series;
DROP POLICY IF EXISTS "dev_select_clients" ON public.clients;
DROP POLICY IF EXISTS "dev_all_clients" ON public.clients;
DROP POLICY IF EXISTS "dev_select_rates" ON public.client_stage_rates;
DROP POLICY IF EXISTS "dev_all_rates" ON public.client_stage_rates;
DROP POLICY IF EXISTS "dev_select_cases" ON public.cases;
DROP POLICY IF EXISTS "dev_all_cases" ON public.cases;
DROP POLICY IF EXISTS "dev_select_ledger" ON public.ledger_entries;
DROP POLICY IF EXISTS "dev_all_ledger" ON public.ledger_entries;

DROP POLICY IF EXISTS "staff_all_series" ON public.series;
DROP POLICY IF EXISTS "staff_all_clients" ON public.clients;
DROP POLICY IF EXISTS "staff_all_rates" ON public.client_stage_rates;
DROP POLICY IF EXISTS "staff_all_cases" ON public.cases;
DROP POLICY IF EXISTS "staff_all_ledger" ON public.ledger_entries;

CREATE POLICY "staff_all_series" ON public.series
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_rates" ON public.client_stage_rates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_cases" ON public.cases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_all_ledger" ON public.ledger_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.series, public.clients, public.client_stage_rates,
  public.cases, public.ledger_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series, public.clients,
  public.client_stage_rates, public.cases TO authenticated;
REVOKE DELETE ON public.ledger_entries FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ledger_entries TO authenticated;

COMMIT;
