import { Target, Users, Lightbulb, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Foco em Resultados",
    description: "Estratégias orientadas por dados para alcançar seus objetivos de negócio.",
  },
  {
    icon: Users,
    title: "Time Especializado",
    description: "Profissionais experientes em design, marketing e tecnologia.",
  },
  {
    icon: Lightbulb,
    title: "Criatividade",
    description: "Soluções inovadoras que destacam sua marca no mercado.",
  },
  {
    icon: TrendingUp,
    title: "Crescimento",
    description: "Parceria de longo prazo para o crescimento sustentável do seu negócio.",
  },
];

const AboutSection = () => {
  return (
    <section id="sobre" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-6">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
              Sobre a <span className="neon-text">Lápis Criativo</span>
            </h2>

            <div className="space-y-4 text-muted-foreground">
              <p className="text-lg">
                A Agência Lápis Criativo atende empresas do Rio de Janeiro e região
                que precisam aumentar sua visibilidade no Google, gerar mais leads
                e transformar tráfego em vendas reais.
              </p>
              <p className="text-lg">
                Somos especializados em tráfego pago, otimização de Google Meu Negócio
                e estratégias de marketing digital orientadas a resultado.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card p-6 hover-glow group cursor-default"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
