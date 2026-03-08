import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Brain, Download } from "lucide-react";
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
import jsPDF from "jspdf";

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

  // Clear result when tool changes
  useEffect(() => {
    setResult("");
    setFormData({});
  }, [toolId]);

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

  const handleExportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(30, 25, 50);
    doc.rect(0, 0, 210, 35, "F");
    doc.setFillColor(127, 62, 224);
    doc.rect(0, 33, 210, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Lápis Criativo", 20, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Agência de Marketing Digital", 20, 26);

    doc.setFontSize(11);
    doc.text(tool.title, 190, 18, { align: "right" });

    // Input data
    let y = 48;
    doc.setTextColor(127, 62, 224);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dados de Entrada", 20, y);
    y += 8;

    doc.setTextColor(80, 80, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    tool.fields.forEach((field) => {
      const value = formData[field.name] || "—";
      doc.text(`${field.label}: ${value}`, 20, y);
      y += 6;
    });

    y += 6;
    doc.setTextColor(127, 62, 224);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resultado da Análise", 20, y);
    y += 8;

    // Result text - strip markdown
    doc.setTextColor(30, 25, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const cleanText = result
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "");
    const lines = doc.splitTextToSize(cleanText, 170);
    
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 5;
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(127, 62, 224);
      doc.rect(0, 284, 210, 13, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("Lápis Criativo — Agência de Marketing Digital", 20, 291);
      doc.text(`Página ${i} de ${pageCount}`, 190, 291, { align: "right" });
    }

    const date = new Date().toISOString().split("T")[0];
    doc.save(`${tool.title.replace(/\s+/g, "_")}_${date}.pdf`);
    toast.success("PDF exportado com sucesso!");
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold">Resultado</h2>
            </div>
            {result && !isLoading && (
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4" /> Exportar PDF
              </Button>
            )}
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
