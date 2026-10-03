-- ============================================================
-- BRANDEX CLIENT LEDGER — Initial Schema
-- Additive design: preserves all concepts from previous Ledger
-- (client_code, tm_no, stage, amount_due, amount_received, etc.)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- SERIES / GROUPS (A, X, custom)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.series (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,          -- 'A', 'X', ...
  name        text NOT NULL,                 -- 'A-Series', 'X-Series'
  prefix      text NOT NULL DEFAULT '',      -- optional display prefix
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.series IS 'Account series / groups. Clients belong to one series.';

INSERT INTO public.series (code, name, prefix, sort_order) VALUES
  ('A', 'A-Series', 'A-', 10),
  ('X', 'X-Series', 'X-', 20)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- CLIENTS (extends previous shape)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       uuid REFERENCES public.series(id) ON DELETE SET NULL,
  client_code     text NOT NULL UNIQUE,       -- e.g. A-001
  client_name     text,
  city            text,
  header_balance  numeric(14,2) NOT NULL DEFAULT 0,
  bank_name       text,
  bank_account    text,
  bank_iban       text,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clients IS 'One row per client account. client_code is the stable business key.';
COMMENT ON COLUMN public.clients.header_balance IS 'Opening / prior balance carried from legacy sheets.';

CREATE INDEX IF NOT EXISTS idx_clients_series ON public.clients(series_id);
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(client_code);

-- ------------------------------------------------------------
-- CUSTOM STAGE RATES PER CLIENT
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_stage_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage       text NOT NULL CHECK (stage IN ('S1','S2','S3','S4')),
  amount      numeric(14,2) NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'PKR',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, stage)
);

COMMENT ON TABLE public.client_stage_rates IS 'Per-client custom prices for each stage. Used when posting a charge.';

CREATE INDEX IF NOT EXISTS idx_stage_rates_client ON public.client_stage_rates(client_id);

-- ------------------------------------------------------------
-- CASES (TM-number centric)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  tm_no             text,                         -- original legal identifier (kept as-is)
  tm_no_normalized  text,                         -- digits only — join key with CMS
  folder_no         text,
  case_ref          text,                         -- optional internal ref
  application_name  text,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','stopped')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cases IS 'One trademark matter. Primary business key for payments is tm_no_normalized.';
COMMENT ON COLUMN public.cases.tm_no_normalized IS 'Digits-only form of tm_no. Same rule as CMS tm_cpr_number uniqueness.';

CREATE INDEX IF NOT EXISTS idx_cases_client ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_tm_norm ON public.cases(tm_no_normalized) WHERE tm_no_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_tm_no ON public.cases(tm_no) WHERE tm_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_folder ON public.cases(folder_no) WHERE folder_no IS NOT NULL;

-- ------------------------------------------------------------
-- LEDGER ENTRIES (charges + receivings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  case_id          uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  entry_date       date NOT NULL DEFAULT CURRENT_DATE,
  entry_type       text NOT NULL CHECK (entry_type IN ('charge','receiving')),
  stage            text CHECK (stage IS NULL OR stage IN ('S1','S2','S3','S4')),
  details          text,
  amount_due       numeric(14,2),                 -- set on charge
  amount_received  numeric(14,2),                 -- set on receiving
  running_balance  numeric(14,2),                 -- optional cached balance after this row
  payment_method   text,                          -- cash / bank / online / …
  receipt_no       text,                          -- generated for receivings
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ledger_entries IS 'Every charge and every payment. entry_type distinguishes the two.';
COMMENT ON COLUMN public.ledger_entries.stage IS 'Stage this charge/payment is allocated to. NULL = general client payment.';
COMMENT ON COLUMN public.ledger_entries.receipt_no IS 'Human-readable receipt number for print.';

CREATE INDEX IF NOT EXISTS idx_ledger_client ON public.ledger_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_ledger_case ON public.ledger_entries(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_date ON public.ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_stage ON public.ledger_entries(stage) WHERE stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_receipt ON public.ledger_entries(receipt_no) WHERE receipt_no IS NOT NULL;

-- ------------------------------------------------------------
-- HELPER: normalize TM number (digits only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_tm(tm text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(tm, ''), '[^0-9]', '', 'g'), '');
$$;

-- Auto-fill tm_no_normalized on cases
CREATE OR REPLACE FUNCTION public.cases_set_normalized()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tm_no_normalized := public.normalize_tm(NEW.tm_no);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cases_normalized ON public.cases;
CREATE TRIGGER trg_cases_normalized
  BEFORE INSERT OR UPDATE OF tm_no ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.cases_set_normalized();

-- updated_at on clients
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated ON public.clients;
CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- VIEW: client balances (dashboard)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.client_balances
WITH (security_invoker = true)
AS
SELECT
  c.id AS client_id,
  c.client_code,
  c.client_name,
  c.city,
  s.code AS series_code,
  c.header_balance,
  COALESCE(SUM(e.amount_due), 0)      AS total_due,
  COALESCE(SUM(e.amount_received), 0) AS total_received,
  c.header_balance
    + COALESCE(SUM(e.amount_due), 0)
    - COALESCE(SUM(e.amount_received), 0) AS current_balance,
  COUNT(e.id) AS entry_count
FROM public.clients c
LEFT JOIN public.series s ON s.id = c.series_id
LEFT JOIN public.ledger_entries e ON e.client_id = c.id
GROUP BY c.id, c.client_code, c.client_name, c.city, s.code, c.header_balance;

-- ------------------------------------------------------------
-- VIEW / RPC helper: stage payment status by TM (for future CMS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_stage_payment_status(p_tm_digits text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  st text;
  paid boolean;
  paid_date date;
  amt numeric;
  eid uuid;
BEGIN
  IF p_tm_digits IS NULL OR p_tm_digits = '' THEN
    RETURN result;
  END IF;

  FOR st IN SELECT unnest(ARRAY['S1','S2','S3','S4']) LOOP
    SELECT
      (COALESCE(SUM(e.amount_received), 0) >= COALESCE(SUM(e.amount_due), 0)
         AND COALESCE(SUM(e.amount_due), 0) > 0),
      MAX(e.entry_date) FILTER (WHERE e.entry_type = 'receiving'),
      COALESCE(SUM(e.amount_received), 0),
      (ARRAY_AGG(e.id ORDER BY e.entry_date DESC, e.created_at DESC)
         FILTER (WHERE e.entry_type = 'receiving'))[1]
    INTO paid, paid_date, amt, eid
    FROM public.cases c
    JOIN public.ledger_entries e ON e.case_id = c.id
    WHERE c.tm_no_normalized = p_tm_digits
      AND e.stage = st;

    result := result || jsonb_build_object(
      st, jsonb_build_object(
        'paid', COALESCE(paid, false),
        'paid_date', paid_date,
        'amount_received', COALESCE(amt, 0),
        'entry_id', eid
      )
    );
  END LOOP;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_stage_payment_status IS
  'Returns stage payment status for a normalized TM number. Intended for Brandex-Database-CMS integration.';

-- ------------------------------------------------------------
-- RLS (baseline — will be tightened with Auth later)
-- ------------------------------------------------------------
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_stage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Temporary open policies for development (replace with staff Auth later)
CREATE POLICY "dev_select_series" ON public.series FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dev_all_series" ON public.series FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_select_clients" ON public.clients FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dev_all_clients" ON public.clients FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_select_rates" ON public.client_stage_rates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dev_all_rates" ON public.client_stage_rates FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_select_cases" ON public.cases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dev_all_cases" ON public.cases FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_select_ledger" ON public.ledger_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dev_all_ledger" ON public.ledger_entries FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_tm(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text) TO anon, authenticated;

COMMIT;
