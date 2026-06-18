import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchInstanceTokenMap(url: string, key: string): Promise<Map<string, string>> {
  const resp = await fetch(`${url}/instance/all`, {
    headers: { apikey: key, "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`/instance/all failed: ${resp.status}`);
  const data = await resp.json();
  const list = Array.isArray(data) ? data : (data.instances || data.data || []);
  const map = new Map<string, string>();
  for (const i of list) {
    const name = (i.name || i.Name || i.instanceName || "").toLowerCase();
    const token = i.token || i.Token || i.apikey || i.apiKey;
    if (name && token) map.set(name, token);
  }
  return map;
}

async function sendText(url: string, token: string, number: string, text: string) {
  return await fetch(`${url}/send/text`, {
    method: "POST",
    headers: { apikey: token, "Content-Type": "application/json" },
    body: JSON.stringify({ number, text }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EVOLUTION_GO_URL = Deno.env.get("EVOLUTION_GO_URL");
    const EVOLUTION_GO_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY");
    if (!EVOLUTION_GO_URL || !EVOLUTION_GO_API_KEY) throw new Error("Evolution GO não configurada");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase.from("whatsapp_config").select("*").limit(1).single();
    if (!config) throw new Error("Configuração não encontrada");

    const now = new Date();
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentDay = brTime.getDay();
    const currentTimeMinutes = brTime.getHours() * 60 + brTime.getMinutes();

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

    const tokenMap = await fetchInstanceTokenMap(EVOLUTION_GO_URL, EVOLUTION_GO_API_KEY);

    let processed = 0;
    let errors = 0;

    for (const msg of pendentes) {
      await supabase.from("whatsapp_fila").update({ status: "processando" }).eq("id", msg.id);

      const typingDelay = (config.digitacao_min + Math.random() * (config.digitacao_max - config.digitacao_min)) * 1000;
      await new Promise(r => setTimeout(r, typingDelay));

      try {
        const token = tokenMap.get((msg.instancia || "").toLowerCase());
        if (!token) throw new Error(`Instância "${msg.instancia}" não encontrada na Evolution GO`);

        const sendResp = await sendText(EVOLUTION_GO_URL, token, msg.telefone, msg.mensagem);
        if (!sendResp.ok) throw new Error(await sendResp.text());

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
