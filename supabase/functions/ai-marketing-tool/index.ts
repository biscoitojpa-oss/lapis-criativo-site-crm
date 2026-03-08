import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL_PROMPTS: Record<string, string> = {
  "google-business": `Você é um especialista em Google Meu Negócio. Analise o perfil do negócio fornecido e gere um relatório detalhado com:
1. Pontuação geral do perfil (0-100)
2. Pontos fortes identificados
3. Áreas de melhoria urgente
4. Recomendações específicas para melhorar o rankeamento local
5. Dicas para obter mais avaliações positivas
6. Estratégia de posts recomendada
Seja específico e prático nas recomendações.`,

  "instagram-analyzer": `Você é um especialista em marketing no Instagram. Analise o perfil fornecido e gere:
1. Pontuação do perfil (0-100)
2. Análise da bio e otimizações sugeridas
3. Análise do conteúdo e frequência de postagem
4. Estratégia de hashtags recomendada
5. Tipos de conteúdo que performam melhor no nicho
6. Plano de ação para crescimento orgânico
Seja específico e baseado em dados.`,

  "seo-analyzer": `Você é um especialista em SEO. Analise o site fornecido e gere:
1. Pontuação SEO geral (0-100)
2. Análise de meta tags e títulos
3. Problemas de performance identificados
4. Oportunidades de palavras-chave
5. Análise de backlinks e autoridade
6. Plano de ação com prioridades
Seja técnico mas acessível.`,

  "marketing-strategy": `Você é um estrategista de marketing digital. Com base nas informações do negócio, gere:
1. Análise do mercado e posicionamento
2. Público-alvo detalhado (persona)
3. Canais de marketing recomendados
4. Orçamento sugerido por canal
5. KPIs e métricas para acompanhar
6. Cronograma de implementação (30/60/90 dias)
Seja estratégico e orientado a resultados.`,

  "landing-page": `Você é um especialista em landing pages de alta conversão. Com base no produto/serviço, gere:
1. Estrutura ideal da landing page
2. Headline e subheadline sugeridos
3. Seções recomendadas e ordem
4. CTAs otimizados
5. Elementos de prova social
6. Dicas de design e UX
Seja criativo e focado em conversão.`,

  "content-calendar": `Você é um especialista em conteúdo digital. Gere um calendário de conteúdo com:
1. Temas semanais para o mês
2. Tipos de conteúdo por dia (post, story, reels, etc.)
3. Ideias de conteúdo específicas para o nicho
4. Melhores horários para publicação
5. Hashtags estratégicas por tema
6. Dicas de engajamento
Seja prático e criativo.`,

  "google-ads": `Você é um especialista em Google Ads. Analise a campanha/estratégia e gere:
1. Análise da estrutura de campanhas
2. Sugestões de palavras-chave
3. Otimizações de lance e orçamento
4. Estrutura de anúncios recomendada
5. Extensões de anúncio sugeridas
6. Estratégia de remarketing
Seja técnico e orientado a ROI.`,

  "instagram-bio": `Você é um especialista em otimização de perfis no Instagram. Otimize a bio fornecida:
1. Bio otimizada (até 150 caracteres)
2. Sugestões de CTA
3. Emojis estratégicos
4. Link na bio recomendado
5. Destaques sugeridos
6. Nome de usuário e nome de exibição otimizados
Seja criativo e estratégico.`,

  "lead-generation": `Você é um especialista em geração de leads. Crie uma estratégia completa:
1. Canais de aquisição recomendados
2. Ofertas e iscas digitais sugeridas
3. Funil de conversão ideal
4. Automações de nutrição
5. Scripts de abordagem
6. Métricas e metas
Seja prático e orientado a resultados.`,

  "competitor-analysis": `Você é um analista competitivo. Analise os concorrentes e gere:
1. Mapeamento do cenário competitivo
2. Pontos fortes e fracos dos concorrentes
3. Oportunidades de diferenciação
4. Estratégias que os concorrentes usam
5. Gaps de mercado identificados
6. Recomendações de posicionamento
Seja analítico e estratégico.`,

  "diagnostico": `Você é um consultor sênior de marketing digital da Agência Lápis Criativo. Com base no questionário respondido, gere um diagnóstico completo:
1. Análise da situação atual
2. Principais problemas identificados
3. Oportunidades de crescimento
4. Plano de ação personalizado
5. Investimento recomendado
6. Resultados esperados em 3, 6 e 12 meses
Seja profissional, consultivo e específico para o negócio.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, input, lead } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = TOOL_PROMPTS[tool];
    if (!systemPrompt) throw new Error(`Ferramenta desconhecida: ${tool}`);

    // Save lead to database
    if (lead) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from("leads").insert({
        nome: lead.nome,
        email: lead.email,
        whatsapp: lead.whatsapp,
        ferramenta: tool,
        dados_entrada: input,
      });
    }

    const userMessage = typeof input === "string" 
      ? input 
      : `Dados para análise:\n${JSON.stringify(input, null, 2)}`;

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
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
