import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarClock, Plus, Send, Trash2, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Play, FileText, TrendingUp, Users, Ban, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FOLLOWUP_PROCESSOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-followup-processor`;

const TEMPLATES = [
  {
    id: "reengajamento",
    label: "🔄 Reengajamento",
    motivo: "reengajamento",
    mensagem: "Oi, {nome}! 😊 Tudo bem? Há alguns dias conversamos e fiquei pensando se posso te ajudar com algo. Se quiser saber mais sobre nossos serviços, é só me chamar! 🚀",
  },
  {
    id: "pos-proposta",
    label: "📋 Pós-proposta",
    motivo: "followup",
    mensagem: "Oi, {nome}! 😊 Estou passando para saber se você teve a oportunidade de analisar a proposta que enviamos. Ficou com alguma dúvida? Estou à disposição para esclarecer qualquer ponto! 💬",
  },
  {
    id: "promocao",
    label: "🎯 Promoção",
    motivo: "remarketing",
    mensagem: "Oi, {nome}! 🎉 Temos uma condição especial esse mês para novos projetos de marketing digital. Quer saber mais? Posso te contar os detalhes rapidinho! ✨",
  },
  {
    id: "lembrete-reuniao",
    label: "📅 Lembrete de reunião",
    motivo: "followup",
    mensagem: "Oi, {nome}! Passando para lembrar da nossa conversa. Que tal agendarmos uma reunião rápida para entender melhor o que você precisa? Pode ser por vídeo, sem compromisso! 📲",
  },
  {
    id: "caso-sucesso",
    label: "🏆 Case de sucesso",
    motivo: "remarketing",
    mensagem: "Oi, {nome}! 😊 Queria compartilhar um resultado incrível que tivemos recentemente com um cliente do mesmo segmento que o seu. Quer saber como podemos fazer algo parecido pra você? 🚀",
  },
  {
    id: "retorno-inativo",
    label: "💤 Retorno inativo",
    motivo: "reengajamento",
    mensagem: "Oi, {nome}! Faz um tempinho que não conversamos. 😊 Queria saber como estão as coisas por aí. Se precisar de algo relacionado a marketing digital, estou aqui pra te ajudar! 💡",
  },
];

interface Followup {
  id: string;
  telefone: string;
  nome_contato: string | null;
  mensagem: string;
  motivo: string;
  instancia: string;
  agendado_para: string;
  enviado_em: string | null;
  status: string;
  erro: string | null;
  origem: string;
  criado_em: string;
}

const CRMFollowups = () => {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // New follow-up form
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("Oi! 😊 Tudo bem? Há alguns dias conversamos e gostaria de saber se posso te ajudar com algo. Estou à disposição!");
  const [newMotivo, setNewMotivo] = useState("remarketing");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [newInstancia, setNewInstancia] = useState("default");

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_followups")
      .select("*")
      .order("agendado_para", { ascending: true })
      .limit(200);
    setFollowups((data || []) as unknown as Followup[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const stats = {
    agendado: followups.filter(f => f.status === "agendado").length,
    enviado: followups.filter(f => f.status === "enviado").length,
    erro: followups.filter(f => f.status === "erro").length,
    cancelado: followups.filter(f => f.status === "cancelado").length,
  };

  const addFollowup = async () => {
    if (!newPhone.trim() || !newMessage.trim() || !newDate) {
      toast.error("Preencha telefone, mensagem e data");
      return;
    }
    const agendado = new Date(`${newDate}T${newTime}:00`).toISOString();
    const { error } = await supabase.from("whatsapp_followups").insert({
      telefone: newPhone.replace(/\D/g, ""),
      nome_contato: newName || null,
      mensagem: newMessage,
      motivo: newMotivo,
      instancia: newInstancia,
      agendado_para: agendado,
      criado_por: user?.id || null,
      origem: "manual",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Follow-up agendado!");
    setShowAdd(false);
    setNewPhone(""); setNewName("");
    fetchFollowups();
  };

  const processNow = async () => {
    setProcessing(true);
    try {
      const resp = await fetch(FOLLOWUP_PROCESSOR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(`${result.processed || 0} follow-ups enviados, ${result.errors || 0} erros`);
      fetchFollowups();
    } catch (e: any) { toast.error(e.message); }
    finally { setProcessing(false); }
  };

  const cancelFollowup = async (id: string) => {
    await supabase.from("whatsapp_followups").update({ status: "cancelado", atualizado_em: new Date().toISOString() }).eq("id", id);
    toast.success("Follow-up cancelado");
    fetchFollowups();
  };

  const deleteFollowup = async (id: string) => {
    await supabase.from("whatsapp_followups").delete().eq("id", id);
    fetchFollowups();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: any; label: string }> = {
      agendado: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock, label: "Agendado" },
      enviado: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Enviado" },
      erro: { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle, label: "Erro" },
      cancelado: { cls: "bg-muted text-muted-foreground border-border", icon: AlertTriangle, label: "Cancelado" },
    };
    const m = map[status] || map.cancelado;
    const Icon = m.icon;
    return <Badge variant="outline" className={`${m.cls} text-xs`}><Icon className="w-3 h-3 mr-1" />{m.label}</Badge>;
  };

  // Default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Follow-ups & Remarketing</h1>
            <p className="text-xs text-muted-foreground">Agende mensagens de retorno e remarketing automático</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFollowups} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={processNow} disabled={processing}>
            <Play className={`w-4 h-4 mr-1 ${processing ? "animate-spin" : ""}`} /> Processar Agora
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Follow-up</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Agendar Follow-up</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone *</Label>
                    <Input placeholder="5511999999999" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label>Nome do contato</Label>
                    <Input placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Template</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`text-left text-xs p-2 rounded-lg border transition-colors hover:bg-muted/50 ${
                          newMessage === t.mensagem.replace("{nome}", newName || "")
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/50 bg-background/50"
                        }`}
                        onClick={() => {
                          setNewMessage(t.mensagem.replace("{nome}", newName || ""));
                          setNewMotivo(t.motivo);
                        }}
                      >
                        <span className="font-medium">{t.label}</span>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">{t.mensagem.replace("{nome}", newName || "cliente")}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Mensagem *</Label>
                  <Textarea rows={3} value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={newDate || defaultDate} onChange={e => setNewDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Hora</Label>
                    <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>Motivo</Label>
                    <Select value={newMotivo} onValueChange={setNewMotivo}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remarketing">Remarketing</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                        <SelectItem value="reengajamento">Reengajamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Instância</Label>
                  <Input value={newInstancia} onChange={e => setNewInstancia(e.target.value)} placeholder="default" />
                </div>
                <Button onClick={addFollowup} className="w-full" variant="hero">
                  <CalendarClock className="w-4 h-4 mr-1" /> Agendar Follow-up
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card"><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.agendado}</p>
          <p className="text-xs text-muted-foreground">Agendados</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.enviado}</p>
          <p className="text-xs text-muted-foreground">Enviados</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-destructive">{stats.erro}</p>
          <p className="text-xs text-muted-foreground">Erros</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{stats.cancelado}</p>
          <p className="text-xs text-muted-foreground">Cancelados</p>
        </CardContent></Card>
      </div>

      {/* List */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm">Follow-ups Agendados</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : followups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum follow-up agendado</p>
          ) : (
            <div className="space-y-3">
              {followups.map(fu => (
                <div key={fu.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{fu.nome_contato || fu.telefone}</span>
                      {getStatusBadge(fu.status)}
                      <Badge variant="outline" className="text-xs">{fu.motivo}</Badge>
                      {fu.origem === "auto" && <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Auto</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{fu.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      📅 {new Date(fu.agendado_para).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {fu.enviado_em && ` • ✅ Enviado em ${new Date(fu.enviado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                      {fu.erro && ` • ❌ ${fu.erro}`}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {fu.status === "agendado" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelFollowup(fu.id)}>
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {(fu.status === "cancelado" || fu.status === "enviado" || fu.status === "erro") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteFollowup(fu.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMFollowups;
