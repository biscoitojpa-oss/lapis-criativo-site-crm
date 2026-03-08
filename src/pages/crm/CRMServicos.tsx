import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  valor_padrao: number;
  valor_implantacao: number;
  valor_mensal: number;
  valor_anual: number;
  tipo_cobranca: string;
  ativo: boolean;
  prazo_entrega: number | null;
  nivel_complexidade: string | null;
  requer_reuniao: boolean;
  entregaveis: string | null;
  categoria: string | null;
}

const CATEGORIAS = [
  "Design Gráfico", "Marketing Digital", "Desenvolvimento Web",
  "Tráfego Pago", "Google Meu Negócio", "SEO", "Redes Sociais", "Analytics",
];

const complexidadeColors: Record<string, string> = {
  baixo: "bg-green-500/10 text-green-400",
  medio: "bg-yellow-500/10 text-yellow-400",
  alto: "bg-red-500/10 text-red-400",
};

const CRMServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [form, setForm] = useState({
    nome: "", descricao: "", valor_implantacao: "", valor_mensal: "", valor_anual: "",
    tipo_cobranca: "mensal", prazo_entrega: "", nivel_complexidade: "medio",
    requer_reuniao: false, entregaveis: "", categoria: "",
  });

  const load = async () => {
    const { data } = await supabase.from("servicos").select("*").order("nome");
    setServicos((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      valor_implantacao: parseFloat(form.valor_implantacao) || 0,
      valor_mensal: parseFloat(form.valor_mensal) || 0,
      valor_anual: parseFloat(form.valor_anual) || 0,
      valor_padrao: parseFloat(form.valor_mensal) || parseFloat(form.valor_implantacao) || 0,
      tipo_cobranca: form.tipo_cobranca,
      prazo_entrega: form.prazo_entrega ? parseInt(form.prazo_entrega) : null,
      nivel_complexidade: form.nivel_complexidade,
      requer_reuniao: form.requer_reuniao,
      entregaveis: form.entregaveis || null,
      categoria: form.categoria || null,
    };

    if (editing) {
      await supabase.from("servicos").update(payload).eq("id", editing.id);
      toast.success("Serviço atualizado");
    } else {
      await supabase.from("servicos").insert(payload);
      toast.success("Serviço criado");
    }
    setDialogOpen(false);
    setEditing(null);
    resetForm();
    load();
  };

  const resetForm = () => setForm({
    nome: "", descricao: "", valor_implantacao: "", valor_mensal: "", valor_anual: "",
    tipo_cobranca: "mensal", prazo_entrega: "", nivel_complexidade: "medio",
    requer_reuniao: false, entregaveis: "", categoria: "",
  });

  const handleEdit = (s: Servico) => {
    setEditing(s);
    setForm({
      nome: s.nome, descricao: s.descricao || "",
      valor_implantacao: String(s.valor_implantacao || 0),
      valor_mensal: String(s.valor_mensal || 0),
      valor_anual: String(s.valor_anual || 0),
      tipo_cobranca: s.tipo_cobranca,
      prazo_entrega: s.prazo_entrega ? String(s.prazo_entrega) : "",
      nivel_complexidade: s.nivel_complexidade || "medio",
      requer_reuniao: s.requer_reuniao ?? false,
      entregaveis: s.entregaveis || "", categoria: s.categoria || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    await supabase.from("servicos").delete().eq("id", id);
    toast.success("Serviço excluído");
    load();
  };

  const openNew = () => { setEditing(null); resetForm(); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">Cadastro de serviços da agência</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openNew}><Plus className="w-4 h-4" /> Novo Serviço</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Col 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Gestão de Redes Sociais" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o serviço..." className="bg-background/50" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Cobrança</label>
                  <select value={form.tipo_cobranca} onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
                    <option value="mensal">Mensal</option>
                    <option value="unico">Único / Projeto</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Implantação (R$)</label>
                    <Input type="number" step="0.01" value={form.valor_implantacao} onChange={(e) => setForm({ ...form, valor_implantacao: e.target.value })} placeholder="0.00" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mensal (R$)</label>
                    <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} placeholder="0.00" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Anual (R$)</label>
                    <Input type="number" step="0.01" value={form.valor_anual} onChange={(e) => setForm({ ...form, valor_anual: e.target.value })} placeholder="0.00" className="bg-background/50" />
                  </div>
                </div>
              </div>
              {/* Col 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prazo de Entrega (dias)</label>
                  <Input type="number" value={form.prazo_entrega} onChange={(e) => setForm({ ...form, prazo_entrega: e.target.value })} placeholder="Ex: 15" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nível de Complexidade</label>
                  <select value={form.nivel_complexidade} onChange={(e) => setForm({ ...form, nivel_complexidade: e.target.value })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
                    <option value="baixo">Baixo</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background/50 border border-border/50 px-3 py-2.5">
                  <label className="text-sm font-medium">Requer Reunião Inicial</label>
                  <Switch checked={form.requer_reuniao} onCheckedChange={(v) => setForm({ ...form, requer_reuniao: v })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Entregáveis do Serviço</label>
                  <Textarea value={form.entregaveis} onChange={(e) => setForm({ ...form, entregaveis: e.target.value })} placeholder={"Ex:\nCriação de layout\nEntrega de arquivos finais\nManual de uso da marca"} className="bg-background/50" rows={6} />
                </div>
              </div>
            </div>
            <Button variant="hero" className="w-full mt-2" onClick={handleSave}>Salvar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : servicos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum serviço cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Categoria</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Implantação</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Mensal</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prazo</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Complexidade</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-3 px-4 font-medium">{s.nome}</td>
                  <td className="py-3 px-4 text-muted-foreground">{s.categoria || "—"}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs capitalize">{s.tipo_cobranca.replace("_", " ")}</span>
                  </td>
                  <td className="py-3 px-4 text-right">R$ {Number(s.valor_implantacao || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">R$ {Number(s.valor_mensal || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">{s.prazo_entrega ? `${s.prazo_entrega}d` : "—"}</td>
                  <td className="py-3 px-4">
                    {s.nivel_complexidade ? (
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${complexidadeColors[s.nivel_complexidade] || ""}`}>
                        {s.nivel_complexidade}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CRMServicos;
