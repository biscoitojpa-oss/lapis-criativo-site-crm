import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FilePlus, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  ativo: "bg-blue-500/20 text-blue-400",
  encerrado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/20 text-destructive",
  suspenso: "bg-yellow-500/20 text-yellow-400",
};

const statusLabels: Record<string, string> = {
  ativo: "Gerado",
  encerrado: "Encerrado",
  cancelado: "Desistiu",
  suspenso: "Suspenso",
};

const CRMContratos = () => {
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");

  useEffect(() => {
    supabase.from("contratos").select("*, clientes(nome)").order("criado_em", { ascending: false }).then(({ data }) => {
      setContratos(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = contratos.filter((c) => {
    const matchSearch =
      c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      String(c.numero).includes(search) ||
      ((c.clientes as any)?.nome || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    const matchTipo = tipoFilter === "todos" || c.tipo_pagamento === tipoFilter;
    return matchSearch && matchStatus && matchTipo;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Contratos ativos e histórico</p>
        </div>
        <Link to="/crm/contratos/novo">
          <Button variant="hero"><Plus className="w-4 h-4" /> Novo Contrato</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, número ou cliente..." className="pl-10 bg-background/50 border-border/50" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[150px] bg-background/50 border-border/50">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="unico">Único</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FilePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum contrato encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Título</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Início</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/20 hover:bg-muted/10 cursor-pointer" onClick={() => window.location.href = `/crm/contratos/${c.id}`}>
                  <td className="py-3 px-4 text-muted-foreground">#{c.numero}</td>
                  <td className="py-3 px-4 font-medium">{c.titulo}</td>
                  <td className="py-3 px-4 text-muted-foreground">{(c.clientes as any)?.nome || "—"}</td>
                  <td className="py-3 px-4">R$ {Number(c.valor_total).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs capitalize">{c.tipo_pagamento}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusColors[c.status] || ""}`}>{c.status}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(c.data_inicio).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CRMContratos;
