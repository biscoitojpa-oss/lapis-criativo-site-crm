
-- Anti-ban configuration table (singleton)
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_inicio time NOT NULL DEFAULT '09:00',
  horario_fim time NOT NULL DEFAULT '20:00',
  dias_envio integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  intervalo_min integer NOT NULL DEFAULT 60,
  intervalo_max integer NOT NULL DEFAULT 120,
  digitacao_min integer NOT NULL DEFAULT 2,
  digitacao_max integer NOT NULL DEFAULT 8,
  msgs_antes_descanso integer NOT NULL DEFAULT 10,
  descanso_min integer NOT NULL DEFAULT 7,
  descanso_max integer NOT NULL DEFAULT 10,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage whatsapp_config" ON public.whatsapp_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default config
INSERT INTO public.whatsapp_config (id) VALUES (gen_random_uuid());

-- Message queue table
CREATE TYPE public.fila_status AS ENUM ('pendente', 'processando', 'enviado', 'erro', 'expirado');

CREATE TABLE public.whatsapp_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  mensagem text NOT NULL,
  nome_lead text,
  instancia text NOT NULL DEFAULT 'default',
  status fila_status NOT NULL DEFAULT 'pendente',
  tentativas integer NOT NULL DEFAULT 0,
  max_tentativas integer NOT NULL DEFAULT 3,
  erro text,
  agendado_para timestamp with time zone NOT NULL DEFAULT now(),
  enviado_em timestamp with time zone,
  criado_por uuid NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_fila ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage whatsapp_fila" ON public.whatsapp_fila
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_fila_updated_at
  BEFORE UPDATE ON public.whatsapp_fila
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
