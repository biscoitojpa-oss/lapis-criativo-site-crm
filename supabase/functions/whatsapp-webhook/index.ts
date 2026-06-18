import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function splitMessage(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (current && (current.length + trimmed.length + 2) > 500) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  if (chunks.length === 1 && chunks[0].length > 600) {
    const sentences = chunks[0].split(/(?<=[.!?])\s+/);
    const sentenceChunks: string[] = [];
    let curr = "";
    for (const s of sentences) {
      if (curr && (curr.length + s.length + 1) > 400) {
        sentenceChunks.push(curr.trim());
        curr = s;
      } else {
        curr = curr ? `${curr} ${s}` : s;
      }
    }
    if (curr.trim()) sentenceChunks.push(curr.trim());
    if (sentenceChunks.length > 1) return sentenceChunks;
  }
  return chunks.length > 0 ? chunks : [text];
}

/** Extract message text and type from Evolution GO webhook payload */
function extractMessage(payload: any): { phone: string; pushName: string; text: string; type: string; mediaBase64?: string; mediaMime?: string; instanceName: string; fromMe: boolean } {
  // Evolution GO payload shape (whatsmeow-based):
  //   { event: "Message", instance: { name, instanceId }, data: { Info: {...}, Message: {...} } }
  // Fallback: legacy Evolution v2 shape { event: "messages.upsert", instance, data: { key, message, pushName } }
  const data = payload.data || payload;
  const Info = data.Info || data.info;
  const Message = data.Message || data.message;
  const instanceName = payload.instance?.name || payload.instance || payload.instanceName || "";

  if (Info) {
    // Evolution GO native shape
    const remoteJid: string = Info.Chat || Info.RemoteJid || Info.remoteJid || "";
    const phone = remoteJid.replace(/@s\.whatsapp\.net|@g\.us|@c\.us/, "");
    const pushName = Info.PushName || Info.Notify || phone;
    const fromMe = !!(Info.IsFromMe || Info.FromMe || Info.fromMe);

    let text = "";
    let type = "text";
    let mediaBase64: string | undefined;
    let mediaMime: string | undefined;

    if (Message) {
      if (Message.conversation) {
        text = Message.conversation;
      } else if (Message.extendedTextMessage?.text) {
        text = Message.extendedTextMessage.text;
      } else if (Message.imageMessage) {
        type = "image";
        text = Message.imageMessage.caption || "";
        mediaBase64 = Message.imageMessage.base64 || Message.imageMessage.Base64;
        mediaMime = Message.imageMessage.mimetype || "image/jpeg";
      } else if (Message.videoMessage) {
        type = "video";
        text = Message.videoMessage.caption || "";
        mediaBase64 = Message.videoMessage.base64 || Message.videoMessage.Base64;
        mediaMime = Message.videoMessage.mimetype || "video/mp4";
      } else if (Message.audioMessage) {
        type = "audio";
        mediaBase64 = Message.audioMessage.base64 || Message.audioMessage.Base64;
        mediaMime = Message.audioMessage.mimetype || "audio/ogg";
      } else if (Message.documentMessage) {
        type = "document";
        text = Message.documentMessage.caption || Message.documentMessage.fileName || "";
        mediaBase64 = Message.documentMessage.base64 || Message.documentMessage.Base64;
        mediaMime = Message.documentMessage.mimetype;
      } else if (Message.stickerMessage) {
        type = "sticker";
        mediaBase64 = Message.stickerMessage.base64 || Message.stickerMessage.Base64;
        mediaMime = Message.stickerMessage.mimetype || "image/webp";
      }
    }

    return { phone, pushName, text, type, mediaBase64, mediaMime, instanceName, fromMe };
  }

  // Legacy fallback
  const messageKey = data.key;
  const remoteJid: string = messageKey?.remoteJid || "";
  const phone = remoteJid.replace(/@s\.whatsapp\.net|@g\.us|@c\.us/, "");
  const pushName = data.pushName || phone;
  const fromMe = !!messageKey?.fromMe;
  const text = data.message?.conversation || data.message?.extendedTextMessage?.text || "";
  return { phone, pushName, text, type: "text", instanceName, fromMe };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body).slice(0, 600));

    const event = body.event || body.data?.event || "";
    const allowedEvents = ["Message", "message", "messages.upsert", "MESSAGE"];
    if (!allowedEvents.includes(event)) {
      return new Response(JSON.stringify({ ok: true, ignored: event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { phone, pushName, text: messageText, type: msgType, mediaBase64, mediaMime, instanceName, fromMe } = extractMessage(body);

    if (fromMe || !phone || phone.includes("@g.us")) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Message from ${phone} (${pushName}): type=${msgType} text="${messageText}"`);

    if (!messageText && msgType === "text") {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const EVOLUTION_GO_URL = Deno.env.get("EVOLUTION_GO_URL")!;
    const EVOLUTION_GO_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!EVOLUTION_GO_URL || !EVOLUTION_GO_API_KEY) throw new Error("Evolution GO não configurada");

    // Resolve instance token
    const instResp = await fetch(`${EVOLUTION_GO_URL}/instance/all`, {
      headers: { apikey: EVOLUTION_GO_API_KEY, "Content-Type": "application/json" },
    });
    const instData = instResp.ok ? await instResp.json() : {};
    const instList = Array.isArray(instData) ? instData : (instData.instances || instData.data || []);
    const tokenMap = new Map<string, string>();
    for (const i of instList) {
      const n = (i.name || i.Name || i.instanceName || "").toLowerCase();
      const t = i.token || i.Token || i.apikey || i.apiKey;
      if (n && t) tokenMap.set(n, t);
    }
    const instanceToken = tokenMap.get(instanceName.toLowerCase());

    const sendText = async (text: string) => {
      if (!instanceToken) {
        console.error(`Instance token not found for ${instanceName}`);
        return;
      }
      const r = await fetch(`${EVOLUTION_GO_URL}/send/text`, {
        method: "POST",
        headers: { apikey: instanceToken, "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, text }),
      });
      if (!r.ok) console.error("send/text error:", r.status, await r.text());
    };

    // Save incoming message
    const incomingLabel = msgType === "text" ? messageText : `[${msgType}] ${messageText || "Mídia recebida"}`;
    await supabase.from("whatsapp_mensagens").insert({
      telefone: phone,
      nome_contato: pushName,
      mensagem: incomingLabel,
      direcao: "recebida",
      instancia: instanceName,
      tipo: msgType,
    });

    // Cancel pending auto follow-ups
    await supabase.from("whatsapp_followups")
      .update({ status: "cancelado", atualizado_em: new Date().toISOString(), erro: "Cliente respondeu" })
      .eq("telefone", phone)
      .eq("status", "agendado")
      .eq("origem", "auto");

    // Handoff check
    const { data: handoff } = await supabase
      .from("whatsapp_handoff")
      .select("*")
      .eq("telefone", phone)
      .eq("ativo", true)
      .maybeSingle();

    // Notify team
    const { data: allProfiles } = await supabase.from("profiles").select("user_id");
    if (allProfiles) {
      for (const p of allProfiles) {
        await supabase.from("notificacoes").insert({
          user_id: p.user_id,
          titulo: "Nova mensagem WhatsApp",
          mensagem: `${pushName} (${phone}): ${incomingLabel.slice(0, 100)}${incomingLabel.length > 100 ? "..." : ""}`,
          tipo: "whatsapp",
          link: `/crm/whatsapp`,
        });
      }
    }

    if (handoff) {
      console.log(`Handoff ativo para ${phone}, agente pausado.`);
      return new Response(JSON.stringify({ ok: true, handoff: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const humanKeywords = [
      "falar com humano", "falar com alguém", "falar com alguem", "atendente",
      "falar com pessoa", "pessoa real", "atendimento humano", "falar com a equipe",
      "quero falar com", "consultor", "falar com um consultor", "humano",
      "atendente real", "pessoa de verdade",
    ];
    const lowerText = messageText.toLowerCase();
    const wantsHuman = humanKeywords.some(kw => lowerText.includes(kw));

    if (wantsHuman) {
      await supabase.from("whatsapp_handoff").upsert(
        { telefone: phone, ativo: true, ativado_em: new Date().toISOString() },
        { onConflict: "telefone" }
      );

      const handoffMsg = "Entendido! 😊 Vou transferir você para um de nossos consultores. Ele vai te responder em breve. Fique à vontade!";
      await sendText(handoffMsg);

      await supabase.from("whatsapp_mensagens").insert({
        telefone: phone, nome_contato: "Criativo X",
        mensagem: handoffMsg, direcao: "enviada", instancia: instanceName,
      });

      if (allProfiles) {
        for (const p of allProfiles) {
          await supabase.from("notificacoes").insert({
            user_id: p.user_id,
            titulo: "Atendimento Humano Solicitado",
            mensagem: `${pushName} (${phone}) pediu para falar com um humano.`,
            tipo: "handoff",
            link: `/crm/whatsapp`,
          });
        }
      }

      console.log(`Handoff ativado para ${phone}`);
      return new Response(JSON.stringify({ ok: true, handoff: "activated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI messages
    const aiMessages: any[] = [];

    const { data: history } = await supabase
      .from("whatsapp_mensagens")
      .select("mensagem, direcao")
      .eq("telefone", phone)
      .order("criado_em", { ascending: false })
      .limit(10);

    if (history && history.length > 0) {
      const reversedHistory = [...history].reverse();
      for (const h of reversedHistory) {
        aiMessages.push({
          role: h.direcao === "recebida" ? "user" : "assistant",
          content: h.mensagem,
        });
      }
    }

    // Build media content (Evolution GO already provides base64 inline)
    let mediaContent: any = null;
    if (msgType !== "text" && mediaBase64) {
      if (msgType === "audio") {
        mediaContent = {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: mediaBase64,
                format: (mediaMime || "").includes("ogg") ? "ogg" : (mediaMime || "").includes("mp4") ? "mp4" : "wav",
              },
            },
            { type: "text", text: messageText || "O cliente enviou um áudio. Transcreva e responda ao que ele disse." },
          ],
        };
      } else if (msgType === "image" || msgType === "sticker") {
        mediaContent = {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mediaMime || "image/jpeg"};base64,${mediaBase64}` } },
            { type: "text", text: messageText || "O cliente enviou uma imagem. Descreva o que vê e responda de forma útil." },
          ],
        };
      } else {
        mediaContent = {
          role: "user",
          content: `O cliente enviou um documento. ${messageText || "Responda que recebeu o documento e vai encaminhar para a equipe."}`,
        };
      }
    } else if (msgType !== "text") {
      mediaContent = {
        role: "user",
        content: `O cliente enviou um ${msgType === "audio" ? "áudio" : msgType === "image" ? "imagem" : "documento"}. ${messageText || "Responda que recebeu e que vai verificar com a equipe."}`,
      };
    }

    if (mediaContent) {
      if (aiMessages.length > 0 && aiMessages[aiMessages.length - 1].role === "user") {
        aiMessages[aiMessages.length - 1] = mediaContent;
      } else {
        aiMessages.push(mediaContent);
      }
    } else if (aiMessages.length === 0) {
      aiMessages.push({ role: "user", content: messageText });
    }

    const { data: knowledge } = await supabase
      .from("base_conhecimento")
      .select("titulo, conteudo, categoria")
      .eq("ativo", true);

    const knowledgeContext = knowledge
      ?.map((k: any) => `[${k.categoria}] ${k.titulo}: ${k.conteudo}`)
      .join("\n\n") || "Sem dados na base de conhecimento.";

    const systemPrompt = `Você é o Criativo X, assistente virtual da Lápis Criativo - Agência de Marketing Digital.
Seja simpático, profissional e objetivo. Responda em português do Brasil.
Use emojis com moderação.

IMPORTANTE - FORMATO DE RESPOSTA:
- Escreva respostas CURTAS, como se fosse uma pessoa conversando no WhatsApp.
- Separe ideias diferentes em parágrafos curtos (1-2 frases por parágrafo).
- NÃO use listas com marcadores ou formatação complexa.
- Seja direto e conversacional, como um humano digitando.
- Cada parágrafo será enviado como uma mensagem separada.

BASE DE CONHECIMENTO DA EMPRESA:
${knowledgeContext}

REGRAS:
- Nunca invente preços ou prazos que não estejam na base de conhecimento
- Se perguntarem algo fora do escopo, responda educadamente que vai verificar com a equipe
- Incentive o lead a agendar uma reunião ou falar com um consultor
- Se receber um áudio, responda ao que foi dito
- Se receber uma imagem, comente sobre ela de forma relevante
- Se o cliente quiser falar com uma pessoa real, diga que vai transferir para um consultor
- Quando o assunto for complexo ou o cliente parecer insatisfeito, sugira falar com um humano

FLUXO DE HANDOFF:
- Quando o cliente pedir para falar com um humano, ofereça transferir.
- Se o cliente RECUSAR o handoff (ex: "não precisa", "agora não", "depois", "não quero"), responda que tudo bem e encerre o assunto de forma educada. Inclua EXATAMENTE o texto "[FOLLOWUP_DECLINED]" no final da sua resposta (será invisível para o cliente). Isso agendará automaticamente um follow-up.
- Se o cliente aceitar, transfira normalmente.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...aiMessages],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      throw new Error("Erro na IA");
    }

    const aiData = await aiResponse.json();
    let fullReply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Vou encaminhar para nossa equipe! 🙏";

    const followupDeclined = fullReply.includes("[FOLLOWUP_DECLINED]");
    if (followupDeclined) {
      fullReply = fullReply.replace("[FOLLOWUP_DECLINED]", "").trim();

      const followupDate = new Date();
      followupDate.setHours(followupDate.getHours() + 24);
      if (followupDate.getHours() < 10) followupDate.setHours(10, 0, 0, 0);
      if (followupDate.getHours() > 19) {
        followupDate.setDate(followupDate.getDate() + 1);
        followupDate.setHours(10, 0, 0, 0);
      }

      const recentMessages = aiMessages.slice(-6).map((m: any) => {
        const t = typeof m.content === "string" ? m.content : "[mídia]";
        return `${m.role === "user" ? "Cliente" : "Agente"}: ${t}`;
      }).join("\n");

      let followupMsg = `Oi ${pushName?.split(" ")[0] || ""}! 😊 Tudo bem? Conversamos outro dia e fiquei pensando se posso te ajudar com algo. Estou por aqui! 🚀`;

      try {
        const followupAI = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Você é o Criativo X da Lápis Criativo. Gere UMA mensagem curta de follow-up (máx 2 frases) para WhatsApp.
- Simpática e natural, como pessoa real
- Referencie sutilmente o ASSUNTO da última conversa
- Convide o cliente a retomar a conversa
- Use 1-2 emojis
- NÃO mencione recusa de humano
- NÃO use markdown ou listas
Responda APENAS com a mensagem.`,
              },
              { role: "user", content: `Nome: ${pushName || "cliente"}\n\nÚltimas mensagens:\n${recentMessages}\n\nGere a mensagem:` },
            ],
          }),
        });
        if (followupAI.ok) {
          const fd = await followupAI.json();
          const generated = fd.choices?.[0]?.message?.content?.trim();
          if (generated && generated.length > 10 && generated.length < 500) followupMsg = generated;
        }
      } catch (e) { console.error("Follow-up AI error:", e); }

      await supabase.from("whatsapp_followups").insert({
        telefone: phone,
        nome_contato: pushName,
        mensagem: followupMsg,
        motivo: "remarketing",
        instancia: instanceName,
        agendado_para: followupDate.toISOString(),
        origem: "auto",
      });
    }

    const messageChunks = splitMessage(fullReply);
    console.log(`Sending ${messageChunks.length} message(s) to ${phone}`);
    const allReplies: string[] = [];

    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i];
      if (i > 0) {
        const typingDelay = randInt(1500, 3000) + Math.min(chunk.length * 15, 3000);
        await sleep(typingDelay);
      }

      await sendText(chunk);

      await supabase.from("whatsapp_mensagens").insert({
        telefone: phone,
        nome_contato: "Criativo X",
        mensagem: chunk,
        direcao: "enviada",
        instancia: instanceName,
      });

      allReplies.push(chunk);
    }

    await supabase.from("leads").upsert({
      nome: pushName || phone,
      email: `${phone}@whatsapp`,
      whatsapp: phone,
      ferramenta: "criativo-x-whatsapp",
      dados_entrada: { ultima_mensagem: messageText || `[${msgType}]`, resposta_ia: allReplies.join(" ") },
    }, { onConflict: "email" }).select();

    return new Response(JSON.stringify({ ok: true, chunks: messageChunks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
