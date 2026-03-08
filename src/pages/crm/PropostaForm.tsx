import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Calculator, Clock, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

interface ServicoData {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  valor_implantacao: number;
  valor_mensal: number;
  valor_anual: number;
  tipo_cobranca: string;
  prazo_entrega: number | null;
  nivel_complexidade: string | null;
  entregaveis: string | null;
  requer_reuniao: boolean;
}

const PropostaForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get("cliente") || "";
  const { user } = useAuth();

  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<ServicoData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    cliente_id: clienteIdParam,
    titulo: "",
    descricao: "",
    validade_dias: "15",
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("clientes").select("id, nome").order("nome"),
      supabase.from("servicos").select("*").eq("ativo", true).order("nome"),
    ]).then(([cRes, sRes]) => {
      setClientes(cRes.data || []);
      setServicos((sRes.data as any) || []);
    });
  }, []);

  const toggleServico = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedServicos = useMemo(
    () => servicos.filter((s) => selectedIds.has(s.id)),
    [servicos, selectedIds]
  );

  const totals = useMemo(() => {
    let implantacao = 0, mensal = 0, anual = 0;
    for (const s of selectedServicos) {
      implantacao += Number(s.valor_implantacao || 0);
      mensal += Number(s.valor_mensal || 0);
      anual += Number(s.valor_anual || 0);
    }
    return { implantacao, mensal, anual, geral: implantacao + mensal };
  }, [selectedServicos]);

  const handleSave = async () => {
    if (!form.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (!form.titulo) { toast.error("Preencha o título"); return; }
    if (selectedServicos.length === 0) { toast.error("Selecione pelo menos um serviço"); return; }
    setSaving(true);

    const { data: proposta, error } = await supabase.from("propostas").insert({
      cliente_id: form.cliente_id,
      criado_por: user!.id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      validade_dias: parseInt(form.validade_dias),
      observacoes: form.observacoes || null,
      valor_total: totals.geral,
    }).select().single();

    if (error || !proposta) {
      toast.error("Erro ao criar proposta");
      setSaving(false);
      return;
    }

    const itensPayload = selectedServicos.map((s) => ({
      proposta_id: proposta.id,
      servico_id: s.id,
      descricao: s.nome,
      quantidade: 1,
      valor_unitario: Number(s.valor_implantacao || 0) + Number(s.valor_mensal || 0),
      valor_total: Number(s.valor_implantacao || 0) + Number(s.valor_mensal || 0),
    }));

    await supabase.from("proposta_itens").insert(itensPayload);
    toast.success("Proposta criada com sucesso!");
    navigate(`/crm/propostas/${proposta.id}`);
  };

  // Group services by category
  const grouped = useMemo(() => {
    const map: Record<string, ServicoData[]> = {};
    for (const s of servicos) {
      const cat = s.categoria || "Outros";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [servicos]);

  return (
    <div className="space-y-6">
      <Link to="/crm/propostas" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold">Nova Proposta</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
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
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva a proposta..." className="bg-background/50" rows={2} />
            </div>
          </div>

          {/* Service selection */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" /> Selecione os Serviços
              </h2>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
            </div>

            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço ativo cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {grouped.map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
                    <div className="space-y-1">
                      {items.map((s) => {
                        const selected = selectedIds.has(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleServico(s.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              selected ? "bg-primary/10 border border-primary/30" : "bg-background/50 border border-border/30 hover:border-border"
                            }`}
                          >
                            <Checkbox checked={selected} className="pointer-events-none" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{s.nome}</div>
                              {s.descricao && <div className="text-xs text-muted-foreground truncate">{s.descricao}</div>}
                            </div>
                            <div className="flex gap-4 text-xs text-right shrink-0">
                              {Number(s.valor_implantacao) > 0 && (
                                <div>
                                  <div className="text-muted-foreground">Implantação</div>
                                  <div className="font-medium">R$ {Number(s.valor_implantacao).toFixed(2)}</div>
                                </div>
                              )}
                              {Number(s.valor_mensal) > 0 && (
                                <div>
                                  <div className="text-muted-foreground">Mensal</div>
                                  <div className="font-medium">R$ {Number(s.valor_mensal).toFixed(2)}</div>
                                </div>
                              )}
                              {s.prazo_entrega && (
                                <div>
                                  <div className="text-muted-foreground">Prazo</div>
                                  <div className="font-medium">{s.prazo_entrega}d</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected services detail */}
          {selectedServicos.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Serviços Incluídos</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground">Serviço</th>
                    <th className="text-left py-2 px-3 text-muted-foreground">Categoria</th>
                    <th className="text-center py-2 px-3 text-muted-foreground">Prazo</th>
                    <th className="text-right py-2 px-3 text-muted-foreground">Implantação</th>
                    <th className="text-right py-2 px-3 text-muted-foreground">Mensal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedServicos.map((s) => (
                    <tr key={s.id} className="border-b border-border/20">
                      <td className="py-2 px-3 font-medium">{s.nome}</td>
                      <td className="py-2 px-3 text-muted-foreground">{s.categoria || "—"}</td>
                      <td className="py-2 px-3 text-center">{s.prazo_entrega ? `${s.prazo_entrega}d` : "—"}</td>
                      <td className="py-2 px-3 text-right">R$ {Number(s.valor_implantacao || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">R$ {Number(s.valor_mensal || 0).toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <Button variant="ghost" size="icon" onClick={() => toggleServico(s.id)} className="h-7 w-7 text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Observações */}
          <div className="glass-card p-6">
            <label className="block text-sm font-medium mb-1">Observações</label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Condições, prazos..." className="bg-background/50" rows={3} />
          </div>

          <Button variant="hero" size="lg" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Criar Proposta"}
          </Button>
        </div>

        {/* Sidebar - Financial Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-6 space-y-5">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Resumo Financeiro
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Implantação</span>
                <span className="font-semibold">R$ {totals.implantacao.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Mensalidade</span>
                <span className="font-semibold">R$ {totals.mensal.toFixed(2)}</span>
              </div>
              {totals.anual > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Anual</span>
                  <span className="font-semibold">R$ {totals.anual.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-3 -mx-1">
                <span className="font-semibold">Total Geral</span>
                <span className="text-lg font-bold text-primary">R$ {totals.geral.toFixed(2)}</span>
              </div>
            </div>

            {selectedServicos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Prazo máximo: {Math.max(...selectedServicos.map((s) => s.prazo_entrega || 0))} dias</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedServicos.length} serviço(s) selecionado(s)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropostaForm;
