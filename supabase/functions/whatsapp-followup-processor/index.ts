import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// These are defaults; overridden by whatsapp_config if available
let MAX_AUTO_FOLLOWUPS = 3;
let INACTIVITY_DAYS = 2;
let FOLLOWUP_HOUR_START = 10;
let FOLLOWUP_HOUR_END = 19;
let FOLLOWUP_ATIVO = true;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const EVOLUTION_GO_URL = Deno.env.get("EVOLUTION_GO_URL")!;
    const EVOLUTION_GO_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY")!;

    if (!EVOLUTION_GO_URL || !EVOLUTION_GO_API_KEY) {
      throw new Error("Evolution GO não configurada");
    }

    // Fetch instance name → token map
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


    const now = new Date();
    const nowISO = now.toISOString();

    // Load follow-up config from DB
    const { data: configRow } = await supabase
      .from("whatsapp_config")
      .select("followup_dias_inatividade, followup_max_tentativas, followup_horario_inicio, followup_horario_fim, followup_ativo")
      .limit(1)
      .maybeSingle();

    if (configRow) {
      INACTIVITY_DAYS = configRow.followup_dias_inatividade ?? INACTIVITY_DAYS;
      MAX_AUTO_FOLLOWUPS = configRow.followup_max_tentativas ?? MAX_AUTO_FOLLOWUPS;
      FOLLOWUP_ATIVO = configRow.followup_ativo ?? true;
      const startParts = (configRow.followup_horario_inicio || "10:00").split(":");
      const endParts = (configRow.followup_horario_fim || "19:00").split(":");
      FOLLOWUP_HOUR_START = parseInt(startParts[0]) || 10;
      FOLLOWUP_HOUR_END = parseInt(endParts[0]) || 19;
    }

    if (!FOLLOWUP_ATIVO) {
      return new Response(JSON.stringify({ ok: true, message: "Follow-up automático desativado", processed: 0, errors: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // STEP 1: Detect inactive conversations and create auto follow-ups
    // ============================
    const twoDaysAgo = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

    // Get all phones with their last RECEIVED message (from client)
    const { data: allMessages } = await supabase
      .from("whatsapp_mensagens")
      .select("telefone, nome_contato, criado_em, direcao, instancia")
      .order("criado_em", { ascending: false })
      .limit(1000);

    if (allMessages) {
      // Group by phone: find last message from client and last message overall
      const phoneMap = new Map<string, {
        lastClientMsg: string | null;
        lastAnyMsg: string;
        nome: string;
        instancia: string;
      }>();

      for (const m of allMessages) {
        if (!phoneMap.has(m.telefone)) {
          phoneMap.set(m.telefone, {
            lastClientMsg: m.direcao === "recebida" ? m.criado_em : null,
            lastAnyMsg: m.criado_em,
            nome: m.nome_contato || m.telefone,
            instancia: m.instancia,
          });
        } else {
          const existing = phoneMap.get(m.telefone)!;
          if (!existing.lastClientMsg && m.direcao === "recebida") {
            existing.lastClientMsg = m.criado_em;
          }
        }
      }

      let autoCreated = 0;

      for (const [phone, info] of phoneMap) {
        // Only consider contacts that have sent at least one message
        if (!info.lastClientMsg) continue;

        const lastClientDate = new Date(info.lastClientMsg);

        // Check if last client message is older than 2 days
        if (lastClientDate >= twoDaysAgo) continue;

        // Check if handoff is active
        const { data: handoff } = await supabase
          .from("whatsapp_handoff")
          .select("ativo")
          .eq("telefone", phone)
          .eq("ativo", true)
          .maybeSingle();
        if (handoff) continue;

        // Count existing auto follow-ups for this phone (sent or scheduled)
        const { count: existingCount } = await supabase
          .from("whatsapp_followups")
          .select("*", { count: "exact", head: true })
          .eq("telefone", phone)
          .eq("origem", "auto")
          .in("status", ["agendado", "enviado"]);

        if ((existingCount || 0) >= MAX_AUTO_FOLLOWUPS) continue;

        // Check if we already have a pending follow-up scheduled
        const { data: pendingFollowup } = await supabase
          .from("whatsapp_followups")
          .select("id")
          .eq("telefone", phone)
          .eq("status", "agendado")
          .eq("origem", "auto")
          .maybeSingle();
        if (pendingFollowup) continue;

        // Check if last follow-up sent was less than 2 days ago
        const { data: lastSent } = await supabase
          .from("whatsapp_followups")
          .select("enviado_em")
          .eq("telefone", phone)
          .eq("origem", "auto")
          .eq("status", "enviado")
          .order("enviado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSent?.enviado_em) {
          const lastSentDate = new Date(lastSent.enviado_em);
          if (now.getTime() - lastSentDate.getTime() < INACTIVITY_DAYS * 24 * 60 * 60 * 1000) continue;
        }

        // Generate personalized follow-up using AI
        const attemptNumber = (existingCount || 0) + 1;

        // Get last few messages for context
        const { data: recentMsgs } = await supabase
          .from("whatsapp_mensagens")
          .select("mensagem, direcao")
          .eq("telefone", phone)
          .order("criado_em", { ascending: false })
          .limit(6);

        const context = (recentMsgs || []).reverse()
          .map((m: any) => `${m.direcao === "recebida" ? "Cliente" : "Agente"}: ${m.mensagem}`)
          .join("\n");

        let followupMsg = `Oi ${info.nome?.split(" ")[0] || ""}! 😊 Tudo bem? Faz um tempinho que não conversamos. Se precisar de algo, estou por aqui!`;

        if (LOVABLE_API_KEY) {
          try {
            const toneByAttempt: Record<number, string> = {
              1: "Seja leve e amigável. Referencie sutilmente o assunto da última conversa.",
              2: "Seja gentil mas um pouco mais direto. Ofereça algo de valor (dica, conteúdo, condição).",
              3: "Seja carinhoso e final. Diga que está à disposição e que é a última mensagem para não incomodar.",
            };

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
Esta é a tentativa ${attemptNumber} de ${MAX_AUTO_FOLLOWUPS}.
${toneByAttempt[attemptNumber] || toneByAttempt[1]}
- Seja natural, como pessoa real
- Use 1-2 emojis
- NÃO use markdown ou listas
- Responda APENAS com a mensagem`,
                  },
                  {
                    role: "user",
                    content: `Nome: ${info.nome || "cliente"}\nTentativa: ${attemptNumber}/${MAX_AUTO_FOLLOWUPS}\n\nÚltimas mensagens:\n${context}\n\nGere a mensagem:`,
                  },
                ],
              }),
            });

            if (aiResp.ok) {
              const aiData = await aiResp.json();
              const generated = aiData.choices?.[0]?.message?.content?.trim();
              if (generated && generated.length > 10 && generated.length < 500) {
                followupMsg = generated;
              }
            }
          } catch (e) {
            console.error("AI follow-up generation error:", e);
          }
        }

        // Schedule using configurable hours
        const scheduleDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // minimum 2h from now
        if (scheduleDate.getHours() < FOLLOWUP_HOUR_START) scheduleDate.setHours(FOLLOWUP_HOUR_START, 0, 0, 0);
        if (scheduleDate.getHours() > FOLLOWUP_HOUR_END) {
          scheduleDate.setDate(scheduleDate.getDate() + 1);
          scheduleDate.setHours(FOLLOWUP_HOUR_START, 0, 0, 0);
        }

        await supabase.from("whatsapp_followups").insert({
          telefone: phone,
          nome_contato: info.nome,
          mensagem: followupMsg,
          motivo: attemptNumber === MAX_AUTO_FOLLOWUPS ? "reengajamento" : "remarketing",
          instancia: info.instancia,
          agendado_para: scheduleDate.toISOString(),
          origem: "auto",
        });

        autoCreated++;
        console.log(`Auto follow-up #${attemptNumber} criado para ${phone}`);
      }

      if (autoCreated > 0) {
        console.log(`${autoCreated} follow-ups automáticos criados por inatividade`);
      }
    }

    // ============================
    // STEP 2: Send scheduled follow-ups that are due
    // ============================
    const { data: followups, error } = await supabase
      .from("whatsapp_followups")
      .select("*")
      .eq("status", "agendado")
      .lte("agendado_para", nowISO)
      .order("agendado_para", { ascending: true })
      .limit(20);

    if (error) throw error;

    let processed = 0;
    let errors = 0;
    const sentPhones = new Set<string>(); // Prevent sending to same phone twice in one batch

    for (const fu of (followups || [])) {
      try {
        // Concurrency guard: claim this row before doing any work
        // Prevents duplicate sends when the processor runs concurrently
        const { data: claimed, error: claimError } = await supabase
          .from("whatsapp_followups")
          .update({
            status: "processando",
            atualizado_em: nowISO,
            erro: null,
          })
          .eq("id", fu.id)
          .eq("status", "agendado")
          .select("id")
          .maybeSingle();

        if (claimError) throw claimError;

        if (!claimed) {
          console.log(`Follow-up ${fu.id} já foi capturado por outra execução`);
          continue;
        }

        // Skip if we already sent to this phone in this batch
        if (sentPhones.has(fu.telefone)) {
          await supabase.from("whatsapp_followups").update({
            status: "cancelado",
            atualizado_em: nowISO,
            erro: "Duplicata no mesmo lote",
          }).eq("id", fu.id);
          console.log(`Follow-up duplicado cancelado para ${fu.telefone}`);
          continue;
        }

        // Check if a follow-up was already sent to this phone in the last 12 hours
        const { data: recentSent } = await supabase
          .from("whatsapp_followups")
          .select("id")
          .eq("telefone", fu.telefone)
          .eq("status", "enviado")
          .gte("enviado_em", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
          .limit(1)
          .maybeSingle();

        if (recentSent) {
          await supabase.from("whatsapp_followups").update({
            status: "cancelado",
            atualizado_em: nowISO,
            erro: "Follow-up já enviado nas últimas 12h",
          }).eq("id", fu.id);
          console.log(`Follow-up cancelado para ${fu.telefone} — já enviado recentemente`);
          continue;
        }

        // Check if client responded since follow-up was created
        if (fu.origem === "auto") {
          const { data: recentMsg } = await supabase
            .from("whatsapp_mensagens")
            .select("criado_em")
            .eq("telefone", fu.telefone)
            .eq("direcao", "recebida")
            .gt("criado_em", fu.criado_em)
            .limit(1)
            .maybeSingle();

          if (recentMsg) {
            // Client responded! Cancel this and all pending auto follow-ups
            await supabase.from("whatsapp_followups").update({
              status: "cancelado",
              atualizado_em: nowISO,
              erro: "Cliente respondeu, follow-up cancelado",
            }).eq("telefone", fu.telefone).eq("status", "agendado").eq("origem", "auto");
            console.log(`Follow-ups cancelados para ${fu.telefone} — cliente respondeu`);
            continue;
          }
        }

        // Check if handoff is active
        const { data: handoff } = await supabase
          .from("whatsapp_handoff")
          .select("ativo")
          .eq("telefone", fu.telefone)
          .eq("ativo", true)
          .maybeSingle();

        if (handoff) {
          await supabase.from("whatsapp_followups").update({
            status: "cancelado",
            atualizado_em: nowISO,
            erro: "Handoff humano ativo",
          }).eq("id", fu.id);
          continue;
        }

        // Send message via Evolution GO
        const fuToken = tokenMap.get((fu.instancia || "").toLowerCase());
        if (!fuToken) throw new Error(`Instância "${fu.instancia}" não encontrada na Evolution GO`);

        const sendResp = await fetch(`${EVOLUTION_GO_URL}/send/text`, {
          method: "POST",
          headers: { apikey: fuToken, "Content-Type": "application/json" },
          body: JSON.stringify({ number: fu.telefone, text: fu.mensagem }),
        });

        if (!sendResp.ok) {
          throw new Error(`Evolution GO error: ${await sendResp.text()}`);
        }


        await supabase.from("whatsapp_mensagens").insert({
          telefone: fu.telefone,
          nome_contato: fu.nome_contato || "Criativo X",
          mensagem: fu.mensagem,
          direcao: "enviada",
          instancia: fu.instancia,
        });

        await supabase.from("whatsapp_followups").update({
          status: "enviado",
          enviado_em: nowISO,
          atualizado_em: nowISO,
        }).eq("id", fu.id);

        sentPhones.add(fu.telefone);
        processed++;
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Follow-up error for ${fu.telefone}:`, e);
        await supabase.from("whatsapp_followups").update({
          status: "erro",
          erro: e instanceof Error ? e.message : "Erro desconhecido",
          atualizado_em: nowISO,
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
