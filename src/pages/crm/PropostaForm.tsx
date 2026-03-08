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

const PropostaForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get("cliente") || "";
  const { user } = useAuth();

  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [form, setForm] = useState({
    cliente_id: clienteIdParam,
    titulo: "",
    descricao: "",
    validade_dias: "15",
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
  }, []);

  const addItem = () => {
    setItens([...itens, { servico_id: "", descricao: "", quantidade: 1, valor_unitario: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...itens];
    (updated[index] as any)[field] = value;
    if (field === "servico_id" && value) {
      const servico = servicos.find((s) => s.id === value);
      if (servico) {
        updated[index].descricao = servico.nome;
        updated[index].valor_unitario = Number(servico.valor_padrao);
      }
    }
    setItens(updated);
  };

  const removeItem = (index: number) => setItens(itens.filter((_, i) => i !== index));

  const valorTotal = itens.reduce((sum, item) => sum + item.quantidade * item.valor_unitario, 0);

  const handleSave = async () => {
    if (!form.cliente_id || !form.titulo) { toast.error("Preencha cliente e título"); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    setSaving(true);

    const { data: proposta, error } = await supabase.from("propostas").insert({
      cliente_id: form.cliente_id,
      criado_por: user!.id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      validade_dias: parseInt(form.validade_dias),
      observacoes: form.observacoes || null,
      valor_total: valorTotal,
    }).select().single();

    if (error || !proposta) {
      toast.error("Erro ao criar proposta");
      setSaving(false);
      return;
    }

    const itensPayload = itens.map((item) => ({
      proposta_id: proposta.id,
      servico_id: item.servico_id || null,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.quantidade * item.valor_unitario,
    }));

    await supabase.from("proposta_itens").insert(itensPayload);
    toast.success("Proposta criada com sucesso!");
    navigate(`/crm/propostas/${proposta.id}`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/crm/propostas" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold">Nova Proposta</h1>

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
            <label className="block text-sm font-medium mb-1">Validade (dias)</label>
            <Input type="number" value={form.validade_dias} onChange={(e) => setForm({ ...form, validade_dias: e.target.value })} className="bg-background/50" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Proposta de Marketing Digital" className="bg-background/50" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva a proposta..." className="bg-background/50" rows={3} />
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Itens da Proposta</h2>
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4" /> Adicionar Item</Button>
        </div>

        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado. Clique em "Adicionar Item".</p>
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
                  <Input value={item.descricao} onChange={(e) => updateItem(index, "descricao", e.target.value)} className="h-9 text-sm" placeholder="Descrição" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium mb-1">Qtd</label>
                  <Input type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(index, "quantidade", parseInt(e.target.value) || 1)} className="h-9 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Valor Unit.</label>
                  <Input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(index, "valor_unitario", parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                </div>
                <div className="col-span-1 text-right text-sm font-medium pt-5">
                  R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                </div>
                <div className="col-span-1 text-right pt-5">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
            <div className="text-right text-lg font-bold pt-4 border-t border-border/50">
              Total: R$ {valorTotal.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <label className="block text-sm font-medium mb-1">Observações</label>
        <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Condições, prazos..." className="bg-background/50" rows={3} />
      </div>

      <div className="flex gap-4">
        <Button variant="hero" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Criar Proposta"}
        </Button>
      </div>
    </div>
  );
};

export default PropostaForm;
