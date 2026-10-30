-- Keep the historical migrations intact. This corrects the stage payment RPC
-- for zero-due stages and limits its Data API access to trusted server code.
CREATE OR REPLACE FUNCTION public.get_stage_payment_status(p_tm_digits text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

    SELECT COALESCE(SUM(e.amount_received), 0)
      INTO v_rec
    FROM public.ledger_entries e
    WHERE e.case_id = v_case_id
      AND e.stage = v_stage
      AND e.entry_type = 'receiving'
      AND e.voided_at IS NULL
      AND COALESCE(e.amount_received, 0) > 0;

    v_paid := v_due > 0 AND v_rec >= v_due;
    v_paid_date := NULL;
    v_entry_id := NULL;

    IF v_paid THEN
      SELECT receipt.entry_date, receipt.id
        INTO v_paid_date, v_entry_id
      FROM (
        SELECT e.id, e.entry_date, e.created_at,
               SUM(e.amount_received) OVER (
                 ORDER BY e.entry_date, e.created_at, e.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
               ) AS cumulative_received
        FROM public.ledger_entries e
        WHERE e.case_id = v_case_id
          AND e.stage = v_stage
          AND e.entry_type = 'receiving'
          AND e.voided_at IS NULL
          AND COALESCE(e.amount_received, 0) > 0
      ) AS receipt
      WHERE receipt.cumulative_received >= v_due
      ORDER BY receipt.entry_date, receipt.created_at, receipt.id
      LIMIT 1;
    END IF;

    v_result := v_result || jsonb_build_object(
      v_stage, jsonb_build_object(
        'paid', COALESCE(v_paid, false),
        'paid_date', v_paid_date,
        'amount_due', v_due,
        'amount_received', v_rec,
        'outstanding', GREATEST(v_due - v_rec, 0),
        'entry_id', v_entry_id
      )
    );
  END LOOP;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_stage_payment_status(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text)
  TO service_role;
