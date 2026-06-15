ALTER TABLE public.pending_invites
  ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid();

UPDATE public.pending_invites SET token = gen_random_uuid() WHERE token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pending_invites_token_key ON public.pending_invites(token);