import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import type { LeadData } from "@/lib/ai-tools";

interface LeadCaptureFormProps {
  onSubmit: (lead: LeadData) => void;
  isLoading: boolean;
}

const LeadCaptureForm = ({ onSubmit, isLoading }: LeadCaptureFormProps) => {
  const [lead, setLead] = useState<LeadData>({ nome: "", email: "", whatsapp: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.nome || !lead.email || !lead.whatsapp) return;
    onSubmit(lead);
  };

  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-lg">Receba sua análise completa</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Preencha seus dados para receber o resultado da análise com IA.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={lead.nome}
          onChange={(e) => setLead({ ...lead, nome: e.target.value })}
          placeholder="Seu nome completo"
          required
          className="bg-background/50 border-border/50"
        />
        <Input
          type="email"
          value={lead.email}
          onChange={(e) => setLead({ ...lead, email: e.target.value })}
          placeholder="seu@email.com"
          required
          className="bg-background/50 border-border/50"
        />
        <Input
          type="tel"
          value={lead.whatsapp}
          onChange={(e) => setLead({ ...lead, whatsapp: e.target.value })}
          placeholder="(21) 99999-9999"
          required
          className="bg-background/50 border-border/50"
        />
        <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
          {isLoading ? "Gerando análise..." : "Gerar Análise Gratuita com IA"}
        </Button>
      </form>
    </div>
  );
};

export default LeadCaptureForm;
