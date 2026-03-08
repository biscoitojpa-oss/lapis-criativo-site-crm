
-- Knowledge base table for AI agent
CREATE TABLE public.base_conhecimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  categoria text NOT NULL DEFAULT 'geral',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage base_conhecimento" ON public.base_conhecimento
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add contrato status labels (Gerado, Enviado, Assinado, Desistiu)
-- Already handled by existing contrato_status enum, we just need UI changes

-- Ensure proposta/contrato numbers auto-increment (already using sequences)
