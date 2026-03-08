import { useState } from "react";
import { ExternalLink } from "lucide-react";

const categories = ["Todos", "Sites", "Landing Pages", "CRMs", "Micro-SaaS"];

const PORTFOLIO_BASE = "https://portifolioagencialapiscriatio.lovable.app/projeto";

const projects = [
  {
    id: "d890108e-d482-4ba2-95d9-323a94ea6a8c",
    title: "O Reels Que Converte",
    category: "Landing Pages",
    description: "Landing page focada em ensinar e estruturar Reels estratégicos que geram leads, conversões e vendas.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1770338174008-x9f66t.png",
  },
  {
    id: "05272b27-8b1d-4add-b64d-dfc889d74296",
    title: "CRM + SITE Daher Imóveis",
    category: "Sites",
    description: "Site imobiliário focado em captação de leads, autoridade local e conversão de interessados em compradores reais.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1770150275340-8e6mzm.png",
    featured: true,
  },
  {
    id: "95078cde-4b68-4f4a-a1dc-8c73fd90f5b0",
    title: "Google Presence Pro",
    category: "Micro-SaaS",
    description: "Ferramenta estratégica para análise e fortalecimento da presença digital no Google e no ambiente local.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1768481828101-vm561l.png",
    featured: true,
  },
  {
    id: "c4bcb70d-5d61-4db4-8e45-40967196b03d",
    title: "GMN Analisador Pro",
    category: "Micro-SaaS",
    description: "Ferramenta profissional para análise estratégica de perfis do Google Meu Negócio.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767192797239-4jjtnc.png",
    featured: true,
  },
  {
    id: "ac08cbe2-f4fc-4ba2-9df6-ddba15bdf8fb",
    title: "LeadGate",
    category: "Micro-SaaS",
    description: "Ferramenta inteligente para filtrar, qualificar e direcionar leads com real intenção de compra.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767193458982-et9sos.png",
    featured: true,
  },
  {
    id: "c9d3c858-f0fb-4969-9728-252d0e72471a",
    title: "AgentHub Digital",
    category: "Micro-SaaS",
    description: "Plataforma de agentes de inteligência artificial para automação, marketing, vendas e produtividade.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767194935928-4m7mps.png",
    featured: true,
  },
  {
    id: "c85362e6-5877-4ca0-939f-3169b7abdb8c",
    title: "Sebastian Growth Architects",
    category: "Sites",
    description: "Site institucional para consultoria estratégica focada em crescimento, posicionamento e escala de negócios.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767192423432-q3xm5.png",
  },
  {
    id: "675b17c2-0dd3-4ba6-8f29-d9fee604ca81",
    title: "Rophe Odontologia",
    category: "Landing Pages",
    description: "Landing page para clínica odontológica focada em autoridade, estética profissional e geração de leads.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767192520479-5bqqqc.png",
  },
  {
    id: "b55a42f2-6d12-4039-8cfb-5fc217e93ca0",
    title: "Analisador de Campanhas Meta Ads",
    category: "Micro-SaaS",
    description: "Ferramenta inteligente para análise de campanhas de tráfego pago e diagnóstico de performance.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767192638545-2mqros.png",
  },
  {
    id: "97481d67-7ebf-41e8-9473-76e28208a5d6",
    title: "Menu Online AI",
    category: "Micro-SaaS",
    description: "Cardápio digital inteligente com IA para restaurantes, pedidos online e automação no atendimento.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767192291952-r1438.png",
    featured: true,
  },
  {
    id: "ec397ed6-8bb2-47c0-98f9-a8cf6eafa72a",
    title: "ClientWave Forge",
    category: "CRMs",
    description: "Sistema CRM para gestão de clientes, relacionamento e acompanhamento de oportunidades comerciais.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767192941608-3dtb1s.png",
  },
  {
    id: "8ce5bdf3-1f72-48d9-867f-927e4597b72d",
    title: "CRM Imobiliário",
    category: "CRMs",
    description: "CRM desenvolvido para corretores e imobiliárias com foco em gestão de leads, imóveis e funil de vendas.",
    image: "https://yvzdtgbqptmjmkfsfgdl.supabase.co/storage/v1/object/public/thumbnails/1767195754403-4z8wf.png",
  },
];

const PortfolioSection = () => {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filteredProjects =
    activeCategory === "Todos"
      ? projects
      : projects.filter((p) => p.category === activeCategory);

  return (
    <section id="portfolio" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Nosso <span className="neon-text">Portfólio</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Conheça alguns dos projetos que desenvolvemos para nossos clientes.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(265_89%_65%/0.4)]"
                  : "bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <a
              key={project.id}
              href={`${PORTFOLIO_BASE}/${project.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group glass-card overflow-hidden transition-all duration-300 hover:-translate-y-2 hover-glow block"
            >
              <div className="relative overflow-hidden aspect-[3/2]">
                {project.featured && (
                  <span className="absolute top-3 left-3 z-10 bg-primary/90 text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    ⭐ Destaque
                  </span>
                )}
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-medium">Ver Projeto</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  {project.category}
                </span>
                <h3 className="font-display font-semibold text-lg mt-2">{project.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
