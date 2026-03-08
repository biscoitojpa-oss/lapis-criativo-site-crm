import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const CRMLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("leads").select("*").order("criado_em", { ascending: false }).then(({ data }) => {
      setLeads(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = leads.filter((l) =>
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    l.ferramenta.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">Todos os leads capturados pelas ferramentas de IA</p>
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
          <div className="p-8 text-center text-muted-foreground">Nenhum lead encontrado.</div>
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-3 px-4 font-medium">{lead.nome}</td>
                    <td className="py-3 px-4 text-muted-foreground">{lead.email}</td>
                    <td className="py-3 px-4">
                      <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                        {lead.whatsapp}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">{lead.ferramenta}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(lead.criado_em).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMLeads;
