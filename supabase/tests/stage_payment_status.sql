-- Run against a local/test Supabase database with the Ledger migrations applied.
-- All inserted fixtures are rolled back when the script succeeds.
BEGIN;

DO $test$
DECLARE
  v_client_id uuid := gen_random_uuid();
  v_case_ids uuid[] := ARRAY[]::uuid[];
  v_tms text[] := ARRAY[]::text[];
  v_case_id uuid;
  v_tm text;
  v_stage jsonb;
  i integer;
BEGIN
  INSERT INTO public.clients (client_code, client_name)
  VALUES ('TEST-' || upper(substr(gen_random_uuid()::text, 1, 8)), 'ROLLBACK-ONLY PAYMENT TEST')
  RETURNING id INTO v_client_id;

  FOR i IN 1..6 LOOP
    LOOP
      v_tm := lpad((100000 + floor(random() * 900000))::bigint::text, 6, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.cases c WHERE c.tm_no_normalized = v_tm
      );
    END LOOP;

    INSERT INTO public.cases (client_id, tm_no, tm_no_normalized)
    VALUES (v_client_id, v_tm, v_tm)
    RETURNING id INTO v_case_id;

    v_case_ids := array_append(v_case_ids, v_case_id);
    v_tms := array_append(v_tms, v_tm);
  END LOOP;

  -- Zero due with a positive receipt must remain unpaid.
  INSERT INTO public.ledger_entries
    (client_id, case_id, entry_type, stage, amount_due, amount_received)
  VALUES
    (v_client_id, v_case_ids[1], 'receiving', 'S1', 0, 10);

  -- A partial receipt must remain unpaid.
  INSERT INTO public.ledger_entries
    (client_id, case_id, entry_type, stage, amount_due, amount_received)
  VALUES
    (v_client_id, v_case_ids[2], 'charge', 'S1', 100, 0),
    (v_client_id, v_case_ids[2], 'receiving', 'S1', 0, 40);

  -- Exact settlement must be paid.
  INSERT INTO public.ledger_entries
    (client_id, case_id, entry_type, stage, amount_due, amount_received)
  VALUES
    (v_client_id, v_case_ids[3], 'charge', 'S1', 100, 0),
    (v_client_id, v_case_ids[3], 'receiving', 'S1', 0, 100);

  -- Overpayment remains paid, and outstanding never goes below zero.
  INSERT INTO public.ledger_entries
    (client_id, case_id, entry_type, stage, amount_due, amount_received)
  VALUES
    (v_client_id, v_case_ids[4], 'charge', 'S1', 100, 0),
    (v_client_id, v_case_ids[4], 'receiving', 'S1', 0, 120);

  -- Voided receipts do not count.
  INSERT INTO public.ledger_entries
    (client_id, case_id, entry_type, stage, amount_due, amount_received, voided_at, void_reason)
  VALUES
    (v_client_id, v_case_ids[5], 'charge', 'S1', 100, 0, NULL, NULL),
    (v_client_id, v_case_ids[5], 'receiving', 'S1', 0, 100, now(), 'TEST ONLY');

  -- Multiple partial receipts are summed to determine settlement.
  INSERT INTO public.ledger_entries
    (client_id, case_id, entry_type, stage, amount_due, amount_received)
  VALUES
    (v_client_id, v_case_ids[6], 'charge', 'S1', 100, 0),
    (v_client_id, v_case_ids[6], 'receiving', 'S1', 0, 40),
    (v_client_id, v_case_ids[6], 'receiving', 'S1', 0, 60);

  v_stage := public.get_stage_payment_status(v_tms[1]) -> 'S1';
  IF (v_stage ->> 'paid')::boolean IS DISTINCT FROM false
     OR (v_stage ->> 'amount_due')::numeric <> 0
     OR (v_stage ->> 'amount_received')::numeric <> 10
     OR v_stage -> 'paid_date' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'zero due + positive receipt failed: %', v_stage;
  END IF;

  v_stage := public.get_stage_payment_status(v_tms[2]) -> 'S1';
  IF (v_stage ->> 'paid')::boolean IS DISTINCT FROM false
     OR v_stage -> 'paid_date' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'partial receipt failed: %', v_stage;
  END IF;

  v_stage := public.get_stage_payment_status(v_tms[3]) -> 'S1';
  IF (v_stage ->> 'paid')::boolean IS DISTINCT FROM true
     OR v_stage -> 'paid_date' = 'null'::jsonb THEN
    RAISE EXCEPTION 'exact settlement failed: %', v_stage;
  END IF;

  v_stage := public.get_stage_payment_status(v_tms[4]) -> 'S1';
  IF (v_stage ->> 'paid')::boolean IS DISTINCT FROM true
     OR (v_stage ->> 'outstanding')::numeric <> 0 THEN
    RAISE EXCEPTION 'overpayment handling failed: %', v_stage;
  END IF;

  v_stage := public.get_stage_payment_status(v_tms[5]) -> 'S1';
  IF (v_stage ->> 'paid')::boolean IS DISTINCT FROM false
     OR (v_stage ->> 'amount_received')::numeric <> 0 THEN
    RAISE EXCEPTION 'voided receipt exclusion failed: %', v_stage;
  END IF;

  v_stage := public.get_stage_payment_status(v_tms[6]) -> 'S1';
  IF (v_stage ->> 'paid')::boolean IS DISTINCT FROM true
     OR (v_stage ->> 'amount_received')::numeric <> 100 THEN
    RAISE EXCEPTION 'partial receipt aggregation failed: %', v_stage;
  END IF;
END
$test$;

ROLLBACK;
SELECT 'PASS: zero due, partial, exact, overpayment, voided receipt, and receipt aggregation checks' AS result;
