import {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users,
  Calendar, Instagram, ArrowRight, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_TOOLS } from "@/lib/ai-tools";
import { Link } from "react-router-dom";

const iconMap: Record<string, React.ElementType> = {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users, Calendar, Instagram,
};

const AIToolsSection = () => {
  return (
    <section id="ferramentas" className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="container-custom relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-sm text-primary mb-6">
            <Brain className="w-4 h-4" />
            Powered by IA
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ferramentas de <span className="neon-text">Marketing com IA</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Experimente nossas ferramentas gratuitas com inteligência artificial.
            Versão completa disponível no painel da agência.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {AI_TOOLS.map((tool, index) => {
            const Icon = iconMap[tool.icon] || Target;
            return (
              <Link
                key={tool.id}
                to={`/ferramentas/${tool.id}`}
                className="glass-card p-6 hover-glow group cursor-pointer transition-transform hover:-translate-y-2 block"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{tool.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                  Usar Ferramenta <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to="/diagnostico">
            <Button variant="hero" size="lg" className="group">
              <Brain className="w-5 h-5" />
              Diagnóstico Inteligente de Marketing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AIToolsSection;
