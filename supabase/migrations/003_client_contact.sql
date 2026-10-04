ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;
COMMENT ON COLUMN public.clients.email IS 'Client contact email';
COMMENT ON COLUMN public.clients.phone IS 'Client contact phone';
