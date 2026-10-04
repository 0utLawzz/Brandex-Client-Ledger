-- Additive only: soft void + link receiving to charge
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS linked_entry_id uuid REFERENCES public.ledger_entries(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ledger_entries.voided_at IS 'Soft void. Non-null means entry is cancelled and excluded from balances.';
COMMENT ON COLUMN public.ledger_entries.linked_entry_id IS 'For receiving: optional link to a specific charge entry.';

CREATE INDEX IF NOT EXISTS idx_ledger_voided ON public.ledger_entries(voided_at) WHERE voided_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_linked ON public.ledger_entries(linked_entry_id) WHERE linked_entry_id IS NOT NULL;

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
  LIMIT 1;

  IF v_case_id IS NULL THEN
    RETURN v_result;
  END IF;

  FOREACH v_stage IN ARRAY ARRAY['S1','S2','S3','S4']
  LOOP
    SELECT COALESCE(SUM(e.amount_due),0), COALESCE(SUM(e.amount_received),0)
      INTO v_due, v_rec
    FROM public.ledger_entries e
    WHERE e.case_id = v_case_id AND e.stage = v_stage AND e.voided_at IS NULL;

    SELECT e.id, e.entry_date INTO v_entry_id, v_paid_date
    FROM public.ledger_entries e
    WHERE e.case_id = v_case_id AND e.stage = v_stage
      AND e.entry_type = 'receiving' AND e.voided_at IS NULL
      AND COALESCE(e.amount_received,0) > 0
    ORDER BY e.entry_date DESC, e.created_at DESC
    LIMIT 1;

    v_paid := (v_rec > 0 AND v_rec >= v_due AND v_due > 0) OR (v_rec > 0 AND v_due = 0);

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
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text) TO anon, authenticated;
