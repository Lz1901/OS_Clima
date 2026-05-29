-- Add periodicidade (frequency) and proxima_execucao (next due date) to pmocs
ALTER TABLE public.pmocs
  ADD COLUMN IF NOT EXISTS periodicidade text,
  ADD COLUMN IF NOT EXISTS proxima_execucao date,
  ADD COLUMN IF NOT EXISTS pmoc_origem_id uuid;

-- Helper to compute next due date based on frequency
CREATE OR REPLACE FUNCTION public.calc_proxima_execucao(_base date, _periodicidade text)
RETURNS date
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _periodicidade
    WHEN 'mensal'     THEN _base + INTERVAL '1 month'
    WHEN 'quinzenal'  THEN _base + INTERVAL '15 days'
    WHEN 'bimestral'  THEN _base + INTERVAL '2 months'
    WHEN 'trimestral' THEN _base + INTERVAL '3 months'
    WHEN 'semestral'  THEN _base + INTERVAL '6 months'
    WHEN 'anual'      THEN _base + INTERVAL '1 year'
    ELSE NULL
  END::date
$$;

-- Backfill proxima_execucao for existing rows that have periodicity + agendada
UPDATE public.pmocs
   SET proxima_execucao = public.calc_proxima_execucao(data_agendada, periodicidade)
 WHERE periodicidade IS NOT NULL
   AND data_agendada IS NOT NULL
   AND proxima_execucao IS NULL;
