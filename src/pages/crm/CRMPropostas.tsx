import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

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

  useEffect(() => {
    supabase.from("propostas").select("*, clientes(nome)").order("criado_em", { ascending: false }).then(({ data }) => {
      setPropostas(data || []);
      setLoading(false);
    });
  }, []);

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

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : propostas.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma proposta emitida.
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
              {propostas.map((p) => (
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
