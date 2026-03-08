import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ItemForm {
  servico_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

const ContratoForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get("cliente") || "";
  const propostaIdParam = searchParams.get("proposta") || "";
  const { user } = useAuth();

  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [form, setForm] = useState({
    cliente_id: clienteIdParam,
    proposta_id: propostaIdParam || null,
    titulo: "",
    descricao: "",
    tipo_pagamento: "mensal" as "mensal" | "unico",
    duracao_meses: "12",
    data_inicio: new Date().toISOString().split("T")[0],
    observacoes: "",
  });
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("clientes").select("id, nome").order("nome"),
      supabase.from("servicos").select("*").eq("ativo", true).order("nome"),
    ]).then(([cRes, sRes]) => {
      setClientes(cRes.data || []);
      setServicos(sRes.data || []);
    });

    // Pre-fill from proposal
    if (propostaIdParam) {
      Promise.all([
        supabase.from("propostas").select("*").eq("id", propostaIdParam).single(),
        supabase.from("proposta_itens").select("*").eq("proposta_id", propostaIdParam),
      ]).then(([pRes, iRes]) => {
        if (pRes.data) {
          setForm((f) => ({
            ...f,
            titulo: `Contrato - ${pRes.data.titulo}`,
            descricao: pRes.data.descricao || "",
          }));
        }
        if (iRes.data) {
          setItens(iRes.data.map((i: any) => ({
            servico_id: i.servico_id || "",
            descricao: i.descricao,
            quantidade: i.quantidade,
            valor_unitario: Number(i.valor_unitario),
          })));
        }
      });
    }
  }, [propostaIdParam]);

  const addItem = () => setItens([...itens, { servico_id: "", descricao: "", quantidade: 1, valor_unitario: 0 }]);

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...itens];
    (updated[index] as any)[field] = value;
    if (field === "servico_id" && value) {
      const s = servicos.find((s) => s.id === value);
      if (s) { updated[index].descricao = s.nome; updated[index].valor_unitario = Number(s.valor_padrao); }
    }
    setItens(updated);
  };

  const removeItem = (index: number) => setItens(itens.filter((_, i) => i !== index));

  const valorTotal = itens.reduce((sum, i) => sum + i.quantidade * i.valor_unitario, 0);
  const valorMensal = form.tipo_pagamento === "mensal" && parseInt(form.duracao_meses) > 0
    ? valorTotal / parseInt(form.duracao_meses) : 0;

  const handleSave = async () => {
    if (!form.cliente_id) { toast.error("Selecione um cliente cadastrado antes de criar o contrato"); return; }
    if (!form.titulo) { toast.error("Preencha o título"); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    setSaving(true);

    const duracao = parseInt(form.duracao_meses) || 12;
    const dataInicio = new Date(form.data_inicio);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + duracao);

    const { data: contrato, error } = await supabase.from("contratos").insert({
      cliente_id: form.cliente_id,
      proposta_id: form.proposta_id || null,
      criado_por: user!.id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      tipo_pagamento: form.tipo_pagamento,
      valor_total: valorTotal,
      valor_mensal: form.tipo_pagamento === "mensal" ? valorMensal : null,
      duracao_meses: form.tipo_pagamento === "mensal" ? duracao : null,
      data_inicio: form.data_inicio,
      data_fim: form.tipo_pagamento === "mensal" ? dataFim.toISOString().split("T")[0] : null,
      observacoes: form.observacoes || null,
    }).select().single();

    if (error || !contrato) {
      toast.error("Erro ao criar contrato");
      setSaving(false);
      return;
    }

    await supabase.from("contrato_itens").insert(
      itens.map((i) => ({
        contrato_id: contrato.id,
        servico_id: i.servico_id || null,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.quantidade * i.valor_unitario,
      }))
    );

    toast.success("Contrato criado com sucesso!");
    navigate(`/crm/contratos/${contrato.id}`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/crm/contratos" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold">Novo Contrato</h1>

      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente *</label>
            <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Pagamento *</label>
            <select value={form.tipo_pagamento} onChange={(e) => setForm({ ...form, tipo_pagamento: e.target.value as any })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
              <option value="mensal">Mensal (Recorrente)</option>
              <option value="unico">Pagamento Único</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Contrato de Marketing Digital" className="bg-background/50" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data de Início</label>
            <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} className="bg-background/50" />
          </div>
          {form.tipo_pagamento === "mensal" && (
            <div>
              <label className="block text-sm font-medium mb-1">Duração (meses)</label>
              <Input type="number" value={form.duracao_meses} onChange={(e) => setForm({ ...form, duracao_meses: e.target.value })} className="bg-background/50" />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="bg-background/50" rows={3} />
        </div>
      </div>

      {/* Itens */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Itens do Contrato</h2>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4" /> Adicionar</Button>
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum item.</p>
        ) : (
          <div className="space-y-3">
            {itens.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-background/50">
                <div className="col-span-4">
                  <label className="block text-xs font-medium mb-1">Serviço</label>
                  <select value={item.servico_id} onChange={(e) => updateItem(index, "servico_id", e.target.value)} className="w-full h-9 rounded-md bg-background border border-border/50 px-2 text-sm">
                    <option value="">Personalizado</option>
                    {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium mb-1">Descrição</label>
                  <Input value={item.descricao} onChange={(e) => updateItem(index, "descricao", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium mb-1">Qtd</label>
                  <Input type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(index, "quantidade", parseInt(e.target.value) || 1)} className="h-9 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Valor</label>
                  <Input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(index, "valor_unitario", parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                </div>
                <div className="col-span-1 text-right text-sm font-medium pt-5">R$ {(item.quantidade * item.valor_unitario).toFixed(2)}</div>
                <div className="col-span-1 text-right pt-5">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
            <div className="text-right pt-4 border-t border-border/50 space-y-1">
              <div className="text-lg font-bold">Total: R$ {valorTotal.toFixed(2)}</div>
              {form.tipo_pagamento === "mensal" && valorMensal > 0 && (
                <div className="text-sm text-muted-foreground">Valor mensal: R$ {valorMensal.toFixed(2)} × {form.duracao_meses} meses</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <label className="block text-sm font-medium mb-1">Observações</label>
        <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="bg-background/50" rows={3} />
      </div>

      <Button variant="hero" size="lg" onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : "Criar Contrato"}
      </Button>
    </div>
  );
};

export default ContratoForm;
