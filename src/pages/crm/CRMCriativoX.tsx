import { useState, useRef, useEffect } from "react";
import { Bot, Send, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import WhatsAppChat from "@/components/WhatsAppChat";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criativo-x-chat`;

const CRMCriativoX = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Load recent WhatsApp contacts
    supabase
      .from("whatsapp_mensagens")
      .select("telefone, nome_contato")
      .order("criado_em", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          const unique = new Map<string, string>();
          data.forEach((m: any) => {
            if (!unique.has(m.telefone)) unique.set(m.telefone, m.nome_contato || m.telefone);
          });
          setRecentContacts(Array.from(unique.entries()).map(([phone, name]) => ({ phone, name })));
        }
      });
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao conectar");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Criativo X</h1>
            <p className="text-xs text-muted-foreground">Agente de IA para WhatsApp • Usa a Base de Conhecimento</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="text-muted-foreground">
            <Trash2 className="w-4 h-4" /> Limpar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-muted/30 border border-border/50 mb-3">
          <TabsTrigger value="chat"><Bot className="w-4 h-4 mr-1.5" />Testar Agente</TabsTrigger>
          <TabsTrigger value="conversas"><MessageCircle className="w-4 h-4 mr-1.5" />Conversas WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="flex-1 overflow-y-auto glass-card p-4 space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Teste o agente Criativo X aqui.</p>
                <p className="text-xs">Ele responde com base na sua Base de Conhecimento.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted/50 border border-border/50 rounded-bl-sm"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Digite uma mensagem para testar o agente..."
              className="bg-background/50 border-border/50"
              disabled={isLoading}
            />
            <Button onClick={send} disabled={isLoading || !input.trim()} variant="hero">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="conversas" className="flex-1 flex min-h-0 mt-0 gap-4">
          {/* Contact list */}
          <div className="w-64 flex-shrink-0 glass-card overflow-y-auto">
            <div className="p-3 border-b border-border/50">
              <h3 className="font-semibold text-sm">Contatos</h3>
              <div className="mt-2">
                <div className="flex gap-1">
                  <Input
                    placeholder="Número..."
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    className="bg-background/50 border-border/50 h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && whatsappPhone && setShowWhatsApp(true)}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => { if (whatsappPhone) setShowWhatsApp(true); }}>
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {recentContacts.map((c) => (
                <button
                  key={c.phone}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors ${whatsappPhone === c.phone && showWhatsApp ? "bg-primary/10" : ""}`}
                  onClick={() => { setWhatsappPhone(c.phone); setShowWhatsApp(true); }}
                >
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </button>
              ))}
              {recentContacts.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma conversa ainda</p>
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 glass-card overflow-hidden">
            {showWhatsApp && whatsappPhone ? (
              <WhatsAppChat phone={whatsappPhone} contactName={recentContacts.find(c => c.phone === whatsappPhone)?.name} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecione um contato ou digite um número</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMCriativoX;
