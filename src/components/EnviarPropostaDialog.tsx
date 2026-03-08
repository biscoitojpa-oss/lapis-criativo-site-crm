import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: any;
  cliente: any;
  itens: any[];
}

function buildEmailBody(proposta: any, cliente: any, itens: any[]) {
  const itensText = itens
    .map((i) => `• ${i.descricao} — ${i.quantidade}x — R$ ${Number(i.valor_total).toFixed(2)}`)
    .join("\n");

  return `Olá ${cliente?.nome || ""},

Segue a proposta #${proposta.numero} — ${proposta.titulo}

${proposta.descricao ? proposta.descricao + "\n" : ""}
Itens:
${itensText}

Valor Total: R$ ${Number(proposta.valor_total).toFixed(2)}
Validade: ${proposta.validade_dias} dias

${proposta.observacoes ? "Obs: " + proposta.observacoes + "\n" : ""}
Aguardamos seu retorno!

Atenciosamente,
Lápis Criativo — Agência de Marketing Digital`;
}

const EnviarPropostaDialog = ({ open, onOpenChange, proposta, cliente, itens }: Props) => {
  const [email, setEmail] = useState(cliente?.email || "");
  const [assunto, setAssunto] = useState(`Proposta #${proposta?.numero} — ${proposta?.titulo || ""}`);
  const [corpo, setCorpo] = useState("");
  const [sending, setSending] = useState(false);

  // Initialize body when dialog opens
  const handleOpenChange = (val: boolean) => {
    if (val && proposta && cliente) {
      setEmail(cliente?.email || "");
      setAssunto(`Proposta #${proposta.numero} — ${proposta.titulo || ""}`);
      setCorpo(buildEmailBody(proposta, cliente, itens));
    }
    onOpenChange(val);
  };

  const enviarEmail = async () => {
    if (!email) {
      toast.error("Informe o email do destinatário");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-proposal-email", {
        body: { to: email, subject: assunto, body: corpo, propostaId: proposta.id },
      });
      if (error) throw error;
      toast.success("Proposta enviada por email com sucesso!");
      // Update status to "enviada" if still rascunho
      if (proposta.status === "rascunho") {
        await supabase.from("propostas").update({ status: "enviada" } as any).eq("id", proposta.id);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      // Fallback: open mailto
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      window.open(mailtoUrl, "_blank");
      toast.info("Abrindo cliente de email como alternativa...");
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Enviar Proposta por Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Email do destinatário</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
          </div>
          <div>
            <Label>Assunto</Label>
            <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={12} className="text-sm font-mono" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviarEmail} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarPropostaDialog;
