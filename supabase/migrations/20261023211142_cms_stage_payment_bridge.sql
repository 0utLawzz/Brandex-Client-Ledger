-- Allow only the Ledger-side read-only CMS Edge Function to execute these
-- SECURITY INVOKER RPCs with the server's service_role JWT. The function
-- exposes no database writes and the service key never leaves the Ledger.
BEGIN;

GRANT EXECUTE ON FUNCTION public.ledger_case_stage_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_stage_payment_status(text) TO service_role;

COMMIT;
