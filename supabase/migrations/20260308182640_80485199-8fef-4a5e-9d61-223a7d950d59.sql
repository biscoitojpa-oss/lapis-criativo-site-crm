
CREATE TABLE public.whatsapp_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  nome_contato text,
  mensagem text NOT NULL,
  direcao text NOT NULL DEFAULT 'enviada',
  instancia text NOT NULL DEFAULT 'default',
  tipo text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'enviada',
  metadata jsonb,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage whatsapp_mensagens" ON public.whatsapp_mensagens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service can insert whatsapp_mensagens" ON public.whatsapp_mensagens
  FOR INSERT TO anon WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensagens;

CREATE INDEX idx_whatsapp_mensagens_telefone ON public.whatsapp_mensagens(telefone);
CREATE INDEX idx_whatsapp_mensagens_criado_em ON public.whatsapp_mensagens(criado_em);
