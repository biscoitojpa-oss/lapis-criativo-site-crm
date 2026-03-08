import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const message = body.data?.message || body.message;
    if (!message || message.fromMe) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const remoteJid = message.key?.remoteJid || body.data?.key?.remoteJid;
    const messageText = message.conversation || message.extendedTextMessage?.text || message.message?.conversation || "";
    
    if (!messageText || !remoteJid) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
    const instanceName = body.instance || "default";
    const pushName = message.pushName || body.data?.pushName || phone;
    console.log(`Message from ${phone} (${pushName}): ${messageText}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save incoming message
    await supabase.from("whatsapp_mensagens").insert({
      telefone: phone,
      nome_contato: pushName,
      mensagem: messageText,
      direcao: "recebida",
      instancia: instanceName,
    });

    // Get knowledge base
    const { data: knowledge } = await supabase
      .from("base_conhecimento")
      .select("titulo, conteudo, categoria")
      .eq("ativo", true);

    const knowledgeContext = knowledge
      ?.map((k: any) => `[${k.categoria}] ${k.titulo}: ${k.conteudo}`)
      .join("\n\n") || "Sem dados na base de conhecimento.";

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é o Criativo X, assistente virtual da Lápis Criativo - Agência de Marketing Digital.
Seja simpático, profissional e objetivo. Responda em português do Brasil.
Use emojis com moderação. Mantenha respostas curtas (máximo 3 parágrafos).
Se não souber algo, diga que vai encaminhar para a equipe.

BASE DE CONHECIMENTO DA EMPRESA:
${knowledgeContext}

REGRAS:
- Nunca invente preços ou prazos que não estejam na base de conhecimento
- Se perguntarem algo fora do escopo, responda educadamente que vai verificar com a equipe
- Incentive o lead a agendar uma reunião ou falar com um consultor`
          },
          { role: "user", content: messageText }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status);
      throw new Error("Erro na IA");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Vou encaminhar para nossa equipe! 🙏";

    // Send reply via Evolution API
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API não configurada");
    }

    const sendResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: phone,
        text: reply,
      }),
    });

    if (!sendResponse.ok) {
      const errText = await sendResponse.text();
      console.error("Evolution send error:", errText);
    }

    // Save AI reply message
    await supabase.from("whatsapp_mensagens").insert({
      telefone: phone,
      nome_contato: "Criativo X",
      mensagem: reply,
      direcao: "enviada",
      instancia: instanceName,
    });

    // Save as lead if new
    await supabase.from("leads").upsert({
      nome: pushName || phone,
      email: `${phone}@whatsapp`,
      whatsapp: phone,
      ferramenta: "criativo-x-whatsapp",
      dados_entrada: { ultima_mensagem: messageText, resposta_ia: reply },
    }, { onConflict: "email" }).select();

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
