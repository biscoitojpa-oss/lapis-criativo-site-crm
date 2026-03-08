import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Brain, BarChart3, TrendingUp } from "lucide-react";

const CRMDashboard = () => {
  const [leadsCount, setLeadsCount] = useState(0);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("leads").select("*", { count: "exact", head: true }).then(({ count }) => {
      setLeadsCount(count || 0);
    });
    supabase.from("leads").select("*").order("criado_em", { ascending: false }).limit(5).then(({ data }) => {
      setRecentLeads(data || []);
    });
  }, []);

  const stats = [
    { title: "Total de Leads", value: leadsCount, icon: Users, color: "text-primary" },
    { title: "Ferramentas IA", value: 10, icon: Brain, color: "text-green-500" },
    { title: "Análises Geradas", value: leadsCount, icon: BarChart3, color: "text-blue-500" },
    { title: "Taxa de Conversão", value: "—", icon: TrendingUp, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display font-semibold text-lg mb-4">Leads Recentes</h2>
        {recentLeads.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum lead capturado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">WhatsApp</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Ferramenta</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/20">
                    <td className="py-3 px-2">{lead.nome}</td>
                    <td className="py-3 px-2 text-muted-foreground">{lead.email}</td>
                    <td className="py-3 px-2 text-muted-foreground">{lead.whatsapp}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">{lead.ferramenta}</span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(lead.criado_em).toLocaleDateString("pt-BR")}</td>
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

export default CRMDashboard;
