import { Link } from "react-router-dom";
import {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users,
  Calendar, Instagram, ArrowRight, Brain,
} from "lucide-react";
import { AI_TOOLS } from "@/lib/ai-tools";

const iconMap: Record<string, React.ElementType> = {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users, Calendar, Instagram,
};

const CRMTools = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Ferramentas de Marketing com IA</h1>
        <p className="text-muted-foreground">Use IA para gerar análises completas sem captura de lead</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_TOOLS.map((tool) => {
          const Icon = iconMap[tool.icon] || Target;
          return (
            <Link
              key={tool.id}
              to={`/crm/ferramentas/${tool.id}`}
              className="glass-card p-5 hover-glow group transition-transform hover:-translate-y-1 block"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base">{tool.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                Usar <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        to="/crm/diagnostico"
        className="glass-card p-6 hover-glow flex items-center gap-4 transition-transform hover:-translate-y-1 block"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-lg">Diagnóstico Inteligente de Marketing</h3>
          <p className="text-sm text-muted-foreground">Questionário completo com plano personalizado por IA</p>
        </div>
        <ArrowRight className="w-5 h-5 text-primary" />
      </Link>
    </div>
  );
};

export default CRMTools;
