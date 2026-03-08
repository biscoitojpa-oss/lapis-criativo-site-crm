import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-blue-500/20 text-blue-400",
  aprovada: "bg-green-500/20 text-green-400",
  recusada: "bg-destructive/20 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
};

const CRMPropostas = () => {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    supabase.from("propostas").select("*, clientes(nome)").order("criado_em", { ascending: false }).then(({ data }) => {
      setPropostas(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = propostas.filter((p) => {
    const matchSearch =
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      String(p.numero).includes(search) ||
      ((p.clientes as any)?.nome || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">Propostas emitidas para clientes</p>
        </div>
        <Link to="/crm/propostas/nova">
          <Button variant="hero"><Plus className="w-4 h-4" /> Nova Proposta</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, número ou cliente..." className="pl-10 bg-background/50 border-border/50" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-background/50 border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="recusada">Recusada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma proposta encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Título</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/20 hover:bg-muted/10 cursor-pointer" onClick={() => window.location.href = `/crm/propostas/${p.id}`}>
                  <td className="py-3 px-4 text-muted-foreground">#{p.numero}</td>
                  <td className="py-3 px-4 font-medium">{p.titulo}</td>
                  <td className="py-3 px-4 text-muted-foreground">{(p.clientes as any)?.nome || "—"}</td>
                  <td className="py-3 px-4">R$ {Number(p.valor_total).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusColors[p.status] || ""}`}>{p.status}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(p.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CRMPropostas;
