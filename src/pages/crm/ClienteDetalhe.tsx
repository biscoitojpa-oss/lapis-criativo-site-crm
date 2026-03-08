import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, FilePlus, Phone, Mail, MapPin, Building } from "lucide-react";

const ClienteDetalhe = () => {
  const { clienteId } = useParams<{ clienteId: string }>();
  const [cliente, setCliente] = useState<any>(null);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) return;
    Promise.all([
      supabase.from("clientes").select("*").eq("id", clienteId).single(),
      supabase.from("propostas").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: false }),
      supabase.from("contratos").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: false }),
    ]).then(([cRes, pRes, ctRes]) => {
      setCliente(cRes.data);
      setPropostas(pRes.data || []);
      setContratos(ctRes.data || []);
      setLoading(false);
    });
  }, [clienteId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!cliente) return <div className="p-8 text-center">Cliente não encontrado</div>;

  const statusColors: Record<string, string> = {
    rascunho: "bg-muted text-muted-foreground",
    enviada: "bg-blue-500/20 text-blue-400",
    aprovada: "bg-green-500/20 text-green-400",
    recusada: "bg-destructive/20 text-destructive",
    cancelada: "bg-muted text-muted-foreground",
    ativo: "bg-green-500/20 text-green-400",
    encerrado: "bg-muted text-muted-foreground",
    suspenso: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <div className="space-y-6">
      <Link to="/crm/clientes" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info do Cliente */}
        <div className="glass-card p-6 space-y-4">
          <h1 className="font-display text-xl font-bold">{cliente.nome}</h1>
          {cliente.empresa && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building className="w-4 h-4" />{cliente.empresa}</div>}
          {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><a href={`mailto:${cliente.email}`} className="hover:text-primary">{cliente.email}</a></div>}
          {cliente.whatsapp && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`} target="_blank" className="text-green-500 hover:underline">{cliente.whatsapp}</a></div>}
          {cliente.cidade && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" />{cliente.cidade}{cliente.estado ? ` - ${cliente.estado}` : ""}</div>}
          {cliente.cnpj_cpf && <div className="text-sm text-muted-foreground">CNPJ/CPF: {cliente.cnpj_cpf}</div>}
          {cliente.observacoes && <div className="text-sm text-muted-foreground border-t border-border/50 pt-4">{cliente.observacoes}</div>}
          
          <div className="flex gap-2 pt-4">
            <Link to={`/crm/propostas/nova?cliente=${clienteId}`}>
              <Button variant="outline" size="sm"><FileText className="w-4 h-4" /> Nova Proposta</Button>
            </Link>
            <Link to={`/crm/contratos/novo?cliente=${clienteId}`}>
              <Button variant="outline" size="sm"><FilePlus className="w-4 h-4" /> Novo Contrato</Button>
            </Link>
          </div>
        </div>

        {/* Propostas */}
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Propostas ({propostas.length})
          </h2>
          {propostas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma proposta emitida.</p>
          ) : (
            <div className="space-y-3">
              {propostas.map((p) => (
                <Link key={p.id} to={`/crm/propostas/${p.id}`} className="block p-3 rounded-lg bg-background/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">#{p.numero} - {p.titulo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[p.status] || ""}`}>{p.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">R$ {Number(p.valor_total).toFixed(2)} • {new Date(p.criado_em).toLocaleDateString("pt-BR")}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contratos */}
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-primary" /> Contratos ({contratos.length})
          </h2>
          {contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contrato gerado.</p>
          ) : (
            <div className="space-y-3">
              {contratos.map((c) => (
                <Link key={c.id} to={`/crm/contratos/${c.id}`} className="block p-3 rounded-lg bg-background/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">#{c.numero} - {c.titulo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[c.status] || ""}`}>{c.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    R$ {Number(c.valor_total).toFixed(2)} • {c.tipo_pagamento === "mensal" ? `${c.duracao_meses} meses` : "Pagamento único"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteDetalhe;
