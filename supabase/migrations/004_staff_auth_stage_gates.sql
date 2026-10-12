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

CREATE OR REPLACE FUNCTION public.ledger_case_stage_status(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_stage text;
  v_due numeric;
  v_direct_received numeric;
  v_general_pool numeric;
  v_general_applied numeric;
  v_stage_received numeric;
BEGIN
  SELECT COALESCE(SUM(e.amount_received), 0)
    INTO v_general_pool
  FROM public.ledger_entries e
  WHERE e.case_id = p_case_id
    AND e.entry_type = 'receiving'
    AND e.stage IS NULL
    AND e.linked_entry_id IS NULL
    AND e.voided_at IS NULL;

  FOREACH v_stage IN ARRAY ARRAY['S1','S2','S3','S4']
  LOOP
    SELECT COALESCE(SUM(e.amount_due), 0)
      INTO v_due
    FROM public.ledger_entries e
    WHERE e.case_id = p_case_id
      AND e.entry_type = 'charge'
      AND e.stage = v_stage
      AND e.voided_at IS NULL;

    SELECT COALESCE(SUM(r.amount_received), 0)
      INTO v_direct_received
    FROM public.ledger_entries r
    WHERE r.case_id = p_case_id
      AND r.entry_type = 'receiving'
      AND r.voided_at IS NULL
      AND (
        (r.linked_entry_id IS NULL AND r.stage = v_stage)
        OR r.linked_entry_id IN (
          SELECT c.id
          FROM public.ledger_entries c
          WHERE c.case_id = p_case_id
            AND c.entry_type = 'charge'
            AND c.stage = v_stage
            AND c.voided_at IS NULL
        )
      );

    v_general_applied := LEAST(
      v_general_pool,
      GREATEST(v_due - v_direct_received, 0)
    );
    v_general_pool := GREATEST(v_general_pool - v_general_applied, 0);
    v_stage_received := v_direct_received + v_general_applied;

    v_result := v_result || jsonb_build_object(
      v_stage, jsonb_build_object(
        'amount_due', v_due,
        'amount_received', v_stage_received,
        'outstanding', GREATEST(v_due - v_stage_received, 0),
        'paid', v_due > 0 AND v_stage_received >= v_due
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ledger_stage_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_stage text;
  v_order int;
  v_previous text;
  v_status jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.case_id IS DISTINCT FROM NEW.case_id THEN
    RAISE EXCEPTION 'Ledger entries cannot be reassigned between cases; void and repost the entry';
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_case_id := OLD.case_id;
  ELSE
    v_case_id := NEW.case_id;
  END IF;

  IF v_case_id IS NOT NULL THEN
    v_status := public.ledger_case_stage_status(v_case_id);
    FOR v_stage IN
      SELECT DISTINCT e.stage
      FROM public.ledger_entries e
      WHERE e.case_id = v_case_id
        AND e.entry_type = 'charge'
        AND e.voided_at IS NULL
        AND e.stage IN ('S2','S3','S4')
      ORDER BY e.stage
    LOOP
      v_order := array_position(ARRAY['S1','S2','S3','S4'], v_stage);
      v_previous := 'S' || (v_order - 1)::text;
      IF COALESCE((v_status -> v_previous ->> 'paid')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Stage % must be fully cleared before stage % can remain active', v_previous, v_stage;
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_stage_gate ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER trg_ledger_stage_gate
  AFTER INSERT OR UPDATE OR DELETE ON public.ledger_entries
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ledger_stage_gate();

CREATE OR REPLACE FUNCTION public.get_stage_payment_status(p_tm_digits text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_stage text;
  v_paid_date date;
  v_entry_id uuid;
  v_case_status jsonb;
BEGIN
  IF p_tm_digits IS NULL OR length(trim(p_tm_digits)) = 0 THEN
    RETURN v_result;
  END IF;

  SELECT c.id INTO v_case_id
  FROM public.cases c
  WHERE c.tm_no_normalized = regexp_replace(p_tm_digits, '[^0-9]', '', 'g')
  ORDER BY c.created_at
  LIMIT 1;

  IF v_case_id IS NULL THEN
    RETURN v_result;
  END IF;

  v_case_status := public.ledger_case_stage_status(v_case_id);
  FOREACH v_stage IN ARRAY ARRAY['S1','S2','S3','S4']
  LOOP
    SELECT e.id, e.entry_date INTO v_entry_id, v_paid_date
    FROM public.ledger_entries e
    WHERE e.case_id = v_case_id
      AND e.stage = v_stage
      AND e.entry_type = 'receiving'
      AND e.voided_at IS NULL
      AND COALESCE(e.amount_received, 0) > 0
    ORDER BY e.entry_date DESC, e.created_at DESC
    LIMIT 1;

    v_result := v_result || jsonb_build_object(
      v_stage, (v_case_status -> v_stage) || jsonb_build_object(
        'paid_date', v_paid_date,
        'entry_id', v_entry_id
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_stage_payment_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text) TO authenticated;
REVOKE ALL ON FUNCTION public.ledger_case_stage_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ledger_case_stage_status(uuid) TO authenticated;

COMMIT;
