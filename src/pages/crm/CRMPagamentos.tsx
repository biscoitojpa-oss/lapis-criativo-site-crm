import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Save } from "lucide-react";
import { toast } from "sonner";

const CRMPagamentos = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    id: "",
    chave_pix: "",
    nome_recebedor: "",
    banco: "",
    link_pagamento_cartao: "",
  });

  useEffect(() => {
    supabase
      .from("config_pagamentos")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as any);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("config_pagamentos")
      .update({
        chave_pix: config.chave_pix,
        nome_recebedor: config.nome_recebedor,
        banco: config.banco,
        link_pagamento_cartao: config.link_pagamento_cartao,
      } as any)
      .eq("id", config.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações de pagamento salvas!");
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          Configuração de Pagamentos
        </h1>
        <p className="text-muted-foreground">Configure as formas de pagamento exibidas nas propostas e contratos.</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-primary">PIX</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                placeholder="email@exemplo.com, CPF, CNPJ ou chave aleatória"
                value={config.chave_pix}
                onChange={(e) => setConfig({ ...config, chave_pix: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Recebedor</Label>
              <Input
                placeholder="Nome completo ou razão social"
                value={config.nome_recebedor}
                onChange={(e) => setConfig({ ...config, nome_recebedor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2 max-w-sm">
            <Label>Banco</Label>
            <Input
              placeholder="Ex: Nubank, Itaú, Bradesco"
              value={config.banco}
              onChange={(e) => setConfig({ ...config, banco: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 space-y-4">
          <h2 className="font-semibold text-lg text-primary">Cartão de Crédito</h2>
          <div className="space-y-2">
            <Label>Link de Pagamento</Label>
            <Input
              placeholder="https://pay.exemplo.com/link"
              value={config.link_pagamento_cartao}
              onChange={(e) => setConfig({ ...config, link_pagamento_cartao: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Cole aqui o link de pagamento do seu gateway (Stripe, PagSeguro, Mercado Pago, etc.)</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default CRMPagamentos;
