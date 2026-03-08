import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users,
  Calendar, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { AI_TOOLS, streamAITool, type LeadData, type ToolInput } from "@/lib/ai-tools";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const iconMap: Record<string, React.ElementType> = {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users, Calendar, Instagram,
};

const ToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = AI_TOOLS.find((t) => t.id === toolId);

  const [formData, setFormData] = useState<ToolInput>({});
  const [step, setStep] = useState<"input" | "lead" | "result">("input");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!tool) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ferramenta não encontrada</h1>
          <Link to="/#ferramentas">
            <Button variant="hero">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = iconMap[tool.icon] || Target;

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allFilled = tool.fields.every((f) => {
      if (f.label.includes("opcional")) return true;
      return formData[f.name]?.trim();
    });
    if (!allFilled) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setStep("lead");
  };

  const handleLeadSubmit = async (lead: LeadData) => {
    setIsLoading(true);
    setStep("result");
    setResult("");

    await streamAITool({
      tool: tool.id,
      input: formData,
      lead,
      onDelta: (text) => setResult((prev) => prev + text),
      onDone: () => setIsLoading(false),
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom py-8">
        <Link
          to="/#ferramentas"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Ferramentas
        </Link>

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{tool.title}</h1>
              <p className="text-muted-foreground">{tool.description}</p>
            </div>
          </div>

          {step === "input" && (
            <form onSubmit={handleInputSubmit} className="glass-card p-6 md:p-8 space-y-6">
              <h2 className="font-display font-semibold text-xl mb-2">Preencha os dados para análise</h2>
              {tool.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-2">{field.label}</label>
                  {field.name.includes("bio") || field.name.includes("descricao") ? (
                    <Textarea
                      value={formData[field.name] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      className="bg-background/50 border-border/50"
                      rows={4}
                    />
                  ) : (
                    <Input
                      value={formData[field.name] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      className="bg-background/50 border-border/50"
                    />
                  )}
                </div>
              ))}
              <Button type="submit" variant="hero" className="w-full">
                <Brain className="w-5 h-5" />
                Continuar para Análise
              </Button>
            </form>
          )}

          {step === "lead" && (
            <LeadCaptureForm onSubmit={handleLeadSubmit} isLoading={isLoading} />
          )}

          {step === "result" && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="font-display font-semibold text-xl">Resultado da Análise</h2>
              </div>
              {isLoading && !result && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Gerando análise com inteligência artificial...
                </div>
              )}
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              {!isLoading && result && (
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Button variant="hero" onClick={() => { setStep("input"); setResult(""); setFormData({}); }}>
                    Nova Análise
                  </Button>
                  <Button variant="whatsapp" asChild>
                    <a href="https://wa.me/5521965982906?text=Olá! Acabei de usar a ferramenta de IA e gostaria de saber mais." target="_blank" rel="noopener noreferrer">
                      Falar com Especialista
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolPage;
