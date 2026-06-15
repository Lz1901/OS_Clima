CREATE OR REPLACE FUNCTION public.log_financial_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.financial_transactions%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
  ELSE
    v_row := NEW;
  END IF;

  INSERT INTO public.activity_logs (company_id, user_id, acao, entidade, entidade_id, detalhes)
  VALUES (
    v_row.company_id,
    auth.uid(),
    TG_OP,
    'financial_transaction',
    v_row.id,
    jsonb_build_object(
      'tipo', v_row.tipo,
      'valor', v_row.valor,
      'descricao', v_row.descricao,
      'status', v_row.status
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_financial_transaction() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_financial_transaction() FROM authenticated;