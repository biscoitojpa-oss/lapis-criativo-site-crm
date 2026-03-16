import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, GripVertical, Briefcase, FileText, Trash2, Pencil } from "lucide-react";

const ETAPAS = [
  { id: "prospeccao", label: "Prospecção", color: "border-t-blue-500" },
  { id: "contato", label: "Contato", color: "border-t-cyan-500" },
  { id: "negociacao", label: "Negociação", color: "border-t-amber-500" },
  { id: "proposta", label: "Proposta", color: "border-t-purple-500" },
  { id: "fechamento", label: "Fechamento", color: "border-t-emerald-500" },
] as const;

type Etapa = typeof ETAPAS[number]["id"];

interface PipelineCard {
  id: string;
  titulo: string;
  etapa: Etapa;
  valor: number;
  cliente_id: string | null;
  proposta_id: string | null;
  lead_id: string | null;
  observacoes: string | null;
  posicao: number;
  criado_em: string;
  cliente_nome?: string;
}

const emptyForm = { titulo: "", etapa: "prospeccao" as Etapa, valor: 0, cliente_id: "", observacoes: "" };

const CRMPipeline = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCards = useCallback(async () => {
    const { data } = await supabase
      .from("pipeline_cards")
      .select("*, clientes(nome)")
      .order("posicao", { ascending: true });

    if (data) {
      setCards(data.map((c: any) => ({ ...c, cliente_nome: c.clientes?.nome })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome").then(({ data }) => {
      if (data) setClientes(data);
    });
  }, [fetchCards]);

  const getColumnCards = (etapa: Etapa) =>
    cards.filter((c) => c.etapa === etapa).sort((a, b) => a.posicao - b.posicao);

  const getColumnTotal = (etapa: Etapa) =>
    getColumnCards(etapa).reduce((sum, c) => sum + Number(c.valor || 0), 0);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newEtapa = destination.droppableId as Etapa;
    const newPos = destination.index;

    // Optimistic update
    setCards((prev) => {
      const updated = prev.map((c) =>
        c.id === draggableId ? { ...c, etapa: newEtapa, posicao: newPos } : c
      );
      // Reorder cards in destination column
      const colCards = updated
        .filter((c) => c.etapa === newEtapa && c.id !== draggableId)
        .sort((a, b) => a.posicao - b.posicao);
      const movedCard = updated.find((c) => c.id === draggableId)!;
      colCards.splice(newPos, 0, movedCard);
      const reindexed = colCards.map((c, i) => ({ ...c, posicao: i }));

      return updated.map((c) => {
        if (c.etapa !== newEtapa) return c;
        const reCard = reindexed.find((r) => r.id === c.id);
        return reCard || c;
      });
    });

    await supabase
      .from("pipeline_cards")
      .update({ etapa: newEtapa, posicao: newPos, atualizado_em: new Date().toISOString() } as any)
      .eq("id", draggableId);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.error("Título é obrigatório"); return; }

    const payload: any = {
      titulo: form.titulo,
      etapa: form.etapa,
      valor: form.valor || 0,
      cliente_id: form.cliente_id || null,
      observacoes: form.observacoes || null,
      atualizado_em: new Date().toISOString(),
    };

    if (editingId) {
      await supabase.from("pipeline_cards").update(payload).eq("id", editingId);
      toast.success("Card atualizado");
    } else {
      payload.criado_por = user?.id;
      payload.posicao = getColumnCards(form.etapa).length;
      await supabase.from("pipeline_cards").insert(payload);
      toast.success("Card criado");
    }

    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchCards();
  };

  const handleEdit = (card: PipelineCard) => {
    setForm({
      titulo: card.titulo,
      etapa: card.etapa,
      valor: Number(card.valor),
      cliente_id: card.cliente_id || "",
      observacoes: card.observacoes || "",
    });
    setEditingId(card.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("pipeline_cards").delete().eq("id", id);
    toast.success("Card removido");
    fetchCards();
  };

  const openNew = (etapa?: Etapa) => {
    setForm({ ...emptyForm, etapa: etapa || "prospeccao" });
    setEditingId(null);
    setDialogOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando pipeline...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground">Arraste os cards entre as etapas do funil</p>
        </div>
        <Button onClick={() => openNew()} variant="hero" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Card
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {ETAPAS.map((etapa) => {
            const colCards = getColumnCards(etapa.id);
            const total = getColumnTotal(etapa.id);
            return (
              <div key={etapa.id} className={`flex-shrink-0 w-64 flex flex-col rounded-xl bg-muted/30 border border-border/50 border-t-4 ${etapa.color}`}>
                {/* Column Header */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{etapa.label}</h3>
                    <p className="text-xs text-muted-foreground">{colCards.length} cards</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">
                      R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <button
                      onClick={() => openNew(etapa.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={etapa.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 min-h-[100px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      }`}
                    >
                      {colCards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`group rounded-lg bg-card border border-border/50 p-3 shadow-sm transition-shadow ${
                                snap.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div {...prov.dragHandleProps} className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{card.titulo}</p>
                                  {card.cliente_nome && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <Briefcase className="w-3 h-3" />
                                      <span className="truncate">{card.cliente_nome}</span>
                                    </div>
                                  )}
                                  {Number(card.valor) > 0 && (
                                    <p className="text-xs font-semibold text-primary mt-1">
                                      R$ {Number(card.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                  {card.observacoes && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.observacoes}</p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEdit(card)} className="text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(card.id)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Card" : "Novo Card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="bg-background/50" placeholder="Ex: Proposta Website - Empresa X" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Etapa</label>
                <Select value={form.etapa} onValueChange={(v) => setForm({ ...form, etapa: v as Etapa })}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                <Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="bg-background/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cliente</label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Observações</label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="bg-background/50" rows={3} />
            </div>
            <Button variant="hero" className="w-full" onClick={handleSave}>
              {editingId ? "Salvar Alterações" : "Criar Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMPipeline;
