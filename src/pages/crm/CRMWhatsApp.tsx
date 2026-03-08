import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Users, Clock, Shield, Send, Radio, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Zap, Calendar, Timer,
  Activity, BarChart3, Wifi, WifiOff, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EVOLUTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`;

interface Instance {
  instance: {
    instanceName: string;
    status: string;
    owner?: string;
  };
}

const CRMWhatsApp = () => {
  const [instances, setInstances] = useState<any[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [testingInstance, setTestingInstance] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Mensagem de teste do CRM Lápis Criativo 🎨");

  // Metrics
  const [totalLeads, setTotalLeads] = useState(0);
  const [whatsappLeads, setWhatsappLeads] = useState(0);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const callEvolution = async (action: string, instanceName?: string, data?: any) => {
    const resp = await fetch(EVOLUTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action, instanceName, data }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Erro na Evolution API");
    }
    return resp.json();
  };

  const fetchInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const result = await callEvolution("fetchInstances");
      const list = Array.isArray(result) ? result : [];
      setInstances(list);

      // Fetch connection state for each
      const states: Record<string, string> = {};
      for (const inst of list) {
        const name = inst.instance?.instanceName || inst.instanceName;
        if (name) {
          try {
            const state = await callEvolution("connectionState", name);
            states[name] = state.instance?.state || state.state || "unknown";
          } catch {
            states[name] = "error";
          }
        }
      }
      setConnectionStates(states);
    } catch (e: any) {
      toast.error(e.message || "Erro ao buscar instâncias");
    } finally {
      setLoadingInstances(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const { count: total } = await supabase.from("leads").select("*", { count: "exact", head: true });
      const { count: wpp } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("ferramenta", "criativo-x-whatsapp");
      const { data: recent } = await supabase.from("leads").select("*").eq("ferramenta", "criativo-x-whatsapp").order("criado_em", { ascending: false }).limit(10);

      setTotalLeads(total || 0);
      setWhatsappLeads(wpp || 0);
      setRecentLeads(recent || []);
    } catch (e) {
      console.error("Metrics error:", e);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
    fetchMetrics();
  }, [fetchInstances, fetchMetrics]);

  const sendTestMessage = async (instanceName: string) => {
    if (!testPhone) { toast.error("Informe o número de telefone"); return; }
    setTestingInstance(instanceName);
    try {
      await callEvolution("sendTest", instanceName, { number: testPhone, text: testMessage });
      toast.success("Mensagem de teste enviada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingInstance(null);
    }
  };

  const checkHealth = async (instanceName: string) => {
    setHealthChecking(instanceName);
    try {
      const state = await callEvolution("connectionState", instanceName);
      const s = state.instance?.state || state.state || "unknown";
      setConnectionStates(prev => ({ ...prev, [instanceName]: s }));
      toast.success(`Instância ${instanceName}: ${s}`);
    } catch (e: any) {
      toast.error(e.message);
      setConnectionStates(prev => ({ ...prev, [instanceName]: "error" }));
    } finally {
      setHealthChecking(null);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "open": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "close": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "connecting": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case "open": return "Conectado";
      case "close": return "Desconectado";
      case "connecting": return "Conectando";
      default: return "Desconhecido";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">WhatsApp & Criativo X</h1>
        <p className="text-sm text-muted-foreground">Gerencie instâncias, métricas do agente e configurações de envio</p>
      </div>

      <Tabs defaultValue="metricas" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="metricas"><BarChart3 className="w-4 h-4 mr-1.5" />Métricas</TabsTrigger>
          <TabsTrigger value="instancias"><Radio className="w-4 h-4 mr-1.5" />Instâncias</TabsTrigger>
          <TabsTrigger value="anti-ban"><Shield className="w-4 h-4 mr-1.5" />Anti-Banimento</TabsTrigger>
          <TabsTrigger value="fila"><Send className="w-4 h-4 mr-1.5" />Fila de Envio</TabsTrigger>
        </TabsList>

        {/* ===== MÉTRICAS ===== */}
        <TabsContent value="metricas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{whatsappLeads}</p>
                    <p className="text-xs text-muted-foreground">Mensagens Respondidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{whatsappLeads}</p>
                    <p className="text-xs text-muted-foreground">Leads Capturados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">~3s</p>
                    <p className="text-xs text-muted-foreground">Tempo Médio Resposta</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLeads}</p>
                    <p className="text-xs text-muted-foreground">Total de Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Últimas Interações via WhatsApp</CardTitle>
              <CardDescription>Leads capturados pelo agente Criativo X</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMetrics ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
              ) : recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma interação via WhatsApp ainda.</p>
              ) : (
                <div className="space-y-2">
                  {recentLeads.map((lead) => {
                    const dados = lead.dados_entrada as any;
                    return (
                      <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lead.whatsapp}</p>
                          <p className="text-xs text-muted-foreground truncate">{dados?.ultima_mensagem || "—"}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-muted-foreground">
                            {new Date(lead.criado_em).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(lead.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== INSTÂNCIAS ===== */}
        <TabsContent value="instancias" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Instâncias Evolution API</h2>
              <p className="text-xs text-muted-foreground">Gerencie suas conexões WhatsApp</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchInstances} disabled={loadingInstances}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingInstances ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {loadingInstances && instances.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Buscando instâncias...</p>
              </CardContent>
            </Card>
          ) : instances.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center">
                <WifiOff className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Nenhuma instância encontrada.</p>
                <p className="text-xs text-muted-foreground mt-1">Verifique a URL e chave da Evolution API.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {instances.map((inst, i) => {
                const name = inst.instance?.instanceName || inst.instanceName || `instance-${i}`;
                const state = connectionStates[name] || "unknown";
                const owner = inst.instance?.owner || "—";

                return (
                  <Card key={name} className="bg-card/50 border-border/50">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${state === "open" ? "bg-emerald-400 shadow-emerald-400/50 shadow-lg" : state === "close" ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{name}</span>
                              <Badge variant="outline" className={getStateColor(state)}>
                                {getStateLabel(state)}
                              </Badge>
                              {inst.instance?.integration && (
                                <Badge variant="secondary" className="text-xs">{inst.instance.integration}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {owner !== "—" ? owner : name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => checkHealth(name)}
                            disabled={healthChecking === name}
                          >
                            <Heart className={`w-3.5 h-3.5 mr-1.5 ${healthChecking === name ? "animate-pulse" : ""}`} />
                            Saúde
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => {
                              callEvolution("connectionState", name).then(r => {
                                const s = r.instance?.state || r.state;
                                setConnectionStates(prev => ({ ...prev, [name]: s }));
                                toast.info(`Conexão: ${s}`);
                              }).catch(e => toast.error(e.message));
                            }}
                          >
                            <Wifi className="w-3.5 h-3.5 mr-1.5" />
                            Conexão
                          </Button>
                        </div>
                      </div>

                      {/* Test message */}
                      <div className="mt-4 pt-3 border-t border-border/30 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Enviar Teste</label>
                          <Input
                            placeholder="5521999999999"
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                            className="bg-background/50 border-border/50 h-9 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Mensagem de teste"
                            value={testMessage}
                            onChange={e => setTestMessage(e.target.value)}
                            className="bg-background/50 border-border/50 h-9 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() => sendTestMessage(name)}
                          disabled={testingInstance === name}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          {testingInstance === name ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                URL do Webhook - Evolution API
              </CardTitle>
              <CardDescription>Configure esta URL no painel Evolution API para receber mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                <code className="text-xs text-primary break-all">
                  {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANTI-BANIMENTO ===== */}
        <TabsContent value="anti-ban" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Status Anti-Banimento
                  </CardTitle>
                  <CardDescription>Proteção ativa para evitar bloqueio da conta WhatsApp</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Horário de Envio</span>
                  </div>
                  <p className="text-lg font-bold text-primary">09:00 - 20:00</p>
                  <p className="text-xs text-muted-foreground mt-1">Horário de Brasília</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Entre Mensagens</span>
                  </div>
                  <p className="text-lg font-bold">60-120s</p>
                  <p className="text-xs text-muted-foreground mt-1">Intervalo aleatório</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Digitação Simulada</span>
                  </div>
                  <p className="text-lg font-bold">2-8s</p>
                  <p className="text-xs text-muted-foreground mt-1">Antes de enviar</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Descanso</span>
                  </div>
                  <p className="text-lg font-bold">10 msgs</p>
                  <p className="text-xs text-muted-foreground mt-1">Pausa de 7-10 min</p>
                </div>
              </div>

              <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Janela de Envio</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => (
                    <span
                      key={day}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        i >= 1 && i <= 5
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-muted/30 text-muted-foreground border border-border/30"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Regras Anti-Ban Configuradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-primary mb-1">Intervalo</p>
                  <p className="font-semibold text-sm">60-120s</p>
                </div>
                <div>
                  <p className="text-xs text-primary mb-1">Descanso após</p>
                  <p className="font-semibold text-sm">10 msgs</p>
                </div>
                <div>
                  <p className="text-xs text-primary mb-1">Tempo descanso</p>
                  <p className="font-semibold text-sm">7-10min</p>
                </div>
                <div>
                  <p className="text-xs text-primary mb-1">Horário</p>
                  <p className="font-semibold text-sm">09:00-20:00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FILA DE ENVIO ===== */}
        <TabsContent value="fila" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    Fila de Envio
                  </CardTitle>
                  <CardDescription>Gerencie a fila de mensagens WhatsApp</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchMetrics}>
                    <RefreshCw className="w-4 h-4 mr-1.5" />Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                  { label: "Total", value: whatsappLeads, color: "text-foreground" },
                  { label: "Na fila", value: 0, color: "text-emerald-400" },
                  { label: "Processando", value: 0, color: "text-blue-400" },
                  { label: "Enviados", value: whatsappLeads, color: "text-emerald-400" },
                  { label: "Com erro", value: 0, color: "text-red-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-muted/20 rounded-lg p-4 border border-border/30 text-center">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {recentLeads.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem na fila.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Lead</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Mensagem</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map((lead) => {
                        const dados = lead.dados_entrada as any;
                        return (
                          <tr key={lead.id} className="border-b border-border/20">
                            <td className="py-3">
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
                              </Badge>
                            </td>
                            <td className="py-3">
                              <p className="font-medium text-xs">{lead.nome}</p>
                              <p className="text-xs text-muted-foreground">{lead.whatsapp}</p>
                            </td>
                            <td className="py-3 max-w-[200px]">
                              <p className="text-xs truncate">{dados?.ultima_mensagem || "—"}</p>
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {new Date(lead.criado_em).toLocaleDateString("pt-BR")} {new Date(lead.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMWhatsApp;
