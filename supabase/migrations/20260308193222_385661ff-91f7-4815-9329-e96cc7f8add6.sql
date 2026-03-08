
ALTER TABLE public.servicos 
  ADD COLUMN IF NOT EXISTS valor_implantacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_anual numeric DEFAULT 0;

-- Migrate existing valor_padrao to valor_mensal for mensal services
UPDATE public.servicos SET valor_mensal = COALESCE(valor_padrao, 0) WHERE tipo_cobranca = 'mensal' AND valor_mensal = 0;
UPDATE public.servicos SET valor_implantacao = COALESCE(valor_padrao, 0) WHERE tipo_cobranca IN ('unico', 'por_projeto') AND valor_implantacao = 0;
