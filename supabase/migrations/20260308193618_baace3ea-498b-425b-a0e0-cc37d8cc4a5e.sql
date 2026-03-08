
CREATE TABLE public.config_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_pix text,
  nome_recebedor text,
  banco text,
  link_pagamento_cartao text,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.config_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage config_pagamentos" ON public.config_pagamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view config_pagamentos" ON public.config_pagamentos
  FOR SELECT TO anon USING (true);

-- Insert a default row
INSERT INTO public.config_pagamentos (chave_pix, nome_recebedor, banco, link_pagamento_cartao)
VALUES ('', '', '', '');
