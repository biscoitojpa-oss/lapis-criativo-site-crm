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
import { AI_TOOLS, streamAITool } from "@/lib/ai-tools";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";

const iconMap: Record<string, React.ElementType> = {
  MapPin, Search, Target, Globe, BarChart3, Pencil, LineChart, Users, Calendar, Instagram,
};

const CRMToolPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = AI_TOOLS.find((t) => t.id === toolId);
  const { user } = useAuth();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!tool) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold mb-4">Ferramenta não encontrada</h1>
        <Link to="/crm/ferramentas"><Button variant="hero">Voltar</Button></Link>
      </div>
    );
  }

  const Icon = iconMap[tool.icon] || Target;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("");

    // No lead capture needed in CRM - user is already authenticated
    await streamAITool({
      tool: tool.id,
      input: formData,
      lead: { nome: "CRM User", email: user?.email || "", whatsapp: "interno" },
      onDelta: (text) => setResult((prev) => prev + text),
      onDone: () => setIsLoading(false),
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/crm/ferramentas" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Ferramentas
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">{tool.title}</h1>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {tool.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1.5">{field.label}</label>
              {field.name.includes("bio") || field.name.includes("descricao") ? (
                <Textarea
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="bg-background/50 border-border/50"
                  rows={3}
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
          <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
            <Brain className="w-5 h-5" />
            {isLoading ? "Analisando..." : "Gerar Análise com IA"}
          </Button>
        </form>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold">Resultado</h2>
          </div>
          {!result && !isLoading && (
            <p className="text-muted-foreground text-sm">Preencha os dados e clique em gerar para ver a análise.</p>
          )}
          {isLoading && !result && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Gerando análise...
            </div>
          )}
          <div className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMToolPage;
