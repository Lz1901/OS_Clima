ALTER TABLE public.pmocs DROP CONSTRAINT IF EXISTS pmocs_tecnico_id_fkey;
ALTER TABLE public.pmocs ADD CONSTRAINT pmocs_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';