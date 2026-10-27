-- Correct stage-payment status from authoritative, stage-allocated ledger entries.
-- Keep the CMS RPC restricted to the trusted Ledger Edge Function service role.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_stage_payment_status(p_tm_digits text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_stage text;
  v_due numeric;
  v_rec numeric;
  v_paid boolean;
  v_paid_date date;
  v_entry_id uuid;
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

  FOREACH v_stage IN ARRAY ARRAY['S1','S2','S3','S4']
  LOOP
    SELECT COALESCE(SUM(e.amount_due), 0)
      INTO v_due
    FROM public.ledger_entries e
    WHERE e.case_id = v_case_id
      AND e.stage = v_stage
      AND e.entry_type = 'charge'
      AND e.voided_at IS NULL;

    SELECT COALESCE(SUM(r.amount_received), 0)
      INTO v_rec
    FROM public.ledger_entries r
    WHERE r.case_id = v_case_id
      AND r.entry_type = 'receiving'
      AND r.voided_at IS NULL
      AND (
        (r.linked_entry_id IS NULL AND r.stage = v_stage)
        OR r.linked_entry_id IN (
          SELECT c.id
          FROM public.ledger_entries c
          WHERE c.case_id = v_case_id
            AND c.entry_type = 'charge'
            AND c.stage = v_stage
            AND c.voided_at IS NULL
        )
      );

    SELECT r.id, r.entry_date
      INTO v_entry_id, v_paid_date
    FROM public.ledger_entries r
    WHERE r.case_id = v_case_id
      AND r.entry_type = 'receiving'
      AND r.voided_at IS NULL
      AND COALESCE(r.amount_received, 0) > 0
      AND (
        (r.linked_entry_id IS NULL AND r.stage = v_stage)
        OR r.linked_entry_id IN (
          SELECT c.id
          FROM public.ledger_entries c
          WHERE c.case_id = v_case_id
            AND c.entry_type = 'charge'
            AND c.stage = v_stage
            AND c.voided_at IS NULL
        )
      )
    ORDER BY r.entry_date DESC, r.created_at DESC
    LIMIT 1;

    v_paid := v_due > 0 AND v_rec >= v_due;

    v_result := v_result || jsonb_build_object(
      v_stage, jsonb_build_object(
        'paid', COALESCE(v_paid, false),
        'paid_date', CASE WHEN v_paid THEN v_paid_date ELSE NULL END,
        'amount_due', v_due,
        'amount_received', v_rec,
        'outstanding', GREATEST(v_due - v_rec, 0),
        'entry_id', v_entry_id
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_stage_payment_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text) TO service_role;

COMMIT;
