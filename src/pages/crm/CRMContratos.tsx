import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FilePlus } from "lucide-react";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/20 text-green-400",
  encerrado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/20 text-destructive",
  suspenso: "bg-yellow-500/20 text-yellow-400",
};

const CRMContratos = () => {
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("contratos").select("*, clientes(nome)").order("criado_em", { ascending: false }).then(({ data }) => {
      setContratos(data || []);
      setLoading(false);
    });
  }, []);

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

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : contratos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FilePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhum contrato gerado.
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
              {contratos.map((c) => (
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
