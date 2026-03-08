-- Serviços da agência
CREATE TABLE public.servicos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_padrao NUMERIC(10,2) DEFAULT 0,
    tipo_cobranca TEXT NOT NULL DEFAULT 'mensal' CHECK (tipo_cobranca IN ('mensal', 'unico', 'por_projeto')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read servicos" ON public.servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert servicos" ON public.servicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update servicos" ON public.servicos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete servicos" ON public.servicos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clientes
CREATE TABLE public.clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    whatsapp TEXT,
    empresa TEXT,
    cnpj_cpf TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Propostas
CREATE TYPE public.proposta_status AS ENUM ('rascunho', 'enviada', 'aprovada', 'recusada', 'cancelada');

CREATE TABLE public.propostas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero SERIAL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    titulo TEXT NOT NULL,
    descricao TEXT,
    status proposta_status NOT NULL DEFAULT 'rascunho',
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    validade_dias INTEGER NOT NULL DEFAULT 15,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read propostas" ON public.propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert propostas" ON public.propostas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update propostas" ON public.propostas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete propostas" ON public.propostas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens da proposta
CREATE TABLE public.proposta_itens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    servico_id UUID REFERENCES public.servicos(id),
    descricao TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage proposta_itens" ON public.proposta_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contratos
CREATE TYPE public.contrato_status AS ENUM ('ativo', 'encerrado', 'cancelado', 'suspenso');
CREATE TYPE public.tipo_pagamento AS ENUM ('mensal', 'unico');

CREATE TABLE public.contratos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero SERIAL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    proposta_id UUID REFERENCES public.propostas(id),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    titulo TEXT NOT NULL,
    descricao TEXT,
    status contrato_status NOT NULL DEFAULT 'ativo',
    tipo_pagamento tipo_pagamento NOT NULL DEFAULT 'mensal',
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_mensal NUMERIC(10,2) DEFAULT 0,
    duracao_meses INTEGER DEFAULT 12,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update contratos" ON public.contratos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete contratos" ON public.contratos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens do contrato
CREATE TABLE public.contrato_itens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    servico_id UUID REFERENCES public.servicos(id),
    descricao TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.contrato_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage contrato_itens" ON public.contrato_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX idx_clientes_nome ON public.clientes(nome);
CREATE INDEX idx_propostas_cliente ON public.propostas(cliente_id);
CREATE INDEX idx_propostas_status ON public.propostas(status);
CREATE INDEX idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_status ON public.contratos(status);