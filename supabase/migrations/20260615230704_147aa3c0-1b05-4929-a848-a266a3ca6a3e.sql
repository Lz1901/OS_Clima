ALTER TYPE public.pmoc_status ADD VALUE IF NOT EXISTS 'finalizada';

CREATE OR REPLACE FUNCTION public.log_entity_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_entity_id  uuid;
  v_acao       text;
  v_entidade   text := TG_ARGV[0];
  v_detalhes   jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
    v_entity_id  := OLD.id;
    v_acao       := 'excluiu';
  ELSIF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_entity_id  := NEW.id;
    v_acao       := 'criou';
  ELSE
    v_company_id := NEW.company_id;
    v_entity_id  := NEW.id;
    v_acao       := 'editou';
    IF v_entidade = 'pmoc'
       AND NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status::text IN ('finalizada','finalizado') THEN
      v_acao := 'finalizou';
      v_detalhes := jsonb_build_object('status_anterior', OLD.status, 'status_novo', NEW.status);
    END IF;
  END IF;

  INSERT INTO public.activity_logs (company_id, user_id, acao, entidade, entidade_id, detalhes)
  VALUES (v_company_id, auth.uid(), v_acao, v_entidade, v_entity_id, v_detalhes);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;