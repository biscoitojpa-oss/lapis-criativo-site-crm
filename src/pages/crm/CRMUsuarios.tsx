import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  cargo: string;
  email?: string;
}

const CRMUsuarios = () => {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", cargo: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("nome");
    setUsuarios((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.nome) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email: form.email, password: form.password, nome: form.nome, cargo: form.cargo },
    });

    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || "Erro ao criar usuário");
      return;
    }
    toast.success("Usuário criado com sucesso");
    setDialogOpen(false);
    setForm({ email: "", password: "", nome: "", cargo: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Membros da equipe com acesso ao CRM</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="w-4 h-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@agencia.com" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Senha *</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cargo</label>
                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Designer, Social Media" className="bg-background/50" />
              </div>
              <Button variant="hero" className="w-full" onClick={handleCreate} disabled={saving}>
                {saving ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cargo</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-3 px-4 font-medium">{u.nome}</td>
                  <td className="py-3 px-4 text-muted-foreground">{u.cargo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CRMUsuarios;
