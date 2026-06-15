
-- Função genérica de auditoria por entidade
CREATE OR REPLACE FUNCTION public.log_entity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  ELSE -- UPDATE
    v_company_id := NEW.company_id;
    v_entity_id  := NEW.id;
    v_acao       := 'editou';
    -- Detecta finalização de PMOC
    IF v_entidade = 'pmoc'
       AND NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status = 'finalizada' THEN
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
$$;

-- Triggers (drop-if-exists para idempotência)
DROP TRIGGER IF EXISTS trg_audit_clientes ON public.clientes;
CREATE TRIGGER trg_audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('cliente');

DROP TRIGGER IF EXISTS trg_audit_unidades ON public.unidades;
CREATE TRIGGER trg_audit_unidades
AFTER INSERT OR UPDATE OR DELETE ON public.unidades
FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('unidade');

DROP TRIGGER IF EXISTS trg_audit_equipamentos ON public.equipamentos;
CREATE TRIGGER trg_audit_equipamentos
AFTER INSERT OR UPDATE OR DELETE ON public.equipamentos
FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('equipamento');

DROP TRIGGER IF EXISTS trg_audit_pmocs ON public.pmocs;
CREATE TRIGGER trg_audit_pmocs
AFTER INSERT OR UPDATE OR DELETE ON public.pmocs
FOR EACH ROW EXECUTE FUNCTION public.log_entity_change('pmoc');
