import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, PenTool } from "lucide-react";
import { toast } from "sonner";

const AssinarContrato = () => {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from("contratos")
      .select("*, clientes(nome, empresa, cnpj_cpf, email)")
      .eq("token_assinatura", token)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setLoading(false);
          return;
        }
        setContrato(data);
        if (data.assinatura_cliente) {
          setSigned(true);
        }
        const { data: itensData } = await supabase
          .from("contrato_itens")
          .select("*")
          .eq("contrato_id", data.id);
        setItens(itensData || []);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || signed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1e1932";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      setDrawing(true);
      setHasDrawn(true);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDraw = () => {
      isDrawing = false;
      setDrawing(false);
    };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, [signed, loading]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !contrato) return;
    setSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const { error } = await supabase
        .from("contratos")
        .update({ assinatura_cliente: dataUrl, assinado_em: new Date().toISOString() } as any)
        .eq("token_assinatura", token!);
      if (error) throw error;
      setSigned(true);
      toast.success("Contrato assinado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar assinatura: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando contrato...</p>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Contrato não encontrado</h1>
          <p className="text-gray-500">O link de assinatura é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  const cliente = contrato.clientes;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-[#1e1932] text-white p-6 rounded-t-xl">
          <h1 className="text-2xl font-bold">Lápis Criativo</h1>
          <p className="text-gray-300 text-sm">Agência de Marketing Digital</p>
        </div>
        <div className="h-1 bg-[#7f3ee0]" />

        {/* Contract body */}
        <div className="bg-white p-6 md:p-8 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Contrato #{contrato.numero}</h2>
          <p className="text-gray-600 mb-6">{contrato.titulo}</p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-gray-700">Contratante</h3>
              <p><span className="text-gray-500">Cliente:</span> {cliente?.nome}</p>
              {cliente?.empresa && <p><span className="text-gray-500">Empresa:</span> {cliente.empresa}</p>}
              {cliente?.cnpj_cpf && <p><span className="text-gray-500">CNPJ/CPF:</span> {cliente.cnpj_cpf}</p>}
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-gray-700">Detalhes</h3>
              <p><span className="text-gray-500">Tipo:</span> {contrato.tipo_pagamento === "mensal" ? "Mensal" : "Único"}</p>
              <p><span className="text-gray-500">Valor Total:</span> <strong>R$ {Number(contrato.valor_total).toFixed(2)}</strong></p>
              {contrato.tipo_pagamento === "mensal" && (
                <p><span className="text-gray-500">Mensal:</span> R$ {Number(contrato.valor_mensal).toFixed(2)} ({contrato.duracao_meses} meses)</p>
              )}
            </div>
          </div>

          {contrato.descricao && <p className="text-sm text-gray-600 mb-4">{contrato.descricao}</p>}

          {/* Items */}
          <table className="w-full text-sm mb-8 border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Descrição</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">Qtd</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2 px-3">{item.descricao}</td>
                  <td className="py-2 px-3 text-center">{item.quantidade}</td>
                  <td className="py-2 px-3 text-right">R$ {Number(item.valor_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={2} className="py-2 px-3 text-right font-semibold">Total:</td>
                <td className="py-2 px-3 text-right font-bold">R$ {Number(contrato.valor_total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Signature */}
          {signed ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-700 mb-1">Contrato Assinado!</h3>
              <p className="text-gray-500">Assinado em {contrato.assinado_em ? new Date(contrato.assinado_em).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}</p>
              {contrato.assinatura_cliente && (
                <div className="mt-4 inline-block border-2 border-gray-200 rounded-lg p-2 bg-white">
                  <img src={contrato.assinatura_cliente} alt="Assinatura" className="max-h-24" />
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <PenTool className="w-4 h-4" /> Assine abaixo
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Desenhe sua assinatura no campo abaixo com o mouse ou dedo (touch).
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white mb-3">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair"
                  style={{ height: 160, touchAction: "none" }}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={clearCanvas} disabled={saving}>Limpar</Button>
                <Button onClick={handleSign} disabled={saving || !hasDrawn} className="bg-[#7f3ee0] hover:bg-[#6b2fcf] text-white">
                  {saving ? "Salvando..." : "Assinar Contrato"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#7f3ee0] text-white text-center py-3 rounded-b-xl text-sm">
          Lápis Criativo — Agência de Marketing Digital
        </div>
      </div>
    </div>
  );
};

export default AssinarContrato;
