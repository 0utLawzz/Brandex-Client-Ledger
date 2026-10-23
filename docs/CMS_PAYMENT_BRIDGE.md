# CMS payment status bridge

The Client Ledger remains authoritative for client charges and receivings. Brandex Database CMS calls its existing `get_stage_payment_status(p_tm_digits)` RPC through this Ledger-side Edge Function; only aggregate stage status is returned.

## Security and setup

- The function accepts `POST` only and requires `x-brandex-ledger-integration-secret`.
- The shared secret belongs in Supabase Edge Function secrets on both the Ledger and CMS projects. Never put it in frontend source, a `VITE_*` setting, or a committed `.env`.
- The function uses Ledger's built-in server-side service-role key only to call the read-status RPC. The service-role key never leaves the Ledger function.
- Apply `cms_stage_payment_bridge` so the service role can execute the two existing status RPCs, then deploy:

```sh
supabase db push
supabase secrets set CMS_LEDGER_INTEGRATION_SECRET=<secret>
supabase functions deploy cms-payment-status --no-verify-jwt
```

JWT verification is disabled only because CMS authenticates the server request with the separate shared secret. Requests from a browser or without that secret receive `401`.

## Response

Request body:

```json
{ "tm_digits": ["012345", "654321"] }
```

Response body:

```json
{ "payments": { "012345": { "S1": { "paid": true, "amount_due": 5000 } } }
```

The function does not write Ledger rows or alter the standalone Ledger UI.
