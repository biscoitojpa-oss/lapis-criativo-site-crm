import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, FilePlus, Phone, Mail, MapPin, Building, MessageCircle, Pencil, CalendarPlus, CheckCircle2, Circle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import WhatsAppChat from "@/components/WhatsAppChat";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const propostaStatusLabels: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Gerada", color: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", color: "bg-blue-500/20 text-blue-400" },
  aprovada: { label: "Aceita", color: "bg-emerald-500/20 text-emerald-400" },
  recusada: { label: "Não Aceita", color: "bg-destructive/20 text-destructive" },
  cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
};

const contratoStatusLabels: Record<string, { label: string; color: string }> = {
  ativo: { label: "Gerado", color: "bg-blue-500/20 text-blue-400" },
  encerrado: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
  cancelado: { label: "Desistiu", color: "bg-destructive/20 text-destructive" },
  suspenso: { label: "Suspenso", color: "bg-amber-500/20 text-amber-400" },
};

const ClienteDetalhe = () => {
  const { clienteId } = useParams<{ clienteId: string }>();
  const { user } = useAuth();
  const [cliente, setCliente] = useState<any>(null);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [tarefaDialogOpen, setTarefaDialogOpen] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: "", tipo: "tarefa" as string, prioridade: "media" as string });

  const loadData = () => {
    if (!clienteId) return;
    Promise.all([
      supabase.from("clientes").select("*").eq("id", clienteId).single(),
      supabase.from("propostas").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: false }),
      supabase.from("contratos").select("*").eq("cliente_id", clienteId).order("criado_em", { ascending: false }),
    ]).then(([cRes, pRes, ctRes]) => {
      setCliente(cRes.data);
      setPropostas(pRes.data || []);
      setContratos(ctRes.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, [clienteId]);

  const openEdit = () => {
    setEditForm({
      nome: cliente.nome || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      whatsapp: cliente.whatsapp || "",
      empresa: cliente.empresa || "",
      cnpj_cpf: cliente.cnpj_cpf || "",
      endereco: cliente.endereco || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      cep: cliente.cep || "",
      observacoes: cliente.observacoes || "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("clientes").update(editForm).eq("id", clienteId!);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Cliente atualizado");
    setEditOpen(false);
    loadData();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!cliente) return <div className="p-8 text-center">Cliente não encontrado</div>;

  const getContratoLabel = (c: any) => {
    if (c.assinatura_cliente) return { label: "Assinado", color: "bg-emerald-500/20 text-emerald-400" };
    return contratoStatusLabels[c.status] || { label: c.status, color: "bg-muted text-muted-foreground" };
  };

  const clientePhone = cliente.whatsapp?.replace(/\D/g, "") || cliente.telefone?.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      <Link to="/crm/clientes" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info do Cliente */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-bold">{cliente.nome}</h1>
            <Button variant="ghost" size="icon" onClick={openEdit}><Pencil className="w-4 h-4" /></Button>
          </div>
          {cliente.empresa && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building className="w-4 h-4" />{cliente.empresa}</div>}
          {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><a href={`mailto:${cliente.email}`} className="hover:text-primary">{cliente.email}</a></div>}
          {cliente.whatsapp && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-emerald-400">{cliente.whatsapp}</span>
            </div>
          )}
          {cliente.cidade && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" />{cliente.cidade}{cliente.estado ? ` - ${cliente.estado}` : ""}</div>}
          {cliente.cnpj_cpf && <div className="text-sm text-muted-foreground">CNPJ/CPF: {cliente.cnpj_cpf}</div>}
          {cliente.observacoes && <div className="text-sm text-muted-foreground border-t border-border/50 pt-4">{cliente.observacoes}</div>}
          
          <div className="flex flex-wrap gap-2 pt-4">
            <Link to={`/crm/propostas/nova?cliente=${clienteId}`}>
              <Button variant="outline" size="sm"><FileText className="w-4 h-4" /> Nova Proposta</Button>
            </Link>
            <Link to={`/crm/contratos/novo?cliente=${clienteId}`}>
              <Button variant="outline" size="sm"><FilePlus className="w-4 h-4" /> Novo Contrato</Button>
            </Link>
            {clientePhone && (
              <Button variant="outline" size="sm" className="text-emerald-400" onClick={() => setShowChat(!showChat)}>
                <MessageCircle className="w-4 h-4" /> {showChat ? "Fechar Chat" : "WhatsApp"}
              </Button>
            )}
          </div>
        </div>

        {/* Propostas */}
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Propostas ({propostas.length})
          </h2>
          {propostas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma proposta emitida.</p>
          ) : (
            <div className="space-y-3">
              {propostas.map((p) => {
                const status = propostaStatusLabels[p.status] || { label: p.status, color: "" };
                return (
                  <Link key={p.id} to={`/crm/propostas/${p.id}`} className="block p-3 rounded-lg bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">#{p.numero} - {p.titulo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">R$ {Number(p.valor_total).toFixed(2)} • {new Date(p.criado_em).toLocaleDateString("pt-BR")}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Contratos */}
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-primary" /> Contratos ({contratos.length})
          </h2>
          {contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contrato gerado.</p>
          ) : (
            <div className="space-y-3">
              {contratos.map((c) => {
                const status = getContratoLabel(c);
                return (
                  <Link key={c.id} to={`/crm/contratos/${c.id}`} className="block p-3 rounded-lg bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">#{c.numero} - {c.titulo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      R$ {Number(c.valor_total).toFixed(2)} • {c.tipo_pagamento === "mensal" ? `${c.duracao_meses} meses` : "Pagamento único"}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Chat Panel */}
      {showChat && clientePhone && (
        <div className="glass-card overflow-hidden" style={{ height: "500px" }}>
          <WhatsAppChat phone={clientePhone} contactName={cliente.nome} />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <Input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp</label>
                <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <Input value={editForm.empresa} onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CNPJ/CPF</label>
                <Input value={editForm.cnpj_cpf} onChange={(e) => setEditForm({ ...editForm, cnpj_cpf: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cidade</label>
                <Input value={editForm.cidade} onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <Input value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })} className="bg-background/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CEP</label>
                <Input value={editForm.cep} onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })} className="bg-background/50" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Endereço</label>
              <Input value={editForm.endereco} onChange={(e) => setEditForm({ ...editForm, endereco: e.target.value })} className="bg-background/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Observações</label>
              <Textarea value={editForm.observacoes} onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })} className="bg-background/50" rows={3} />
            </div>
            <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClienteDetalhe;
