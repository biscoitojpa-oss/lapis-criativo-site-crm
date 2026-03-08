import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Briefcase } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  empresa: string | null;
  cnpj_cpf: string | null;
  cidade: string | null;
  ativo: boolean;
}

const CRMClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", whatsapp: "", empresa: "",
    cnpj_cpf: "", endereco: "", cidade: "", estado: "", cep: "", observacoes: "",
  });

  const load = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    await supabase.from("clientes").insert(form);
    toast.success("Cliente cadastrado");
    setDialogOpen(false);
    setForm({ nome: "", email: "", telefone: "", whatsapp: "", empresa: "", cnpj_cpf: "", endereco: "", cidade: "", estado: "", cep: "", observacoes: "" });
    load();
  };

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.empresa || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Pasta de clientes da agência</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="w-4 h-4" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do cliente" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(21) 99999-9999" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(21) 99999-9999" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Empresa</label>
                  <Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} placeholder="Nome da empresa" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CNPJ/CPF</label>
                  <Input value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} placeholder="00.000.000/0001-00" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cidade</label>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Rio de Janeiro" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} placeholder="RJ" className="bg-background/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CEP</label>
                  <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" className="bg-background/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, complemento" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o cliente..." className="bg-background/50" rows={3} />
              </div>
              <Button variant="hero" className="w-full" onClick={handleSave}>Salvar Cliente</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-10 bg-background/50 border-border/50" />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum cliente encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">WhatsApp</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cidade</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-3 px-4 font-medium">{c.nome}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.empresa || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.email || "—"}</td>
                  <td className="py-3 px-4">
                    {c.whatsapp ? (
                      <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">{c.whatsapp}</a>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.cidade || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/crm/clientes/${c.id}`}>
                      <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                    </Link>
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

export default CRMClientes;
