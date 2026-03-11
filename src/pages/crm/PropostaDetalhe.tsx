import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, FilePlus, Download, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { generatePropostaPDF } from "@/lib/pdf-generator";
import EnviarPropostaDialog from "@/components/EnviarPropostaDialog";
import EnviarPropostaWhatsAppDialog from "@/components/EnviarPropostaWhatsAppDialog";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-blue-500/20 text-blue-400",
  aprovada: "bg-green-500/20 text-green-400",
  recusada: "bg-destructive/20 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
};

const PropostaDetalhe = () => {
  const { propostaId } = useParams<{ propostaId: string }>();
  const navigate = useNavigate();
  const [proposta, setProposta] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [configPag, setConfigPag] = useState<any>(null);

  useEffect(() => {
    if (!propostaId) return;
    Promise.all([
      supabase.from("propostas").select("*, clientes(nome, empresa, email, whatsapp)").eq("id", propostaId).single(),
      supabase.from("proposta_itens").select("*, servicos(nome, prazo_entrega, nivel_complexidade, entregaveis, requer_reuniao, categoria)").eq("proposta_id", propostaId),
      supabase.from("config_pagamentos").select("*").limit(1).single(),
    ]).then(([pRes, iRes, pagRes]) => {
      setProposta(pRes.data);
      setItens(iRes.data || []);
      if (pagRes.data) setConfigPag(pagRes.data);
      setLoading(false);
    });
  }, [propostaId]);

  const updateStatus = async (status: string) => {
    await supabase.from("propostas").update({ status } as any).eq("id", propostaId!);
    setProposta({ ...proposta, status });
    toast.success(`Status atualizado para ${status}`);
  };

  const gerarContrato = () => {
    navigate(`/crm/contratos/novo?proposta=${propostaId}&cliente=${proposta.cliente_id}`);
  };

  const handleDownloadPDF = () => {
    generatePropostaPDF(proposta, itens, proposta.clientes, configPag);
    toast.success("PDF gerado com sucesso!");
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!proposta) return <div className="p-8 text-center">Proposta não encontrada</div>;

  const cliente = proposta.clientes;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/crm/propostas" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            Proposta #{proposta.numero}
          </h1>
          <p className="text-muted-foreground">{proposta.titulo}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm capitalize ${statusColors[proposta.status] || ""}`}>{proposta.status}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h2 className="font-semibold text-lg">Dados da Proposta</h2>
          <div className="text-sm space-y-2">
            <div><span className="text-muted-foreground">Cliente:</span> {cliente?.nome}</div>
            {cliente?.empresa && <div><span className="text-muted-foreground">Empresa:</span> {cliente.empresa}</div>}
            <div><span className="text-muted-foreground">Validade:</span> {proposta.validade_dias} dias</div>
            <div><span className="text-muted-foreground">Data:</span> {new Date(proposta.criado_em).toLocaleDateString("pt-BR")}</div>
            {proposta.descricao && <div className="border-t border-border/50 pt-2">{proposta.descricao}</div>}
            {proposta.observacoes && <div className="border-t border-border/50 pt-2 text-muted-foreground">{proposta.observacoes}</div>}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-semibold text-lg mb-3">Ações</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4" /> Baixar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Send className="w-4 h-4" /> Enviar por Email
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWhatsappOpen(true)} className="text-green-500 border-green-500/30 hover:bg-green-500/10">
              <MessageSquare className="w-4 h-4" /> Enviar por WhatsApp
            </Button>
            {proposta.status === "rascunho" && <Button variant="outline" size="sm" onClick={() => updateStatus("enviada")}>Marcar como Enviada</Button>}
            {proposta.status === "enviada" && (
              <>
                <Button variant="default" size="sm" onClick={() => updateStatus("aprovada")} className="bg-green-600 hover:bg-green-700">Aprovar</Button>
                <Button variant="destructive" size="sm" onClick={() => updateStatus("recusada")}>Recusar</Button>
              </>
            )}
            {proposta.status === "aprovada" && (
              <Button variant="hero" size="sm" onClick={gerarContrato}><FilePlus className="w-4 h-4" /> Gerar Contrato</Button>
            )}
            {!["cancelada", "recusada"].includes(proposta.status) && (
              <Button variant="ghost" size="sm" onClick={() => updateStatus("cancelada")} className="text-destructive">Cancelar</Button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold text-lg mb-4">Itens da Proposta</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 px-3 text-muted-foreground">Descrição</th>
              <th className="text-center py-2 px-3 text-muted-foreground">Qtd</th>
              <th className="text-right py-2 px-3 text-muted-foreground">Valor Unit.</th>
              <th className="text-right py-2 px-3 text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-border/20">
                <td className="py-2 px-3">{item.descricao}</td>
                <td className="py-2 px-3 text-center">{item.quantidade}</td>
                <td className="py-2 px-3 text-right">R$ {Number(item.valor_unitario).toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-medium">R$ {Number(item.valor_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/50">
              <td colSpan={3} className="py-3 px-3 text-right font-semibold">Total:</td>
              <td className="py-3 px-3 text-right font-bold text-lg">R$ {Number(proposta.valor_total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {proposta && (
        <EnviarPropostaDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          proposta={proposta}
          cliente={cliente}
          itens={itens}
        />
      )}
    </div>
  );
};

export default PropostaDetalhe;
