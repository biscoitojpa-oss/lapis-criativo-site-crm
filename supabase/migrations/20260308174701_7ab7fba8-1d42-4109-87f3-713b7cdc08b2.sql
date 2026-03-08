
-- Notifications table
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  link text,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Trigger function: notify all team members when contract is signed
CREATE OR REPLACE FUNCTION public.notify_contract_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _contrato RECORD;
  _cliente RECORD;
  _user RECORD;
BEGIN
  -- Only trigger when assinatura_cliente changes from NULL to a value
  IF OLD.assinatura_cliente IS NULL AND NEW.assinatura_cliente IS NOT NULL THEN
    SELECT nome INTO _cliente FROM public.clientes WHERE id = NEW.cliente_id;
    
    -- Notify all team members
    FOR _user IN SELECT DISTINCT p.user_id FROM public.profiles p
    LOOP
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
      VALUES (
        _user.user_id,
        'Contrato Assinado!',
        'O cliente ' || COALESCE(_cliente.nome, 'N/A') || ' assinou o contrato #' || NEW.numero,
        'assinatura',
        '/crm/contratos/' || NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_contract_signed
  AFTER UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contract_signed();
