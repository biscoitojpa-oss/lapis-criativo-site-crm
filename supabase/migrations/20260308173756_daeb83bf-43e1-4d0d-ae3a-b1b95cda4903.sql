
ALTER TABLE public.contratos 
  ADD COLUMN IF NOT EXISTS assinatura_cliente text,
  ADD COLUMN IF NOT EXISTS assinado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS token_assinatura uuid DEFAULT gen_random_uuid();

-- Allow public access to view contract for signing (by token)
CREATE POLICY "Public can view contract by token" ON public.contratos
  FOR SELECT TO anon
  USING (token_assinatura IS NOT NULL);

-- Allow public to update signature
CREATE POLICY "Public can sign contract by token" ON public.contratos
  FOR UPDATE TO anon
  USING (token_assinatura IS NOT NULL AND assinatura_cliente IS NULL)
  WITH CHECK (token_assinatura IS NOT NULL);

-- Allow anon to read contract items for signing page
CREATE POLICY "Public can view contrato_itens" ON public.contrato_itens
  FOR SELECT TO anon
  USING (true);

-- Allow anon to read client name for signing page
CREATE POLICY "Public can view clientes for signing" ON public.clientes
  FOR SELECT TO anon
  USING (true);
