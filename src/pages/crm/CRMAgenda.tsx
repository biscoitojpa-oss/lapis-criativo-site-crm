import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Clock, CheckCircle2, AlertTriangle, Circle, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  prioridade: string;
  status: string;
  data_vencimento: string | null;
  data_conclusao: string | null;
  cliente_id: string | null;
  proposta_id: string | null;
  contrato_id: string | null;
  responsavel_id: string;
  criado_em: string;
  cliente?: { nome: string } | null;
};

const tipoLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  tarefa: { label: "Tarefa", icon: <Circle className="w-3 h-3" /> },
  reuniao: { label: "Reunião", icon: <Clock className="w-3 h-3" /> },
  lembrete: { label: "Lembrete", icon: <AlertTriangle className="w-3 h-3" /> },
  prazo: { label: "Prazo", icon: <CalendarIcon className="w-3 h-3" /> },
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-blue-500/20 text-blue-400",
  alta: "bg-amber-500/20 text-amber-400",
  urgente: "bg-destructive/20 text-destructive",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-500/20 text-amber-400",
  em_andamento: "bg-blue-500/20 text-blue-400",
  concluida: "bg-emerald-500/20 text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
};

type FormState = {
  titulo: string;
  descricao: string;
  tipo: "tarefa" | "reuniao" | "lembrete" | "prazo";
  prioridade: "baixa" | "media" | "alta" | "urgente";
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  data_vencimento: Date | null;
  cliente_id: string;
  proposta_id: string;
  contrato_id: string;
};

const emptyForm: FormState = {
  titulo: "",
  descricao: "",
  tipo: "tarefa",
  prioridade: "media",
  status: "pendente",
  data_vencimento: null,
  cliente_id: "",
  proposta_id: "",
  contrato_id: "",
};

const CRMAgenda = () => {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const fetchTarefas = async () => {
    const { data } = await supabase
      .from("tarefas")
      .select("*, cliente:clientes(nome)")
      .order("data_vencimento", { ascending: true, nullsFirst: false });
    setTarefas((data as any[]) || []);
    setLoading(false);
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome");
    setClientes(data || []);
  };

  useEffect(() => {
    fetchTarefas();
    fetchClientes();
  }, []);

  const openNew = (date?: Date) => {
    setEditId(null);
    setForm({ ...emptyForm, data_vencimento: date || null });
    setDialogOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    setEditId(t.id);
    setForm({
      titulo: t.titulo,
      descricao: t.descricao || "",
      tipo: t.tipo,
      prioridade: t.prioridade,
      status: t.status,
      data_vencimento: t.data_vencimento ? new Date(t.data_vencimento) : null,
      cliente_id: t.cliente_id || "",
      proposta_id: t.proposta_id || "",
      contrato_id: t.contrato_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      descricao: form.descricao || null,
      tipo: form.tipo as "tarefa" | "reuniao" | "lembrete" | "prazo",
      prioridade: form.prioridade as "baixa" | "media" | "alta" | "urgente",
      status: form.status as "pendente" | "em_andamento" | "concluida" | "cancelada",
      data_vencimento: form.data_vencimento?.toISOString() || null,
      cliente_id: form.cliente_id || null,
      proposta_id: form.proposta_id || null,
      contrato_id: form.contrato_id || null,
    };

    if (editId) {
      const { error } = await supabase.from("tarefas").update(payload).eq("id", editId);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Tarefa atualizada");
    } else {
      const { error } = await supabase.from("tarefas").insert({
        ...payload,
        responsavel_id: user!.id,
        criado_por: user!.id,
      } as any);
      if (error) { toast.error("Erro ao criar tarefa"); setSaving(false); return; }
      toast.success("Tarefa criada");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTarefas();
  };

  const toggleConcluida = async (t: Tarefa) => {
    const novoStatus = t.status === "concluida" ? "pendente" : "concluida";
    await supabase.from("tarefas").update({
      status: novoStatus,
      data_conclusao: novoStatus === "concluida" ? new Date().toISOString() : null,
    }).eq("id", t.id);
    fetchTarefas();
  };

  const deleteTarefa = async (id: string) => {
    await supabase.from("tarefas").delete().eq("id", id);
    toast.success("Tarefa removida");
    fetchTarefas();
  };

  // Dates that have tasks (for calendar highlighting)
  const datesWithTasks = useMemo(() => {
    const dates = new Set<string>();
    tarefas.forEach(t => {
      if (t.data_vencimento) dates.add(startOfDay(new Date(t.data_vencimento)).toISOString());
    });
    return dates;
  }, [tarefas]);

  // Filter tasks
  const filteredTarefas = useMemo(() => {
    let list = tarefas;
    if (selectedDate) {
      list = list.filter(t => t.data_vencimento && isSameDay(new Date(t.data_vencimento), selectedDate));
    }
    if (filtroStatus !== "todos") {
      list = list.filter(t => t.status === filtroStatus);
    }
    return list;
  }, [tarefas, selectedDate, filtroStatus]);

  // Stats
  const stats = useMemo(() => {
    const hoje = new Date();
    return {
      total: tarefas.filter(t => t.status !== "cancelada").length,
      pendentes: tarefas.filter(t => t.status === "pendente").length,
      atrasadas: tarefas.filter(t => t.status === "pendente" && t.data_vencimento && isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento))).length,
      concluidas: tarefas.filter(t => t.status === "concluida").length,
    };
  }, [tarefas]);

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoje";
    if (isTomorrow(d)) return "Amanhã";
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const isOverdue = (t: Tarefa) => t.status === "pendente" && t.data_vencimento && isPast(new Date(t.data_vencimento)) && !isToday(new Date(t.data_vencimento));

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Agenda & Tarefas</h1>
          <p className="text-sm text-muted-foreground">Gerencie tarefas, reuniões e lembretes.</p>
        </div>
        <Button variant="hero" onClick={() => openNew()}><Plus className="w-4 h-4" /> Nova Tarefa</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pendentes", value: stats.pendentes, color: "text-amber-400" },
          { label: "Atrasadas", value: stats.atrasadas, color: "text-destructive" },
          { label: "Concluídas", value: stats.concluidas, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Calendar */}
        <div className="glass-card p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => setSelectedDate(d || undefined)}
            locale={ptBR}
            className="p-3 pointer-events-auto"
            modifiers={{ hasTasks: (date) => datesWithTasks.has(startOfDay(date).toISOString()) }}
            modifiersClassNames={{ hasTasks: "bg-primary/20 font-bold text-primary" }}
          />
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setSelectedDate(undefined)}>
            Ver todas as tarefas
          </Button>
          {selectedDate && (
            <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => openNew(selectedDate)}>
              <Plus className="w-3 h-3 mr-1" /> Adicionar em {format(selectedDate, "dd/MM")}
            </Button>
          )}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredTarefas.length} tarefa(s)
              {selectedDate && ` em ${format(selectedDate, "dd/MM/yyyy")}`}
            </span>
          </div>

          {filteredTarefas.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              Nenhuma tarefa encontrada.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTarefas.map(t => (
                <div
                  key={t.id}
                  className={cn(
                    "glass-card p-4 flex items-start gap-3 group transition-colors",
                    t.status === "concluida" && "opacity-60",
                    isOverdue(t) && "border-destructive/50"
                  )}
                >
                  <button onClick={() => toggleConcluida(t)} className="mt-0.5 flex-shrink-0">
                    {t.status === "concluida" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-medium text-sm", t.status === "concluida" && "line-through")}>{t.titulo}</span>
                      <Badge variant="outline" className={cn("text-[10px]", prioridadeColors[t.prioridade])}>
                        {t.prioridade}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {tipoLabels[t.tipo]?.icon} {tipoLabels[t.tipo]?.label}
                      </Badge>
                      {isOverdue(t) && <Badge className="bg-destructive/20 text-destructive text-[10px]">Atrasada</Badge>}
                    </div>
                    {t.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.descricao}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {t.data_vencimento && (
                        <span className={cn(isOverdue(t) && "text-destructive")}>
                          <CalendarIcon className="w-3 h-3 inline mr-1" />
                          {getDateLabel(t.data_vencimento)}
                        </span>
                      )}
                      {t.cliente && <span>• {t.cliente.nome}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTarefa(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Nova/Editar Tarefa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="bg-background/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="bg-background/50" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                    <SelectItem value="prazo">Prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data de vencimento</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left bg-background/50", !form.data_vencimento && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {form.data_vencimento ? format(form.data_vencimento, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.data_vencimento || undefined}
                    onSelect={d => setForm({ ...form, data_vencimento: d || null })}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cliente vinculado</label>
              <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editId && (
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMAgenda;
