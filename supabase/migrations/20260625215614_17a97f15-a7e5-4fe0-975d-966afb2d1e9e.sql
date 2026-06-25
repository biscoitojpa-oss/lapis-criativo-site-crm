CREATE TABLE public.agente_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  acao TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.agente_audit_log TO authenticated;
GRANT ALL ON public.agente_audit_log TO service_role;

ALTER TABLE public.agente_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver auditoria do agente"
ON public.agente_audit_log FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Autenticados podem inserir auditoria do agente"
ON public.agente_audit_log FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agente_audit_log;