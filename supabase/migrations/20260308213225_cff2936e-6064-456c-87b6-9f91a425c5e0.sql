
-- Follow-up scheduling table
CREATE TABLE public.whatsapp_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL,
  nome_contato TEXT,
  mensagem TEXT NOT NULL,
  motivo TEXT DEFAULT 'remarketing',
  instancia TEXT NOT NULL DEFAULT 'default',
  agendado_para TIMESTAMP WITH TIME ZONE NOT NULL,
  enviado_em TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'enviado', 'cancelado', 'erro')),
  erro TEXT,
  criado_por UUID,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  origem TEXT DEFAULT 'manual'
);

-- Enable RLS
ALTER TABLE public.whatsapp_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Auth users can manage whatsapp_followups" ON public.whatsapp_followups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage whatsapp_followups" ON public.whatsapp_followups FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_followups;
