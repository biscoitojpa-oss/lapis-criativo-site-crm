import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FilePlus, Download } from "lucide-react";
import { toast } from "sonner";
import { generateContratoPDF } from "@/lib/pdf-generator";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/20 text-green-400",
  encerrado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/20 text-destructive",
  suspenso: "bg-yellow-500/20 text-yellow-400",
};

const ContratoDetalhe = () => {
  const { contratoId } = useParams<{ contratoId: string }>();
  const [contrato, setContrato] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contratoId) return;
    Promise.all([
      supabase.from("contratos").select("*, clientes(nome, empresa, cnpj_cpf, email)").eq("id", contratoId).single(),
      supabase.from("contrato_itens").select("*").eq("contrato_id", contratoId),
    ]).then(([cRes, iRes]) => {
      setContrato(cRes.data);
      setItens(iRes.data || []);
      setLoading(false);
    });
  }, [contratoId]);

  const updateStatus = async (status: string) => {
    await supabase.from("contratos").update({ status } as any).eq("id", contratoId!);
    setContrato({ ...contrato, status });
    toast.success(`Status atualizado para ${status}`);
  };

  const handleDownloadPDF = () => {
    generateContratoPDF(contrato, itens, contrato.clientes);
    toast.success("PDF gerado com sucesso!");
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!contrato) return <div className="p-8 text-center">Contrato não encontrado</div>;

  const cliente = contrato.clientes;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/crm/contratos" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-3">
            <FilePlus className="w-6 h-6 text-primary" />
            Contrato #{contrato.numero}
          </h1>
          <p className="text-muted-foreground">{contrato.titulo}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm capitalize ${statusColors[contrato.status] || ""}`}>{contrato.status}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h2 className="font-semibold text-lg">Dados do Contrato</h2>
          <div className="text-sm space-y-2">
            <div><span className="text-muted-foreground">Cliente:</span> {cliente?.nome}</div>
            {cliente?.empresa && <div><span className="text-muted-foreground">Empresa:</span> {cliente.empresa}</div>}
            {cliente?.cnpj_cpf && <div><span className="text-muted-foreground">CNPJ/CPF:</span> {cliente.cnpj_cpf}</div>}
            <div><span className="text-muted-foreground">Tipo:</span> {contrato.tipo_pagamento === "mensal" ? "Pagamento Mensal" : "Pagamento Único"}</div>
            <div><span className="text-muted-foreground">Valor Total:</span> <span className="font-bold">R$ {Number(contrato.valor_total).toFixed(2)}</span></div>
            {contrato.tipo_pagamento === "mensal" && (
              <>
                <div><span className="text-muted-foreground">Valor Mensal:</span> R$ {Number(contrato.valor_mensal).toFixed(2)}</div>
                <div><span className="text-muted-foreground">Duração:</span> {contrato.duracao_meses} meses</div>
              </>
            )}
            <div><span className="text-muted-foreground">Início:</span> {new Date(contrato.data_inicio).toLocaleDateString("pt-BR")}</div>
            {contrato.data_fim && <div><span className="text-muted-foreground">Fim:</span> {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}</div>}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-semibold text-lg mb-3">Ações</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4" /> Baixar PDF
            </Button>
            {contrato.status === "ativo" && (
              <>
                <Button variant="outline" size="sm" onClick={() => updateStatus("suspenso")} className="text-yellow-500">Suspender</Button>
                <Button variant="outline" size="sm" onClick={() => updateStatus("encerrado")}>Encerrar</Button>
              </>
            )}
            {contrato.status === "suspenso" && (
              <Button variant="default" size="sm" onClick={() => updateStatus("ativo")} className="bg-green-600 hover:bg-green-700">Reativar</Button>
            )}
            {!["cancelado", "encerrado"].includes(contrato.status) && (
              <Button variant="ghost" size="sm" onClick={() => updateStatus("cancelado")} className="text-destructive">Cancelar</Button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold text-lg mb-4">Itens do Contrato</h2>
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
              <td className="py-3 px-3 text-right font-bold text-lg">R$ {Number(contrato.valor_total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {contrato.observacoes && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-lg mb-2">Observações</h2>
          <p className="text-sm text-muted-foreground">{contrato.observacoes}</p>
        </div>
      )}
    </div>
  );
};

export default ContratoDetalhe;
