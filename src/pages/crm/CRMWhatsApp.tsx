import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Users, Clock, Shield, Send, Radio, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Zap, Calendar, Timer,
  Activity, BarChart3, Wifi, WifiOff, Heart, Play, Plus, Trash2,
  Power, LogOut, QrCode, Settings, Copy, MessageCircle, Search, Phone,
  CalendarClock, Pause, PlayCircle,
} from "lucide-react";
import WhatsAppChat from "@/components/WhatsAppChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";

const EVOLUTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`;
const QUEUE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-queue-processor`;

const DAYS_MAP: Record<number, string> = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

interface QueueItem {
  id: string;
  telefone: string;
  mensagem: string;
  nome_lead: string | null;
  instancia: string;
  status: string;
  tentativas: number;
  max_tentativas: number;
  erro: string | null;
  agendado_para: string;
  enviado_em: string | null;
  criado_em: string;
}

interface AntiBanConfig {
  id: string;
  horario_inicio: string;
  horario_fim: string;
  dias_envio: number[];
  intervalo_min: number;
  intervalo_max: number;
  digitacao_min: number;
  digitacao_max: number;
  msgs_antes_descanso: number;
  descanso_min: number;
  descanso_max: number;
  followup_dias_inatividade: number;
  followup_max_tentativas: number;
  followup_horario_inicio: string;
  followup_horario_fim: string;
  followup_ativo: boolean;
  agente_pausado: boolean;
}

const CRMWhatsApp = () => {
  const { user } = useAuth();
  // Instances
  const [instances, setInstances] = useState<any[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [testingInstance, setTestingInstance] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Mensagem de teste do CRM Lápis Criativo 🎨");

  // Instance management
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceWebhook, setNewInstanceWebhook] = useState("");
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null);
  const [restartingInstance, setRestartingInstance] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<Record<string, string>>({});
  const [showQrFor, setShowQrFor] = useState<string | null>(null);

  // Metrics
  const [whatsappLeads, setWhatsappLeads] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Anti-ban config
  const [config, setConfig] = useState<AntiBanConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState({ total: 0, pendente: 0, processando: 0, enviado: 0, erro: 0, expirado: 0 });
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [bulkPhones, setBulkPhones] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkInstance, setBulkInstance] = useState("default");

  // Conversations
  const [contacts, setContacts] = useState<{ phone: string; name: string; lastMsg: string; lastDate: string; unread: number }[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{ phone: string; name: string } | null>(null);
  const [contactSearch, setContactSearch] = useState("");

  // Audit log
  const [auditLog, setAuditLog] = useState<{ id: string; user_email: string | null; acao: string; criado_em: string }[]>([]);


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

  // Instâncias permitidas no CRM (apenas essas aparecerão)
  const [allowedInstances, setAllowedInstances] = useState<string[]>(() => {
    const saved = localStorage.getItem("crm_allowed_instances");
    return saved ? JSON.parse(saved) : ["lapismaster", "lapis"];
  });
  const [newAllowedInstance, setNewAllowedInstance] = useState("");

  const fetchInstances = useCallback(async () => {
    setLoadingInstances(true);
    try {
      const result = await callEvolution("fetchInstances");
      const raw = Array.isArray(result) ? result : [];
      // Filtra apenas instâncias permitidas
      const list = raw.filter((inst: any) => {
        const n = inst.name || inst.instance?.instanceName || inst.instanceName || "";
        return allowedInstances.some(a => n.toLowerCase() === a.toLowerCase());
      });
      setInstances(list);
      const states: Record<string, string> = {};
      for (const inst of list) {
        const name = inst.name || inst.instance?.instanceName || inst.instanceName;
        if (name) {
          const status = inst.connectionStatus || inst.instance?.state;
          if (status) {
            states[name] = status;
          } else {
            try {
              const state = await callEvolution("connectionState", name);
              states[name] = state.instance?.state || state.state || "unknown";
            } catch { states[name] = "error"; }
          }
        }
      }
      setConnectionStates(states);
    } catch (e: any) {
      toast.error(e.message || "Erro ao buscar instâncias");
    } finally { setLoadingInstances(false); }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const { count: total } = await supabase.from("leads").select("*", { count: "exact", head: true });
      const { count: wpp } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("ferramenta", "criativo-x-whatsapp");
      const { data: recent } = await supabase.from("leads").select("*").eq("ferramenta", "criativo-x-whatsapp").order("criado_em", { ascending: false }).limit(10);
      const { data: allWppLeads } = await supabase.from("leads").select("criado_em").eq("ferramenta", "criativo-x-whatsapp").order("criado_em", { ascending: true });

      setTotalLeads(total || 0);
      setWhatsappLeads(wpp || 0);
      setRecentLeads(recent || []);

      // Build chart data - group by day
      const dayMap: Record<string, { msgs: number; leads: number }> = {};
      (allWppLeads || []).forEach((l) => {
        const day = new Date(l.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (!dayMap[day]) dayMap[day] = { msgs: 0, leads: 0 };
        dayMap[day].msgs++;
        dayMap[day].leads++;
      });
      setChartData(Object.entries(dayMap).map(([date, v]) => ({ date, mensagens: v.msgs, leads: v.leads })));
    } catch (e) { console.error("Metrics error:", e); }
    finally { setLoadingMetrics(false); }
  }, []);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from("whatsapp_config").select("*").limit(1).single();
    if (data) setConfig(data as any);
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const { data } = await supabase.from("whatsapp_fila").select("*").order("criado_em", { ascending: false }).limit(100);
      const items = (data || []) as unknown as QueueItem[];
      setQueue(items);
      const stats = { total: items.length, pendente: 0, processando: 0, enviado: 0, erro: 0, expirado: 0 };
      items.forEach((i) => { if (stats[i.status as keyof typeof stats] !== undefined) (stats as any)[i.status]++; });
      stats.total = items.length;
      setQueueStats(stats);
    } catch (e) { console.error(e); }
    finally { setLoadingQueue(false); }
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { data } = await supabase
        .from("whatsapp_mensagens")
        .select("telefone, nome_contato, mensagem, criado_em, direcao")
        .order("criado_em", { ascending: false })
        .limit(500);
      if (data) {
        const map = new Map<string, { phone: string; name: string; lastMsg: string; lastDate: string; unread: number }>();
        data.forEach((m: any) => {
          if (!map.has(m.telefone)) {
            map.set(m.telefone, {
              phone: m.telefone,
              name: m.nome_contato || m.telefone,
              lastMsg: m.mensagem,
              lastDate: m.criado_em,
              unread: m.direcao === "recebida" ? 1 : 0,
            });
          } else if (m.direcao === "recebida") {
            const existing = map.get(m.telefone)!;
            existing.unread += 1;
          }
        });
        setContacts(Array.from(map.values()));
      }
    } catch (e) { console.error(e); }
    finally { setLoadingContacts(false); }
  }, []);

  const fetchAuditLog = useCallback(async () => {
    const { data } = await supabase
      .from("agente_audit_log" as any)
      .select("id, user_email, acao, criado_em")
      .order("criado_em", { ascending: false })
      .limit(20);
    if (data) setAuditLog(data as any);
  }, []);

  useEffect(() => {
    fetchInstances();
    fetchMetrics();
    fetchConfig();
    fetchQueue();
    fetchContacts();
    fetchAuditLog();
  }, [fetchInstances, fetchMetrics, fetchConfig, fetchQueue, fetchContacts, fetchAuditLog]);

  // Realtime: whatsapp_config (status do agente) + audit log
  useEffect(() => {
    const channel = supabase
      .channel("agente-status")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_config" }, (payload) => {
        setConfig((prev) => prev ? { ...prev, ...(payload.new as any) } : (payload.new as any));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agente_audit_log" }, (payload) => {
        setAuditLog((prev) => [payload.new as any, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Polling: detectar conexão da instância quando QR Code estiver aberto
  useEffect(() => {
    if (!showQrFor) return;
    const interval = setInterval(async () => {
      try {
        const state = await callEvolution("connectionState", showQrFor);
        const s = state.instance?.state || state.state || "unknown";
        setConnectionStates((prev) => ({ ...prev, [showQrFor]: s }));
        if (s === "open") {
          toast.success(`✅ Instância "${showQrFor}" conectada com sucesso!`);
          setShowQrFor(null);
          fetchInstances();
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [showQrFor, fetchInstances]);

    if (!config) return;
    setSavingConfig(true);
    try {
      const { error } = await supabase.from("whatsapp_config").update({
        horario_inicio: config.horario_inicio,
        horario_fim: config.horario_fim,
        dias_envio: config.dias_envio,
        intervalo_min: config.intervalo_min,
        intervalo_max: config.intervalo_max,
        digitacao_min: config.digitacao_min,
        digitacao_max: config.digitacao_max,
        msgs_antes_descanso: config.msgs_antes_descanso,
        descanso_min: config.descanso_min,
        descanso_max: config.descanso_max,
        followup_ativo: config.followup_ativo,
        followup_dias_inatividade: config.followup_dias_inatividade,
        followup_max_tentativas: config.followup_max_tentativas,
        followup_horario_inicio: config.followup_horario_inicio,
        followup_horario_fim: config.followup_horario_fim,
      }).eq("id", config.id);
      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingConfig(false); }
  };

  const addToQueue = async () => {
    if (!bulkPhones.trim() || !bulkMessage.trim() || !user) return;
    const phones = bulkPhones.split("\n").map(p => p.trim()).filter(Boolean);
    if (phones.length === 0) return;

    try {
      const rows = phones.map(phone => ({
        telefone: phone.replace(/\D/g, ""),
        mensagem: bulkMessage,
        nome_lead: null,
        instancia: bulkInstance || "default",
        criado_por: user.id,
      }));
      const { error } = await supabase.from("whatsapp_fila").insert(rows);
      if (error) throw error;
      toast.success(`${phones.length} mensagens adicionadas à fila!`);
      setShowAddDialog(false);
      setBulkPhones("");
      setBulkMessage("");
      fetchQueue();
    } catch (e: any) { toast.error(e.message); }
  };

  const processQueue = async () => {
    setProcessingQueue(true);
    try {
      const resp = await fetch(QUEUE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(`Processado: ${result.processed || 0} enviadas, ${result.errors || 0} erros`);
      fetchQueue();
    } catch (e: any) { toast.error(e.message); }
    finally { setProcessingQueue(false); }
  };

  const clearErrors = async () => {
    const { error } = await supabase.from("whatsapp_fila").delete().eq("status", "erro");
    if (error) toast.error(error.message);
    else { toast.success("Erros limpos"); fetchQueue(); }
  };

  const sendTestMessage = async (instanceName: string) => {
    if (!testPhone) { toast.error("Informe o número"); return; }
    setTestingInstance(instanceName);
    try {
      await callEvolution("sendTest", instanceName, { number: testPhone, text: testMessage });
      toast.success("Mensagem de teste enviada!");
    } catch (e: any) { toast.error(e.message); }
    finally { setTestingInstance(null); }
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
    } finally { setHealthChecking(null); }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "open": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "close": return "bg-destructive/10 text-destructive border-destructive/30";
      case "connecting": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: any }> = {
      pendente: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
      processando: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: RefreshCw },
      enviado: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
      erro: { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
      expirado: { cls: "bg-muted text-muted-foreground border-border", icon: AlertTriangle },
    };
    const m = map[status] || map.expirado;
    const Icon = m.icon;
    return (
      <Badge variant="outline" className={`${m.cls} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />{status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const toggleDay = (day: number) => {
    if (!config) return;
    const newDays = config.dias_envio.includes(day)
      ? config.dias_envio.filter(d => d !== day)
      : [...config.dias_envio, day].sort();
    setConfig({ ...config, dias_envio: newDays });
  };

  // Instance management functions
  const createInstance = async () => {
    if (!newInstanceName.trim()) { toast.error("Informe o nome da instância"); return; }
    setCreatingInstance(true);
    try {
      const webhookUrl = newInstanceWebhook.trim() || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
      const result = await callEvolution("createInstance", newInstanceName.trim(), {
        instanceName: newInstanceName.trim(),
        webhookUrl,
      });
      toast.success(`Instância "${newInstanceName}" criada!`);
      if (result.qrcode?.base64) {
        setQrCodeData(prev => ({ ...prev, [newInstanceName.trim()]: result.qrcode.base64 }));
        setShowQrFor(newInstanceName.trim());
      }
      setShowCreateDialog(false);
      setNewInstanceName("");
      setNewInstanceWebhook("");
      fetchInstances();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreatingInstance(false); }
  };

  const deleteInstance = async (name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a instância "${name}"?`)) return;
    setDeletingInstance(name);
    try {
      await callEvolution("deleteInstance", name);
      toast.success(`Instância "${name}" excluída`);
      fetchInstances();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingInstance(null); }
  };

  const restartInstance = async (name: string) => {
    setRestartingInstance(name);
    try {
      await callEvolution("restart", name);
      toast.success(`Instância "${name}" reiniciada`);
      setTimeout(() => checkHealth(name), 2000);
    } catch (e: any) { toast.error(e.message); }
    finally { setRestartingInstance(null); }
  };

  const logoutInstance = async (name: string) => {
    if (!confirm(`Desconectar a instância "${name}" do WhatsApp?`)) return;
    setLoggingOut(name);
    try {
      await callEvolution("logout", name);
      toast.success(`Instância "${name}" desconectada`);
      setConnectionStates(prev => ({ ...prev, [name]: "close" }));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoggingOut(null); }
  };

  const connectInstance = async (name: string) => {
    try {
      const result = await callEvolution("instanceInfo", name);
      if (result.base64 || result.qrcode?.base64) {
        const qr = result.base64 || result.qrcode.base64;
        setQrCodeData(prev => ({ ...prev, [name]: qr }));
        setShowQrFor(name);
        toast.info("Escaneie o QR Code com seu WhatsApp");
      } else if (result.instance?.state === "open") {
        toast.success("Instância já conectada!");
        setConnectionStates(prev => ({ ...prev, [name]: "open" }));
      } else {
        toast.info("Nenhum QR Code disponível. Tente reiniciar a instância.");
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const copyWebhookUrl = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  const toggleAgentePausado = async () => {
    if (!config) return;
    const novo = !config.agente_pausado;
    const { error } = await supabase.from("whatsapp_config").update({ agente_pausado: novo }).eq("id", config.id);
    if (error) { toast.error(error.message); return; }
    setConfig({ ...config, agente_pausado: novo });
    toast.success(novo ? "Agente Criativo X pausado globalmente" : "Agente Criativo X reativado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">WhatsApp & Criativo X</h1>
          <p className="text-sm text-muted-foreground">Gerencie instâncias, métricas do agente e configurações de envio</p>
        </div>
        <Button
          onClick={toggleAgentePausado}
          disabled={!config}
          variant={config?.agente_pausado ? "default" : "outline"}
          className={config?.agente_pausado ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30" : ""}
        >
          {config?.agente_pausado ? (
            <><PlayCircle className="w-4 h-4 mr-1.5" />Reativar Agente</>
          ) : (
            <><Pause className="w-4 h-4 mr-1.5" />Pausar Agente</>
          )}
        </Button>
      </div>

      {config?.agente_pausado && (
        <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400 flex items-center gap-2">
          <Pause className="w-4 h-4" />
          Agente Criativo X está <strong>pausado globalmente</strong>. Mensagens recebidas não serão respondidas automaticamente até reativar.
        </div>
      )}

      <Tabs defaultValue="conversas" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="conversas"><MessageCircle className="w-4 h-4 mr-1.5" />Conversas</TabsTrigger>
          <TabsTrigger value="metricas"><BarChart3 className="w-4 h-4 mr-1.5" />Métricas</TabsTrigger>
          <TabsTrigger value="instancias"><Radio className="w-4 h-4 mr-1.5" />Instâncias</TabsTrigger>
          <TabsTrigger value="anti-ban"><Shield className="w-4 h-4 mr-1.5" />Anti-Banimento</TabsTrigger>
          <TabsTrigger value="fila"><Send className="w-4 h-4 mr-1.5" />Fila de Envio</TabsTrigger>
        </TabsList>

        {/* ===== CONVERSAS ===== */}
        <TabsContent value="conversas" className="space-y-4">
          <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
            {/* Contact list */}
            <div className="w-80 shrink-0 glass-card flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar contato..."
                    className="pl-10 bg-background/50 border-border/50 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground">{contacts.length} conversas</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={fetchContacts}>
                  <RefreshCw className={`w-3 h-3 mr-1 ${loadingContacts ? "animate-spin" : ""}`} />Atualizar
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingContacts && contacts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>
                ) : contacts.filter(c =>
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  c.phone.includes(contactSearch)
                ).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa encontrada</p>
                ) : (
                  contacts
                    .filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch))
                    .map((contact) => (
                      <button
                        key={contact.phone}
                        onClick={() => setSelectedContact({ phone: contact.phone, name: contact.name })}
                        className={`w-full text-left px-4 py-3 border-b border-border/20 hover:bg-muted/20 transition-colors ${
                          selectedContact?.phone === contact.phone ? "bg-muted/30 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">{contact.name}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {new Date(contact.lastDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{contact.lastMsg}</p>
                          </div>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* Chat panel */}
            <div className="flex-1 glass-card overflow-hidden">
              {selectedContact ? (
                <WhatsAppChat phone={selectedContact.phone} contactName={selectedContact.name} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Selecione uma conversa para começar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== MÉTRICAS ===== */}
        <TabsContent value="metricas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: MessageSquare, color: "text-blue-400 bg-blue-500/10", value: whatsappLeads, label: "Mensagens Respondidas" },
              { icon: Users, color: "text-emerald-400 bg-emerald-500/10", value: whatsappLeads, label: "Leads Capturados" },
              { icon: Clock, color: "text-amber-400 bg-amber-500/10", value: "~3s", label: "Tempo Médio Resposta" },
              { icon: Activity, color: "text-purple-400 bg-purple-500/10", value: totalLeads, label: "Total de Leads" },
            ].map((s, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Mensagens por Dia</CardTitle>
                <CardDescription>Evolução das mensagens respondidas pelo Criativo X</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="mensagens" stroke="hsl(var(--primary))" fill="url(#colorMsgs)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Leads Capturados por Dia</CardTitle>
                <CardDescription>Novos leads via WhatsApp ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Últimas Interações via WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma interação ainda.</p>
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
                        <p className="text-xs text-muted-foreground ml-4">
                          {new Date(lead.criado_em).toLocaleDateString("pt-BR")} {new Date(lead.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
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
            <div className="flex items-center gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1.5" />Nova Instância</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Instância</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Nome da Instância *</Label>
                      <Input placeholder="minha-instancia" value={newInstanceName} onChange={e => setNewInstanceName(e.target.value)} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Sem espaços ou caracteres especiais</p>
                    </div>
                    <div>
                      <Label>URL do Webhook (opcional)</Label>
                      <Input placeholder={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`} value={newInstanceWebhook} onChange={e => setNewInstanceWebhook(e.target.value)} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Deixe vazio para usar o webhook padrão</p>
                    </div>
                    <Button onClick={createInstance} disabled={creatingInstance} className="w-full" variant="hero">
                      {creatingInstance ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Criando...</> : <><Plus className="w-4 h-4 mr-1.5" />Criar Instância</>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={fetchInstances} disabled={loadingInstances}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingInstances ? "animate-spin" : ""}`} />Atualizar
              </Button>
            </div>
          </div>

          {/* Gerenciar instâncias permitidas */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" />Instâncias Permitidas</CardTitle>
              <CardDescription className="text-xs">Apenas as instâncias listadas abaixo serão exibidas no CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {allowedInstances.map((name) => (
                  <Badge key={name} variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                    {name}
                    <button onClick={() => {
                      const updated = allowedInstances.filter(n => n !== name);
                      setAllowedInstances(updated);
                      localStorage.setItem("crm_allowed_instances", JSON.stringify(updated));
                      toast.info(`Instância "${name}" removida`);
                    }} className="ml-1 hover:text-destructive"><XCircle className="w-3.5 h-3.5" /></button>
                  </Badge>
                ))}
                {allowedInstances.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma instância permitida. Adicione uma abaixo.</p>}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da instância (ex: lapismaster)"
                  value={newAllowedInstance}
                  onChange={e => setNewAllowedInstance(e.target.value)}
                  className="text-sm"
                  onKeyDown={e => {
                    if (e.key === "Enter" && newAllowedInstance.trim()) {
                      const name = newAllowedInstance.trim();
                      if (!allowedInstances.some(a => a.toLowerCase() === name.toLowerCase())) {
                        const updated = [...allowedInstances, name];
                        setAllowedInstances(updated);
                        localStorage.setItem("crm_allowed_instances", JSON.stringify(updated));
                        setNewAllowedInstance("");
                        toast.success(`Instância "${name}" adicionada`);
                      }
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => {
                  const name = newAllowedInstance.trim();
                  if (!name) return;
                  if (allowedInstances.some(a => a.toLowerCase() === name.toLowerCase())) {
                    toast.error("Instância já está na lista");
                    return;
                  }
                  const updated = [...allowedInstances, name];
                  setAllowedInstances(updated);
                  localStorage.setItem("crm_allowed_instances", JSON.stringify(updated));
                  setNewAllowedInstance("");
                  toast.success(`Instância "${name}" adicionada`);
                }}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!showQrFor} onOpenChange={() => setShowQrFor(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" />Conectar {showQrFor}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                {showQrFor && qrCodeData[showQrFor] ? (
                  <>
                    <img src={qrCodeData[showQrFor].startsWith("data:") ? qrCodeData[showQrFor] : `data:image/png;base64,${qrCodeData[showQrFor]}`} alt="QR Code" className="w-64 h-64 rounded-lg border border-border" />
                    <p className="text-sm text-muted-foreground text-center">Abra o WhatsApp no seu celular e escaneie o QR Code acima</p>
                    <Button variant="outline" size="sm" onClick={() => showQrFor && connectInstance(showQrFor)}>
                      <RefreshCw className="w-4 h-4 mr-1.5" />Gerar Novo QR
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">QR Code não disponível</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

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
                <p className="text-xs text-muted-foreground mt-1">Crie uma nova instância para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {instances.map((inst, i) => {
                const name = inst.name || inst.instance?.instanceName || inst.instanceName || `instance-${i}`;
                const state = connectionStates[name] || "unknown";
                return (
                  <Card key={name} className="bg-card/50 border-border/50">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${state === "open" ? "bg-emerald-400 shadow-lg shadow-emerald-400/50" : state === "close" ? "bg-destructive" : "bg-amber-400 animate-pulse"}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{name}</span>
                              <Badge variant="outline" className={getStateColor(state)}>{getStateLabel(state)}</Badge>
                              {(inst.integration || inst.instance?.integration) && <Badge variant="secondary" className="text-xs">{inst.integration || inst.instance.integration}</Badge>}
                            </div>
                            {(inst.profileName || inst.number) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {inst.profileName && <span>{inst.profileName}</span>}
                                {inst.profileName && inst.number && <span> · </span>}
                                {inst.number && <span>{inst.number}</span>}
                                {inst._count?.Message != null && <span> · {inst._count.Message.toLocaleString("pt-BR")} msgs</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => checkHealth(name)} disabled={healthChecking === name}>
                            <Heart className={`w-3.5 h-3.5 mr-1 ${healthChecking === name ? "animate-pulse" : ""}`} />Saúde
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => connectInstance(name)}>
                            <QrCode className="w-3.5 h-3.5 mr-1" />QR Code
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => restartInstance(name)} disabled={restartingInstance === name}>
                            <Power className={`w-3.5 h-3.5 mr-1 ${restartingInstance === name ? "animate-spin" : ""}`} />Reiniciar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => logoutInstance(name)} disabled={loggingOut === name}>
                            <LogOut className="w-3.5 h-3.5 mr-1" />Desconectar
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteInstance(name)} disabled={deletingInstance === name}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" />Excluir
                          </Button>
                        </div>
                      </div>
                      {/* Test message */}
                      <div className="mt-4 pt-3 border-t border-border/30 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Enviar Teste</label>
                          <Input placeholder="5521999999999" value={testPhone} onChange={e => setTestPhone(e.target.value)} className="bg-background/50 border-border/50 h-9 text-sm" />
                        </div>
                        <div className="flex-1">
                          <Input placeholder="Mensagem de teste" value={testMessage} onChange={e => setTestMessage(e.target.value)} className="bg-background/50 border-border/50 h-9 text-sm" />
                        </div>
                        <Button size="sm" variant="hero" onClick={() => sendTestMessage(name)} disabled={testingInstance === name}>
                          <Send className="w-3.5 h-3.5 mr-1.5" />{testingInstance === name ? "Enviando..." : "Enviar"}
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
              <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />URL do Webhook</CardTitle>
              <CardDescription>Configure esta URL no painel Evolution API para receber mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-border/30">
                  <code className="text-xs text-primary break-all">{import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook</code>
                </div>
                <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANTI-BANIMENTO ===== */}
        <TabsContent value="anti-ban" className="space-y-4">
          {config ? (
            <>
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Configurações Anti-Banimento</CardTitle>
                      <CardDescription>Edite os parâmetros de proteção da conta</CardDescription>
                    </div>
                    <Button onClick={saveConfig} disabled={savingConfig} variant="hero" size="sm">
                      {savingConfig ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Horário */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Horário de Envio</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input type="time" value={config.horario_inicio} onChange={e => setConfig({ ...config, horario_inicio: e.target.value })} className="bg-background/50 border-border/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input type="time" value={config.horario_fim} onChange={e => setConfig({ ...config, horario_fim: e.target.value })} className="bg-background/50 border-border/50" />
                      </div>
                    </div>
                  </div>

                  {/* Dias */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Dias de Envio</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => (
                        <button key={day} onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            config.dias_envio.includes(day)
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                          }`}>
                          {DAYS_MAP[day]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Intervalos */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Intervalo entre Mensagens (segundos)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Mínimo</Label>
                        <Input type="number" value={config.intervalo_min} onChange={e => setConfig({ ...config, intervalo_min: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Máximo</Label>
                        <Input type="number" value={config.intervalo_max} onChange={e => setConfig({ ...config, intervalo_max: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                    </div>
                  </div>

                  {/* Digitação */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Digitação Simulada (segundos)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Mínimo</Label>
                        <Input type="number" value={config.digitacao_min} onChange={e => setConfig({ ...config, digitacao_min: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Máximo</Label>
                        <Input type="number" value={config.digitacao_max} onChange={e => setConfig({ ...config, digitacao_max: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                    </div>
                  </div>

                  {/* Descanso */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Descanso</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Msgs antes de pausar</Label>
                        <Input type="number" value={config.msgs_antes_descanso} onChange={e => setConfig({ ...config, msgs_antes_descanso: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Pausa mín (min)</Label>
                        <Input type="number" value={config.descanso_min} onChange={e => setConfig({ ...config, descanso_min: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Pausa máx (min)</Label>
                        <Input type="number" value={config.descanso_max} onChange={e => setConfig({ ...config, descanso_max: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader><CardTitle className="text-base">Resumo das Regras</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-xs text-primary mb-1">Intervalo</p><p className="font-semibold text-sm">{config.intervalo_min}-{config.intervalo_max}s</p></div>
                    <div><p className="text-xs text-primary mb-1">Descanso após</p><p className="font-semibold text-sm">{config.msgs_antes_descanso} msgs</p></div>
                    <div><p className="text-xs text-primary mb-1">Tempo descanso</p><p className="font-semibold text-sm">{config.descanso_min}-{config.descanso_max}min</p></div>
                    <div><p className="text-xs text-primary mb-1">Horário</p><p className="font-semibold text-sm">{config.horario_inicio}-{config.horario_fim}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Follow-up Automático Config */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary" />Follow-up Automático</CardTitle>
                      <CardDescription>Configurações de reengajamento automático por inatividade</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Ativo</Label>
                      <button
                        onClick={() => setConfig({ ...config, followup_ativo: !config.followup_ativo })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${config.followup_ativo ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.followup_ativo ? "left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Dias de inatividade para disparar</Label>
                      <Input type="number" min={1} max={30} value={config.followup_dias_inatividade} onChange={e => setConfig({ ...config, followup_dias_inatividade: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      <p className="text-xs text-muted-foreground mt-1">Após X dias sem resposta do cliente</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Máximo de tentativas</Label>
                      <Input type="number" min={1} max={10} value={config.followup_max_tentativas} onChange={e => setConfig({ ...config, followup_max_tentativas: Number(e.target.value) })} className="bg-background/50 border-border/50" />
                      <p className="text-xs text-muted-foreground mt-1">Quantidade máxima de follow-ups por contato</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Horário de Envio dos Follow-ups</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input type="time" value={config.followup_horario_inicio} onChange={e => setConfig({ ...config, followup_horario_inicio: e.target.value })} className="bg-background/50 border-border/50" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input type="time" value={config.followup_horario_fim} onChange={e => setConfig({ ...config, followup_horario_fim: e.target.value })} className="bg-background/50 border-border/50" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground">
                      📋 <strong>Resumo:</strong> Após <strong>{config.followup_dias_inatividade} dias</strong> sem resposta, o sistema envia até <strong>{config.followup_max_tentativas} follow-ups</strong> automáticos (1 a cada {config.followup_dias_inatividade} dias) entre <strong>{config.followup_horario_inicio}</strong> e <strong>{config.followup_horario_fim}</strong>. Se o cliente responder, os follow-ups pendentes são cancelados automaticamente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card/50 border-border/50"><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">Carregando configurações...</p></CardContent></Card>
          )}
        </TabsContent>

        {/* ===== FILA DE ENVIO ===== */}
        <TabsContent value="fila" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4 text-primary" />Fila de Envio</CardTitle>
                  <CardDescription>Gerencie a fila de mensagens WhatsApp</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchQueue} disabled={loadingQueue}>
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${loadingQueue ? "animate-spin" : ""}`} />Atualizar
                  </Button>
                  {queueStats.erro > 0 && (
                    <Button variant="outline" size="sm" onClick={clearErrors} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-1.5" />Limpar erros
                    </Button>
                  )}
                  <Button variant="hero" size="sm" onClick={processQueue} disabled={processingQueue || queueStats.pendente === 0}>
                    <Play className={`w-4 h-4 mr-1.5 ${processingQueue ? "animate-spin" : ""}`} />{processingQueue ? "Processando..." : "Processar Agora"}
                  </Button>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1.5" />Envio em Massa</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader><DialogTitle>Adicionar à Fila de Envio</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div>
                          <Label>Números (um por linha)</Label>
                          <Textarea value={bulkPhones} onChange={e => setBulkPhones(e.target.value)} placeholder={"5521999999999\n5521888888888\n5521777777777"} rows={5} className="bg-background/50 border-border/50 mt-1.5 font-mono text-sm" />
                          <p className="text-xs text-muted-foreground mt-1">{bulkPhones.split("\n").filter(Boolean).length} números</p>
                        </div>
                        <div>
                          <Label>Mensagem</Label>
                          <Textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} placeholder="Olá! Tudo bem? Gostaria de apresentar nossos serviços..." rows={3} className="bg-background/50 border-border/50 mt-1.5" />
                        </div>
                        <div>
                          <Label>Instância</Label>
                          <Select value={bulkInstance} onValueChange={setBulkInstance}>
                            <SelectTrigger className="bg-background/50 border-border/50 mt-1.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {instances.length > 0 ? instances.map((inst, i) => {
                                const name = inst.name || inst.instance?.instanceName || inst.instanceName || `instance-${i}`;
                                return <SelectItem key={name} value={name}>{name}</SelectItem>;
                              }) : <SelectItem value="default">default</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={addToQueue} disabled={!bulkPhones.trim() || !bulkMessage.trim()} className="w-full" variant="hero">
                          Adicionar {bulkPhones.split("\n").filter(Boolean).length} mensagens à fila
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                {[
                  { label: "Total", value: queueStats.total, color: "text-foreground" },
                  { label: "Na fila", value: queueStats.pendente, color: "text-amber-400" },
                  { label: "Processando", value: queueStats.processando, color: "text-blue-400" },
                  { label: "Enviados", value: queueStats.enviado, color: "text-emerald-400" },
                  { label: "Falharam", value: queueStats.erro, color: "text-destructive" },
                  { label: "Expirados", value: queueStats.expirado, color: "text-muted-foreground" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-muted/20 rounded-lg p-3 border border-border/30 text-center">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">Fila vazia. Adicione mensagens para enviar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Lead</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Mensagem</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Instância</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Tentativas</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Data</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-medium">Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((item) => (
                        <tr key={item.id} className="border-b border-border/20">
                          <td className="py-2.5">{getStatusBadge(item.status)}</td>
                          <td className="py-2.5">
                            <p className="font-medium text-xs">{item.nome_lead || "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.telefone}</p>
                          </td>
                          <td className="py-2.5 max-w-[180px]"><p className="text-xs truncate">{item.mensagem}</p></td>
                          <td className="py-2.5 text-xs">{item.instancia}</td>
                          <td className="py-2.5 text-xs text-center">{item.tentativas}/{item.max_tentativas || 3}</td>
                          <td className="py-2.5 text-xs text-muted-foreground">
                            {new Date(item.criado_em).toLocaleDateString("pt-BR")} {new Date(item.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2.5 max-w-[150px]">
                            {item.erro && <p className="text-xs text-destructive truncate">{item.erro}</p>}
                          </td>
                        </tr>
                      ))}
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
