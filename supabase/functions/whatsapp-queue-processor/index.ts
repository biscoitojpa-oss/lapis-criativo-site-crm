import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) throw new Error("Evolution API não configurada");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get anti-ban config
    const { data: config } = await supabase.from("whatsapp_config").select("*").limit(1).single();
    if (!config) throw new Error("Configuração não encontrada");

    // Check if current time is within sending window
    const now = new Date();
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentDay = brTime.getDay(); // 0=Sun, 1=Mon...
    const currentHour = brTime.getHours();
    const currentMinute = brTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const [startH, startM] = (config.horario_inicio as string).split(":").map(Number);
    const [endH, endM] = (config.horario_fim as string).split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (!config.dias_envio.includes(currentDay)) {
      return new Response(JSON.stringify({ ok: true, message: "Fora do dia de envio", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (currentTimeMinutes < startMinutes || currentTimeMinutes > endMinutes) {
      return new Response(JSON.stringify({ ok: true, message: "Fora do horário de envio", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pending messages
    const { data: pendentes } = await supabase
      .from("whatsapp_fila")
      .select("*")
      .in("status", ["pendente", "erro"])
      .lte("agendado_para", now.toISOString())
      .lt("tentativas", 3)
      .order("agendado_para", { ascending: true })
      .limit(config.msgs_antes_descanso || 10);

    if (!pendentes || pendentes.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Fila vazia", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const msg of pendentes) {
      // Mark as processing
      await supabase.from("whatsapp_fila").update({ status: "processando" }).eq("id", msg.id);

      // Simulate typing delay
      const typingDelay = (config.digitacao_min + Math.random() * (config.digitacao_max - config.digitacao_min)) * 1000;
      await new Promise(r => setTimeout(r, typingDelay));

      try {
        const sendResp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${msg.instancia}`, {
          method: "POST",
          headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: msg.telefone, text: msg.mensagem }),
        });

        if (!sendResp.ok) {
          const errText = await sendResp.text();
          throw new Error(errText);
        }

        await supabase.from("whatsapp_fila").update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
          tentativas: msg.tentativas + 1,
        }).eq("id", msg.id);
        processed++;
      } catch (e) {
        await supabase.from("whatsapp_fila").update({
          status: "erro",
          erro: e instanceof Error ? e.message : "Erro desconhecido",
          tentativas: msg.tentativas + 1,
        }).eq("id", msg.id);
        errors++;
      }

      // Wait interval between messages
      if (processed < pendentes.length) {
        const interval = (config.intervalo_min + Math.random() * (config.intervalo_max - config.intervalo_min)) * 1000;
        await new Promise(r => setTimeout(r, interval));
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Queue processor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
