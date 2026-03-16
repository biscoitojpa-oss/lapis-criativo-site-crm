
CREATE TYPE public.etapa_funil AS ENUM ('prospeccao', 'contato', 'negociacao', 'proposta', 'fechamento');

CREATE TABLE public.pipeline_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  etapa etapa_funil NOT NULL DEFAULT 'prospeccao',
  valor NUMERIC DEFAULT 0,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  observacoes TEXT,
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage pipeline_cards"
  ON public.pipeline_cards FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
