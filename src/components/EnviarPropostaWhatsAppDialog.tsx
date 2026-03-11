import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: any;
  cliente: any;
  itens: any[];
}

function buildWhatsAppMessage(proposta: any, cliente: any, itens: any[]) {
  const itensText = itens
    .map((i) => `• ${i.descricao} — ${i.quantidade}x — R$ ${Number(i.valor_total).toFixed(2)}`)
    .join("\n");

  return `Olá ${cliente?.nome || ""}! 👋

Segue a proposta *#${proposta.numero}* — *${proposta.titulo}*

${proposta.descricao ? proposta.descricao + "\n" : ""}📋 *Itens:*
${itensText}

💰 *Valor Total: R$ ${Number(proposta.valor_total).toFixed(2)}*
📅 Validade: ${proposta.validade_dias} dias

${proposta.observacoes ? "📝 Obs: " + proposta.observacoes + "\n" : ""}Aguardamos seu retorno! 🙏

_Lápis Criativo — Agência de Marketing Digital_`;
}

const EnviarPropostaWhatsAppDialog = ({ open, onOpenChange, proposta, cliente, itens }: Props) => {
  const [telefone, setTelefone] = useState(cliente?.whatsapp || "");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);

  const handleOpenChange = (val: boolean) => {
    if (val && proposta && cliente) {
      setTelefone(cliente?.whatsapp || "");
      setMensagem(buildWhatsAppMessage(proposta, cliente, itens));
    }
    onOpenChange(val);
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("55")) return digits;
    return `55${digits}`;
  };

  const enviarWhatsApp = async () => {
    if (!telefone) {
      toast.error("Informe o número de WhatsApp");
      return;
    }

    setSending(true);
    const formattedPhone = formatPhone(telefone);

    try {
      // Try sending via Evolution API queue
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) {
        await supabase.from("whatsapp_fila").insert({
          telefone: formattedPhone,
          mensagem: mensagem,
          nome_lead: cliente?.nome || "Cliente",
          criado_por: session.session.user.id,
        } as any);

        // Update status to "enviada" if still rascunho
        if (proposta.status === "rascunho") {
          await supabase.from("propostas").update({ status: "enviada" } as any).eq("id", proposta.id);
        }

        toast.success("Proposta adicionada à fila de envio do WhatsApp!");
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback: open WhatsApp Web directly
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
      window.open(waUrl, "_blank");
      toast.info("Abrindo WhatsApp Web como alternativa...");
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const abrirWhatsAppWeb = () => {
    const formattedPhone = formatPhone(telefone);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
    window.open(waUrl, "_blank");
    toast.success("WhatsApp Web aberto!");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" /> Enviar Proposta por WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Número do WhatsApp</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={12} className="text-sm" />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={abrirWhatsAppWeb} className="text-green-500 border-green-500/30 hover:bg-green-500/10">
            <MessageSquare className="w-4 h-4 mr-2" />
            Abrir no WhatsApp Web
          </Button>
          <Button onClick={enviarWhatsApp} disabled={sending} className="bg-green-600 hover:bg-green-700">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
            Enviar pela Fila
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarPropostaWhatsAppDialog;
