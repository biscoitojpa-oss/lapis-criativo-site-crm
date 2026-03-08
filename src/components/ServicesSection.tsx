import {
  Palette,
  BarChart3,
  Globe,
  Target,
  MapPin,
  Search,
  Share2,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Palette,
    title: "Design Gráfico",
    description: "Identidade visual, logotipos, materiais gráficos e branding completo para sua marca.",
    features: ["Logotipos", "Identidade Visual", "Material Gráfico", "Branding"],
  },
  {
    icon: BarChart3,
    title: "Marketing Digital",
    description: "Estratégias completas para aumentar sua presença online e gerar resultados.",
    features: ["Google Ads", "Facebook Ads", "Instagram Ads", "Campanhas"],
  },
  {
    icon: Globe,
    title: "Desenvolvimento Web",
    description: "Sites modernos, responsivos e otimizados para conversão e performance.",
    features: ["Sites Institucionais", "E-commerce", "Landing Pages", "Sistemas Web"],
  },
  {
    icon: Target,
    title: "Tráfego Pago",
    description: "Campanhas de anúncios pagos otimizadas para gerar leads qualificados e vendas.",
    features: ["Google Ads", "Meta Ads", "LinkedIn Ads", "Otimização de ROI"],
  },
  {
    icon: MapPin,
    title: "Google Meu Negócio",
    description: "Otimização e gestão do seu perfil no Google para aumentar visibilidade local.",
    features: ["Configuração Completa", "Otimização de Perfil", "Gestão de Avaliações", "Posts"],
  },
  {
    icon: Search,
    title: "SEO",
    description: "Otimização para mecanismos de busca e posicionamento orgânico no Google.",
    features: ["SEO On-page", "SEO Off-page", "Palavras-chave", "Link Building"],
  },
  {
    icon: Share2,
    title: "Redes Sociais",
    description: "Gestão completa de redes sociais com conteúdo estratégico e engajamento.",
    features: ["Gestão de Conteúdo", "Planejamento", "Design de Posts", "Engajamento"],
  },
  {
    icon: LineChart,
    title: "Analytics",
    description: "Análise de dados e relatórios para tomada de decisões estratégicas.",
    features: ["Google Analytics", "Relatórios", "Métricas", "Insights"],
  },
];

const ServicesSection = () => {
  return (
    <section id="servicos" className="section-padding relative">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Nossos <span className="neon-text">Serviços</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Oferecemos soluções completas para transformar sua presença digital
            e impulsionar seus resultados.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="glass-card p-6 hover-glow group cursor-pointer transition-transform hover:-translate-y-2"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                <service.icon className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="font-display font-semibold text-xl mb-3">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
              
              <ul className="space-y-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="hero" size="lg" asChild>
            <a href="#contato" className="group">
              Solicitar Orçamento Personalizado
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
