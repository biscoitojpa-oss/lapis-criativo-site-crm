import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, BookOpen, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Item {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  ativo: boolean;
  criado_em: string;
}

const categorias = ["geral", "servicos", "precos", "empresa", "processos", "faq", "objecoes"];

const CRMBaseConhecimento = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", categoria: "geral" });

  const load = async () => {
    const { data } = await supabase.from("base_conhecimento").select("*").order("criado_em", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    if (editingId) {
      await supabase.from("base_conhecimento").update(form as any).eq("id", editingId);
      toast.success("Conhecimento atualizado");
    } else {
      await supabase.from("base_conhecimento").insert(form as any);
      toast.success("Conhecimento adicionado");
    }
    setDialogOpen(false);
    setForm({ titulo: "", conteudo: "", categoria: "geral" });
    setEditingId(null);
    load();
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({ titulo: item.titulo, conteudo: item.conteudo, categoria: item.categoria });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("base_conhecimento").delete().eq("id", id);
    toast.success("Removido");
    load();
  };

  const filtered = items.filter((i) => {
    const matchSearch = i.titulo.toLowerCase().includes(search.toLowerCase()) ||
      i.conteudo.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "todos" || i.categoria === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground">Dados para treinar o agente Criativo X</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm({ titulo: "", conteudo: "", categoria: "geral" }); } }}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="w-4 h-4" /> Novo Conhecimento</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Conhecimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Horário de atendimento" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full h-10 rounded-lg bg-background/50 border border-border/50 px-3 text-sm">
                  {categorias.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Conteúdo *</label>
                <Textarea value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} placeholder="Informação que o agente deve saber..." className="bg-background/50" rows={6} />
              </div>
              <Button variant="hero" className="w-full" onClick={handleSave}>
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10 bg-background/50 border-border/50" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum conhecimento cadastrado.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="glass-card p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{item.titulo}</h3>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">{item.categoria}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-xs h-7">Editar</Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-7 w-7 text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">{item.conteudo}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.criado_em).toLocaleDateString("pt-BR")}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CRMBaseConhecimento;
