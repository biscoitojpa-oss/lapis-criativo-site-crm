import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Sleep helper */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Random int between min and max (inclusive) */
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Split a long message into smaller chunks by paragraphs, keeping each under ~500 chars */
function splitMessage(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph makes it too long, push current and start new
    if (current && (current.length + trimmed.length + 2) > 500) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // If we only got 1 chunk but it's long, try splitting by sentences
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

/** Download media from Evolution API */
async function downloadMedia(
  evolutionUrl: string,
  apiKey: string,
  instanceName: string,
  messageData: any
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // Try mediaUrl first (some versions provide it directly)
    const mediaUrl = messageData.message?.mediaUrl || messageData.mediaUrl;
    if (mediaUrl) {
      const resp = await fetch(mediaUrl);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const mimeType = resp.headers.get("content-type") || "application/octet-stream";
        return { base64, mimeType };
      }
    }

    // Use Evolution API media endpoint
    const messageId = messageData.key?.id;
    if (!messageId) return null;

    const resp = await fetch(`${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { key: messageData.key }, convertToMp4: false }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.base64) {
        const mimeType = data.mimetype || data.mimeType || "application/octet-stream";
        return { base64: data.base64, mimeType };
      }
    }
  } catch (e) {
    console.error("Media download error:", e);
  }
  return null;
}

/** Get message type from Evolution API payload */
function getMessageType(message: any): string {
  if (message.audioMessage || message.message?.audioMessage) return "audio";
  if (message.imageMessage || message.message?.imageMessage) return "image";
  if (message.videoMessage || message.message?.videoMessage) return "video";
  if (message.documentMessage || message.message?.documentMessage) return "document";
  if (message.stickerMessage || message.message?.stickerMessage) return "sticker";
  return "text";
}

/** Get caption from media messages */
function getCaption(message: any): string {
  return (
    message.imageMessage?.caption ||
    message.message?.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.message?.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.message?.documentMessage?.caption ||
    ""
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body).slice(0, 500));

    const event = body.event || body.data?.event;
    if (event !== "messages.upsert" && event !== "message") {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const message = body.data || body;
    const messageKey = message.key || message.message?.key;
    if (!message || messageKey?.fromMe) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const remoteJid = messageKey?.remoteJid || "";
    // Ignore group messages
    if (remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
    const instanceName = body.instance || "default";
    const pushName = message.pushName || phone;
    const msgType = getMessageType(message);
    const messageText = message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      getCaption(message) || "";

    console.log(`Message from ${phone} (${pushName}): type=${msgType} text="${messageText}"`);

    // If no text and no media, ignore
    if (!messageText && msgType === "text") {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) throw new Error("Evolution API não configurada");

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

    // Cancel any pending auto follow-ups since client is active
    await supabase.from("whatsapp_followups")
      .update({ status: "cancelado", atualizado_em: new Date().toISOString(), erro: "Cliente respondeu" })
      .eq("telefone", phone)
      .eq("status", "agendado")
      .eq("origem", "auto");

    // ===== HUMAN HANDOFF CHECK =====
    // Check if human handoff is active for this phone
    const { data: handoff } = await supabase
      .from("whatsapp_handoff")
      .select("*")
      .eq("telefone", phone)
      .eq("ativo", true)
      .single();

    // Notify all team members about the incoming message
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
      console.log(`Handoff ativo para ${phone}, agente pausado. Aguardando humano.`);
      return new Response(JSON.stringify({ ok: true, handoff: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GLOBAL AGENT PAUSE CHECK =====
    const { data: globalCfg } = await supabase
      .from("whatsapp_config")
      .select("agente_pausado")
      .limit(1)
      .single();
    if (globalCfg?.agente_pausado) {
      console.log(`Agente Criativo X pausado globalmente. Mensagem de ${phone} registrada mas sem resposta automática.`);
      return new Response(JSON.stringify({ ok: true, paused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user wants to talk to a human
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
      await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, text: handoffMsg }),
      });

      await supabase.from("whatsapp_mensagens").insert({
        telefone: phone, nome_contato: "Criativo X",
        mensagem: handoffMsg, direcao: "enviada", instancia: instanceName,
      });

      // Notify team about handoff
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

    // Build AI messages array
    const aiMessages: any[] = [];

    // Get conversation history (last 10 messages for context)
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

    // Handle media messages (audio, image, document)
    let mediaContent: any = null;
    if (msgType !== "text") {
      const media = await downloadMedia(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, message);
      if (media) {
        if (msgType === "audio") {
          // Send audio as inline_data to Gemini (supports audio natively)
          mediaContent = {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: media.base64,
                  format: media.mimeType.includes("ogg") ? "ogg" : media.mimeType.includes("mp4") ? "mp4" : "wav",
                },
              },
              ...(messageText ? [{ type: "text", text: messageText }] : [{ type: "text", text: "O cliente enviou um áudio. Transcreva e responda ao que ele disse." }]),
            ],
          };
        } else if (msgType === "image" || msgType === "sticker") {
          mediaContent = {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${media.mimeType};base64,${media.base64}` },
              },
              { type: "text", text: messageText || "O cliente enviou uma imagem. Descreva o que vê e responda de forma útil." },
            ],
          };
        } else if (msgType === "document") {
          // For documents, mention it in context
          mediaContent = {
            role: "user",
            content: `O cliente enviou um documento. ${messageText || "Responda que você recebeu o documento e vai encaminhar para a equipe analisar."}`,
          };
        }
      } else {
        // Couldn't download media
        mediaContent = {
          role: "user",
          content: `O cliente enviou um ${msgType === "audio" ? "áudio" : msgType === "image" ? "imagem" : "documento"}. ${messageText || "Responda que recebeu e que vai verificar com a equipe."}`,
        };
      }
    }

    // Replace or add the last user message with media content
    if (mediaContent) {
      // Remove the last user message (already added from history) and add media version
      if (aiMessages.length > 0 && aiMessages[aiMessages.length - 1].role === "user") {
        aiMessages[aiMessages.length - 1] = mediaContent;
      } else {
        aiMessages.push(mediaContent);
      }
    } else if (aiMessages.length === 0) {
      aiMessages.push({ role: "user", content: messageText });
    }

    // Get knowledge base
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

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...aiMessages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      throw new Error("Erro na IA");
    }

    const aiData = await aiResponse.json();
    let fullReply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Vou encaminhar para nossa equipe! 🙏";

    // Check if AI detected follow-up decline
    const followupDeclined = fullReply.includes("[FOLLOWUP_DECLINED]");
    if (followupDeclined) {
      // Remove the tag from the reply
      fullReply = fullReply.replace("[FOLLOWUP_DECLINED]", "").trim();

      // Schedule a follow-up for 24h later
      const followupDate = new Date();
      followupDate.setHours(followupDate.getHours() + 24);
      if (followupDate.getHours() < 10) followupDate.setHours(10, 0, 0, 0);
      if (followupDate.getHours() > 19) {
        followupDate.setDate(followupDate.getDate() + 1);
        followupDate.setHours(10, 0, 0, 0);
      }

      // Generate a personalized follow-up message based on conversation context
      const recentMessages = aiMessages.slice(-6).map((m: any) => {
        const text = typeof m.content === "string" ? m.content : "[mídia]";
        return `${m.role === "user" ? "Cliente" : "Agente"}: ${text}`;
      }).join("\n");

      let followupMsg = `Oi ${pushName?.split(" ")[0] || ""}! 😊 Tudo bem? Conversamos outro dia e fiquei pensando se posso te ajudar com algo. Estou por aqui! 🚀`;

      try {
        const followupAI = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Você é o Criativo X da Lápis Criativo. Gere UMA mensagem curta de follow-up (máx 2 frases) para WhatsApp.
A mensagem deve:
- Ser simpática e natural, como uma pessoa real
- Referenciar sutilmente o ASSUNTO da última conversa (sem repetir detalhes demais)
- Convidar o cliente a retomar a conversa
- Usar 1-2 emojis
- NÃO mencionar que o cliente recusou falar com humano
- NÃO usar formatação, listas ou markdown
Responda APENAS com a mensagem, nada mais.`,
              },
              {
                role: "user",
                content: `Nome do cliente: ${pushName || "cliente"}\n\nÚltimas mensagens da conversa:\n${recentMessages}\n\nGere a mensagem de follow-up:`,
              },
            ],
          }),
        });

        if (followupAI.ok) {
          const followupData = await followupAI.json();
          const generated = followupData.choices?.[0]?.message?.content?.trim();
          if (generated && generated.length > 10 && generated.length < 500) {
            followupMsg = generated;
          }
        }
      } catch (e) {
        console.error("Follow-up AI generation error:", e);
      }

      await supabase.from("whatsapp_followups").insert({
        telefone: phone,
        nome_contato: pushName,
        mensagem: followupMsg,
        motivo: "remarketing",
        instancia: instanceName,
        agendado_para: followupDate.toISOString(),
        origem: "auto",
      });

      console.log(`Follow-up personalizado agendado para ${phone}: "${followupMsg.slice(0, 80)}..."`);
    }

    // Split reply into human-like separate messages
    const messageChunks = splitMessage(fullReply);
    console.log(`Sending ${messageChunks.length} message(s) to ${phone}`);

    const allReplies: string[] = [];

    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i];

      // Simulate typing delay (1-3 seconds per message, proportional to length)
      if (i > 0) {
        const typingDelay = randInt(1500, 3000) + Math.min(chunk.length * 15, 3000);
        await sleep(typingDelay);
      }

      // Send message via Evolution API
      const sendResp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, text: chunk }),
      });

      if (!sendResp.ok) {
        console.error("Evolution send error:", await sendResp.text());
      }

      // Save each chunk as a separate message
      await supabase.from("whatsapp_mensagens").insert({
        telefone: phone,
        nome_contato: "Criativo X",
        mensagem: chunk,
        direcao: "enviada",
        instancia: instanceName,
      });

      allReplies.push(chunk);
    }

    // Save/update lead
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
