
-- Enum para tipo de tarefa
CREATE TYPE public.tarefa_tipo AS ENUM ('tarefa', 'reuniao', 'lembrete', 'prazo');

-- Enum para prioridade
CREATE TYPE public.tarefa_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Enum para status da tarefa
CREATE TYPE public.tarefa_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');

-- Tabela principal de tarefas
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo public.tarefa_tipo NOT NULL DEFAULT 'tarefa',
  prioridade public.tarefa_prioridade NOT NULL DEFAULT 'media',
  status public.tarefa_status NOT NULL DEFAULT 'pendente',
  data_vencimento TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  responsavel_id UUID NOT NULL,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Auth users can manage tarefas"
ON public.tarefas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_tarefas_data_vencimento ON public.tarefas(data_vencimento);
CREATE INDEX idx_tarefas_cliente_id ON public.tarefas(cliente_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
