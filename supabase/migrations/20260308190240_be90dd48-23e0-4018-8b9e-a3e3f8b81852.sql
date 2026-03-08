ALTER TABLE public.whatsapp_mensagens ADD COLUMN IF NOT EXISTS humano_ativo boolean NOT NULL DEFAULT false;

-- Table to track human handoff per phone
CREATE TABLE IF NOT EXISTS public.whatsapp_handoff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  ativado_em timestamp with time zone NOT NULL DEFAULT now(),
  desativado_em timestamp with time zone
);

ALTER TABLE public.whatsapp_handoff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage whatsapp_handoff" ON public.whatsapp_handoff FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service can manage whatsapp_handoff" ON public.whatsapp_handoff FOR ALL TO service_role USING (true) WITH CHECK (true);