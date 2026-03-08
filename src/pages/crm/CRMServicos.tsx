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

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  valor_padrao: number;
  tipo_cobranca: string;
  ativo: boolean;
}

const CRMServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", valor_padrao: "", tipo_cobranca: "mensal" });

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
      valor_padrao: parseFloat(form.valor_padrao) || 0,
      tipo_cobranca: form.tipo_cobranca,
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
    setForm({ nome: "", descricao: "", valor_padrao: "", tipo_cobranca: "mensal" });
    load();
  };

  const handleEdit = (s: Servico) => {
    setEditing(s);
    setForm({ nome: s.nome, descricao: s.descricao || "", valor_padrao: String(s.valor_padrao), tipo_cobranca: s.tipo_cobranca });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    await supabase.from("servicos").delete().eq("id", id);
    toast.success("Serviço excluído");
    load();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", descricao: "", valor_padrao: "", tipo_cobranca: "mensal" });
    setDialogOpen(true);
  };

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
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Gestão de Redes Sociais" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o serviço..." className="bg-background/50" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valor Padrão (R$)</label>
                  <Input type="number" value={form.valor_padrao} onChange={(e) => setForm({ ...form, valor_padrao: e.target.value })} placeholder="0.00" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Cobrança</label>
                  <select value={form.tipo_cobranca} onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
                    <option value="mensal">Mensal</option>
                    <option value="unico">Único</option>
                    <option value="por_projeto">Por Projeto</option>
                  </select>
                </div>
              </div>
              <Button variant="hero" className="w-full" onClick={handleSave}>Salvar</Button>
            </div>
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
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-3 px-4 font-medium">{s.nome}</td>
                  <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{s.descricao || "—"}</td>
                  <td className="py-3 px-4">R$ {Number(s.valor_padrao).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs capitalize">{s.tipo_cobranca.replace("_", " ")}</span>
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
