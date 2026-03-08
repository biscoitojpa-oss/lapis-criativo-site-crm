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
    const { messages, phone } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Get knowledge base
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: knowledge } = await supabase
      .from("base_conhecimento")
      .select("titulo, conteudo, categoria")
      .eq("ativo", true);

    const knowledgeContext = knowledge
      ?.map((k: any) => `[${k.categoria}] ${k.titulo}: ${k.conteudo}`)
      .join("\n\n") || "Sem dados na base de conhecimento.";

    const systemPrompt = `Você é o Criativo X, assistente virtual da Lápis Criativo - Agência de Marketing Digital.
Seja simpático, profissional e objetivo. Responda em português do Brasil.
Use emojis com moderação. Mantenha respostas curtas e diretas.

BASE DE CONHECIMENTO:
${knowledgeContext}

REGRAS:
- Nunca invente preços ou prazos não listados na base de conhecimento
- Se não souber, diga que vai verificar com a equipe
- Incentive agendar reunião ou falar com consultor`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro no serviço de IA");
    }

    // If phone provided, also send via Evolution API
    if (phone) {
      // We'll handle this asynchronously - collect full response first
      // For now just stream to CRM
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
