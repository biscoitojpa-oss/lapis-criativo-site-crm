import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Phone, RefreshCw, Bot, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EVOLUTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`;

interface Message {
  id: string;
  telefone: string;
  nome_contato: string | null;
  mensagem: string;
  direcao: string;
  instancia: string;
  criado_em: string;
}

interface EvolutionInstance {
  name: string;
  connectionStatus: string;
}

interface WhatsAppChatProps {
  phone: string;
  contactName?: string;
  instanceName?: string;
}

/** Garante que o número tenha DDI 55 (Brasil) */
const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Se começa com 0, remove
  const withoutZero = digits.startsWith("0") ? digits.slice(1) : digits;
  return `55${withoutZero}`;
};

const WhatsAppChat = ({ phone, contactName, instanceName: defaultInstance }: WhatsAppChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState(defaultInstance || "");
  const [handoffActive, setHandoffActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const normalizedPhone = normalizePhone(phone);

  const HIDDEN_INSTANCES = ["daher", "leads"];

  // Fetch available instances
  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const resp = await fetch(EVOLUTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "fetchInstances" }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const list: EvolutionInstance[] = (data.instances || data || [])
            .map((i: any) => ({
              name: i.name || i.instanceName || i.instance?.instanceName || "",
              connectionStatus: i.connectionStatus || i.state || "unknown",
            }))
            .filter((i: EvolutionInstance) => !HIDDEN_INSTANCES.some(h => i.name.toLowerCase() === h.toLowerCase()));
          setInstances(list);
          if (!selectedInstance && list.length > 0) {
            const connected = list.find((i) => i.connectionStatus === "open");
            setSelectedInstance(connected?.name || list[0].name);
          }
        }
      } catch {
        // silently fail
      }
    };
    fetchInstances();
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .eq("telefone", normalizedPhone)
      .order("criado_em", { ascending: true })
      .limit(200);
    setMessages((data || []) as unknown as Message[]);
    setLoading(false);
  }, [normalizedPhone]);

  useEffect(() => {
    if (!normalizedPhone) return;
    fetchMessages();

    const channel = supabase
      .channel(`whatsapp-${normalizedPhone}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_mensagens",
          filter: `telefone=eq.${normalizedPhone}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as unknown as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [normalizedPhone, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!selectedInstance) {
      toast.error("Selecione uma instância antes de enviar");
      return;
    }

    setSending(true);
    try {
      const resp = await fetch(EVOLUTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "sendTest",
          instanceName: selectedInstance,
          data: { number: normalizedPhone, text },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao enviar");
      }

      await supabase.from("whatsapp_mensagens").insert({
        telefone: normalizedPhone,
        nome_contato: contactName || null,
        mensagem: text,
        direcao: "enviada",
        instancia: selectedInstance,
      });

      setInput("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-sm">{contactName || normalizedPhone}</p>
            <p className="text-xs text-muted-foreground">{normalizedPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedInstance} onValueChange={setSelectedInstance}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-background/50 border-border/50">
              <SelectValue placeholder="Instância..." />
            </SelectTrigger>
            <SelectContent>
              {instances.map((inst) => (
                <SelectItem key={inst.name} value={inst.name}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${inst.connectionStatus === "open" ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                    {inst.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchMessages}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Carregando mensagens...</p>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-8">
            <Phone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-muted-foreground">Envie uma mensagem para iniciar a conversa.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direcao === "enviada" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.direcao === "enviada"
                ? "bg-emerald-600/90 text-white rounded-br-sm"
                : "bg-muted/50 border border-border/50 rounded-bl-sm"
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.mensagem}</p>
              <p className={`text-[10px] mt-1 ${msg.direcao === "enviada" ? "text-white/60" : "text-muted-foreground"}`}>
                {new Date(msg.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 bg-card/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Digite uma mensagem..."
            className="bg-background/50 border-border/50"
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !input.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChat;
