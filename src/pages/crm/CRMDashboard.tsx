import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Brain, BarChart3, TrendingUp, FileText, FilePlus } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["hsl(265, 89%, 65%)", "hsl(210, 80%, 55%)", "hsl(140, 70%, 45%)", "hsl(0, 84%, 60%)", "hsl(45, 90%, 55%)"];

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

const CRMDashboard = () => {
  const [leadsCount, setLeadsCount] = useState(0);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [contratosAtivos, setContratosAtivos] = useState(0);
  const [totalContratos, setTotalContratos] = useState(0);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [propostasByStatus, setPropostasByStatus] = useState<any[]>([]);
  const [receitaMensal, setReceitaMensal] = useState<any[]>([]);
  const [totalReceita, setTotalReceita] = useState(0);

  useEffect(() => {
    // Leads
    supabase.from("leads").select("*", { count: "exact", head: true }).then(({ count }) => setLeadsCount(count || 0));
    supabase.from("leads").select("*").order("criado_em", { ascending: false }).limit(5).then(({ data }) => setRecentLeads(data || []));

    // Contratos
    supabase.from("contratos").select("*").then(({ data }) => {
      const list = data || [];
      setContratos(list);
      setTotalContratos(list.length);
      setContratosAtivos(list.filter((c: any) => c.status === "ativo").length);

      // Receita mensal (últimos 6 meses)
      const now = new Date();
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const monthContratos = list.filter((c: any) => {
          const cd = new Date(c.criado_em);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        });
        const total = monthContratos.reduce((sum: number, c: any) => sum + Number(c.valor_total || 0), 0);
        months.push({ name: label, receita: total });
      }
      setReceitaMensal(months);
      setTotalReceita(list.filter((c: any) => c.status === "ativo").reduce((s: number, c: any) => s + Number(c.valor_total || 0), 0));
    });

    // Propostas by status
    supabase.from("propostas").select("*").then(({ data }) => {
      const list = data || [];
      setPropostas(list);
      const grouped = list.reduce((acc: any, p: any) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});
      setPropostasByStatus(
        Object.entries(grouped).map(([status, count]) => ({
          name: statusLabels[status] || status,
          value: count as number,
          status,
        }))
      );
    });
  }, []);

  const stats = [
    { title: "Total de Leads", value: leadsCount, icon: Users, color: "text-primary" },
    { title: "Contratos Ativos", value: contratosAtivos, icon: FilePlus, color: "text-green-500" },
    { title: "Propostas", value: propostas.length, icon: FileText, color: "text-blue-500" },
    { title: "Receita Ativa", value: `R$ ${totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-yellow-500" },
  ];

  const chartConfig = {
    receita: { label: "Receita", color: "hsl(265, 89%, 65%)" },
  };

  const pieConfig = propostasByStatus.reduce((acc: any, item: any, i: number) => {
    acc[item.name] = { label: item.name, color: COLORS[i % COLORS.length] };
    return acc;
  }, {} as any);

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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Receita Mensal */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={receitaMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 20%)" />
                <XAxis dataKey="name" stroke="hsl(260, 10%, 65%)" fontSize={12} />
                <YAxis stroke="hsl(260, 10%, 65%)" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receita" fill="hsl(265, 89%, 65%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Propostas por Status */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Propostas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {propostasByStatus.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma proposta cadastrada.</p>
            ) : (
              <div className="flex items-center gap-4">
                <ChartContainer config={pieConfig} className="h-[250px] w-full max-w-[250px]">
                  <PieChart>
                    <Pie data={propostasByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} strokeWidth={2}>
                      {propostasByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {propostasByStatus.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads recentes */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Leads Recentes</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMDashboard;
