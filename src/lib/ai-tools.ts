import { supabase } from "@/integrations/supabase/client";

export interface LeadData {
  nome: string;
  email: string;
  whatsapp: string;
}

export interface ToolInput {
  [key: string]: string;
}

export async function streamAITool({
  tool,
  input,
  lead,
  onDelta,
  onDone,
  onError,
}: {
  tool: string;
  input: ToolInput;
  lead: LeadData;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-marketing-tool`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ tool, input, lead }),
    });

    if (!resp.ok || !resp.body) {
      if (resp.status === 429) {
        onError("Limite de requisições excedido. Tente novamente em alguns minutos.");
        return;
      }
      if (resp.status === 402) {
        onError("Serviço temporariamente indisponível.");
        return;
      }
      onError("Erro ao processar análise. Tente novamente.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    onDone();
  } catch (e) {
    console.error("Stream error:", e);
    onError("Erro de conexão. Verifique sua internet e tente novamente.");
  }
}

export const AI_TOOLS = [
  {
    id: "google-business",
    title: "Analisador Google Meu Negócio",
    description: "Analise e otimize seu perfil no Google para atrair mais clientes locais.",
    icon: "MapPin",
    fields: [
      { name: "nome_negocio", label: "Nome do Negócio", placeholder: "Ex: Pizzaria do João" },
      { name: "cidade", label: "Cidade", placeholder: "Ex: Rio de Janeiro" },
      { name: "categoria", label: "Categoria", placeholder: "Ex: Restaurante, Clínica, Loja" },
      { name: "url_google", label: "URL do Google Meu Negócio (opcional)", placeholder: "https://g.co/..." },
    ],
  },
  {
    id: "instagram-analyzer",
    title: "Analisador de Instagram",
    description: "Receba insights e estratégias para crescer seu perfil no Instagram.",
    icon: "Instagram",
    fields: [
      { name: "perfil", label: "@ do Perfil", placeholder: "Ex: @seuperfil" },
      { name: "nicho", label: "Nicho/Segmento", placeholder: "Ex: Moda, Gastronomia, Fitness" },
      { name: "seguidores", label: "Número de Seguidores", placeholder: "Ex: 5000" },
      { name: "objetivo", label: "Objetivo Principal", placeholder: "Ex: Vender mais, Ganhar seguidores" },
    ],
  },
  {
    id: "seo-analyzer",
    title: "Analisador SEO de Sites",
    description: "Análise completa de SEO do seu site com recomendações práticas.",
    icon: "Search",
    fields: [
      { name: "url_site", label: "URL do Site", placeholder: "https://seusite.com.br" },
      { name: "palavras_chave", label: "Palavras-chave Principais", placeholder: "Ex: marketing digital, agência" },
      { name: "concorrentes", label: "Concorrentes (opcional)", placeholder: "Ex: site1.com, site2.com" },
    ],
  },
  {
    id: "marketing-strategy",
    title: "Gerador de Estratégia de Marketing",
    description: "Receba uma estratégia de marketing personalizada para seu negócio.",
    icon: "Target",
    fields: [
      { name: "negocio", label: "Tipo de Negócio", placeholder: "Ex: E-commerce de roupas" },
      { name: "publico", label: "Público-alvo", placeholder: "Ex: Mulheres 25-45 anos" },
      { name: "orcamento", label: "Orçamento Mensal", placeholder: "Ex: R$ 2.000" },
      { name: "objetivo", label: "Objetivo Principal", placeholder: "Ex: Aumentar vendas em 50%" },
    ],
  },
  {
    id: "landing-page",
    title: "Gerador de Landing Pages",
    description: "Gere ideias e estruturas de landing pages de alta conversão.",
    icon: "Globe",
    fields: [
      { name: "produto", label: "Produto/Serviço", placeholder: "Ex: Curso de Marketing Digital" },
      { name: "publico", label: "Público-alvo", placeholder: "Ex: Empreendedores iniciantes" },
      { name: "diferencial", label: "Diferencial", placeholder: "Ex: Garantia de 30 dias" },
      { name: "preco", label: "Faixa de Preço", placeholder: "Ex: R$ 497" },
    ],
  },
  {
    id: "content-calendar",
    title: "Gerador de Calendário de Conteúdo",
    description: "Calendário editorial completo para suas redes sociais.",
    icon: "Calendar",
    fields: [
      { name: "nicho", label: "Nicho", placeholder: "Ex: Nutrição, Advocacia, Estética" },
      { name: "plataformas", label: "Plataformas", placeholder: "Ex: Instagram, TikTok" },
      { name: "frequencia", label: "Frequência de Posts", placeholder: "Ex: 5x por semana" },
      { name: "tom", label: "Tom de Voz", placeholder: "Ex: Profissional, Descontraído" },
    ],
  },
  {
    id: "google-ads",
    title: "Analisador de Google Ads",
    description: "Otimize suas campanhas de Google Ads para melhor ROI.",
    icon: "BarChart3",
    fields: [
      { name: "negocio", label: "Tipo de Negócio", placeholder: "Ex: Clínica Odontológica" },
      { name: "orcamento", label: "Orçamento Mensal", placeholder: "Ex: R$ 3.000" },
      { name: "objetivo", label: "Objetivo", placeholder: "Ex: Gerar leads, Vendas" },
      { name: "regiao", label: "Região de Atuação", placeholder: "Ex: Rio de Janeiro" },
    ],
  },
  {
    id: "instagram-bio",
    title: "Otimizador de Bio do Instagram",
    description: "Otimize sua bio do Instagram para converter visitantes em seguidores.",
    icon: "Pencil",
    fields: [
      { name: "bio_atual", label: "Bio Atual", placeholder: "Cole sua bio atual aqui" },
      { name: "nicho", label: "Nicho", placeholder: "Ex: Coach, Dentista, Loja" },
      { name: "objetivo", label: "Objetivo da Bio", placeholder: "Ex: Gerar vendas, Ganhar seguidores" },
    ],
  },
  {
    id: "lead-generation",
    title: "Estratégia de Geração de Leads",
    description: "Crie uma estratégia completa para gerar leads qualificados.",
    icon: "Users",
    fields: [
      { name: "negocio", label: "Tipo de Negócio", placeholder: "Ex: Consultoria Empresarial" },
      { name: "ticket_medio", label: "Ticket Médio", placeholder: "Ex: R$ 500" },
      { name: "canais_atuais", label: "Canais Atuais", placeholder: "Ex: Instagram, Google" },
      { name: "meta_leads", label: "Meta de Leads/Mês", placeholder: "Ex: 50 leads" },
    ],
  },
  {
    id: "competitor-analysis",
    title: "Análise de Concorrentes",
    description: "Analise seus concorrentes e descubra oportunidades de mercado.",
    icon: "LineChart",
    fields: [
      { name: "seu_negocio", label: "Seu Negócio", placeholder: "Ex: Agência de Marketing" },
      { name: "concorrentes", label: "Concorrentes (até 3)", placeholder: "Ex: Agência X, Agência Y" },
      { name: "regiao", label: "Região", placeholder: "Ex: Rio de Janeiro" },
      { name: "diferencial", label: "Seu Diferencial", placeholder: "Ex: Foco em IA" },
    ],
  },
];
