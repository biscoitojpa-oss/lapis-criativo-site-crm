import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Trash2, MapPin, Instagram } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import WhatsAppChat from "@/components/WhatsAppChat";

const CRMLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLead, setChatLead] = useState<any>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .in("ferramenta", ["Google", "Instagram"])
      .order("criado_em", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = leads.filter((l) =>
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
    l.ferramenta.toLowerCase().includes(search.toLowerCase())
  );

  const hasWhatsapp = (lead: any) => {
    const phone = lead.whatsapp?.replace(/\D/g, "");
    return phone && phone !== "semwhatsapp" && phone.length >= 10;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir lead");
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead removido");
  };

  const ferramentaIcon = (f: string) =>
    f === "Google" ? <MapPin className="w-3 h-3" /> : <Instagram className="w-3 h-3" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">Leads capturados pelo Buscador (Google e Instagram)</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou ferramenta..."
          className="pl-10 bg-background/50 border-border/50"
        />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum lead encontrado. Use o <strong>Buscador de Leads</strong> para pesquisar e salvar novos leads.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">WhatsApp</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ferramenta</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-3 px-4 font-medium">{lead.nome}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {lead.email && !lead.email.includes("sem-email") ? lead.email : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="py-3 px-4 text-emerald-400">
                      {hasWhatsapp(lead) ? lead.whatsapp : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                        {ferramentaIcon(lead.ferramenta)} {lead.ferramenta}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(lead.criado_em).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasWhatsapp(lead) && (
                          <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 text-xs" onClick={() => setChatLead(lead)}>
                            <MessageCircle className="w-4 h-4 mr-1" /> Chat
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80 text-xs" onClick={() => deleteLead(lead.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!chatLead} onOpenChange={(open) => { if (!open) setChatLead(null); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden" style={{ height: "600px" }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Chat WhatsApp - {chatLead?.nome}</DialogTitle>
          </DialogHeader>
          {chatLead && (
            <WhatsAppChat phone={chatLead.whatsapp} contactName={chatLead.nome} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMLeads;
