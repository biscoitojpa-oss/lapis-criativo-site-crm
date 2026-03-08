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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API não configurada");
    }

    // Fetch scheduled follow-ups that are due
    const now = new Date().toISOString();
    const { data: followups, error } = await supabase
      .from("whatsapp_followups")
      .select("*")
      .eq("status", "agendado")
      .lte("agendado_para", now)
      .order("agendado_para", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!followups || followups.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const fu of followups) {
      try {
        // Check if handoff is active (human already contacted)
        const { data: handoff } = await supabase
          .from("whatsapp_handoff")
          .select("ativo")
          .eq("telefone", fu.telefone)
          .eq("ativo", true)
          .maybeSingle();

        if (handoff) {
          // Human is handling, cancel follow-up
          await supabase.from("whatsapp_followups").update({
            status: "cancelado",
            atualizado_em: now,
            erro: "Handoff humano ativo, follow-up cancelado",
          }).eq("id", fu.id);
          continue;
        }

        // Send message via Evolution API
        const sendResp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${fu.instancia}`, {
          method: "POST",
          headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ number: fu.telefone, text: fu.mensagem }),
        });

        if (!sendResp.ok) {
          const errText = await sendResp.text();
          throw new Error(`Evolution API error: ${errText}`);
        }

        // Save message in history
        await supabase.from("whatsapp_mensagens").insert({
          telefone: fu.telefone,
          nome_contato: fu.nome_contato || "Criativo X",
          mensagem: fu.mensagem,
          direcao: "enviada",
          instancia: fu.instancia,
        });

        // Mark as sent
        await supabase.from("whatsapp_followups").update({
          status: "enviado",
          enviado_em: now,
          atualizado_em: now,
        }).eq("id", fu.id);

        processed++;

        // Small delay between sends
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Follow-up error for ${fu.telefone}:`, e);
        await supabase.from("whatsapp_followups").update({
          status: "erro",
          erro: e instanceof Error ? e.message : "Erro desconhecido",
          atualizado_em: now,
        }).eq("id", fu.id);
        errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Follow-up processor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
