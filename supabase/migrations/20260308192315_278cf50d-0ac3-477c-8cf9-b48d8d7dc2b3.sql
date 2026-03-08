
ALTER TABLE public.servicos 
  ADD COLUMN prazo_entrega integer DEFAULT NULL,
  ADD COLUMN nivel_complexidade text DEFAULT 'medio',
  ADD COLUMN requer_reuniao boolean DEFAULT false,
  ADD COLUMN entregaveis text DEFAULT NULL,
  ADD COLUMN categoria text DEFAULT NULL;
