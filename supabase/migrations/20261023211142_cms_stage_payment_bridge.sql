-- Restrict the Ledger payment status RPC to the trusted CMS Edge Function.
-- The existing SECURITY DEFINER RPC returns payment amounts and receipt data,
-- so it must not remain callable by anon or authenticated clients.
BEGIN;

REVOKE ALL ON FUNCTION public.get_stage_payment_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text) TO service_role;

COMMIT;
