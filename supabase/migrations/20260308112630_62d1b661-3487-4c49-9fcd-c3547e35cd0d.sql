-- Tabela para armazenar leads capturados pelas ferramentas de IA
CREATE TABLE public.leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    ferramenta TEXT NOT NULL,
    dados_entrada JSONB,
    resultado_analise JSONB,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar lead"
ON public.leads FOR INSERT WITH CHECK (true);

CREATE POLICY "Apenas admins podem ler leads"
ON public.leads FOR SELECT USING (false);

CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_ferramenta ON public.leads(ferramenta);
CREATE INDEX idx_leads_criado_em ON public.leads(criado_em DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();