import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { streamAITool, type LeadData } from "@/lib/ai-tools";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const QUESTIONS = [
  { name: "nicho", label: "Qual o nicho do seu negócio?", placeholder: "Ex: Restaurante, Clínica, E-commerce" },
  { name: "cidade", label: "Em qual cidade você atua?", placeholder: "Ex: Rio de Janeiro" },
  { name: "objetivo", label: "Qual seu principal objetivo?", placeholder: "Ex: Aumentar vendas, Gerar leads, Fortalecer marca" },
  { name: "orcamento", label: "Qual seu orçamento mensal para marketing?", placeholder: "Ex: R$ 1.000, R$ 5.000, Não tenho orçamento definido" },
  { name: "presenca_online", label: "Como está sua presença online atual?", placeholder: "Ex: Tenho site e Instagram, Só Instagram, Nada" },
];

const DiagnosticoPage = () => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"questions" | "lead" | "result">("questions");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const q = QUESTIONS[currentQ];

  const handleNext = () => {
    if (!answers[q.name]?.trim()) {
      toast.error("Preencha a resposta antes de continuar.");
      return;
    }
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("lead");
    }
  };

  const handleLeadSubmit = async (lead: LeadData) => {
    setIsLoading(true);
    setStep("result");
    setResult("");

    await streamAITool({
      tool: "diagnostico",
      input: answers,
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
        <Link to="/#ferramentas" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Diagnóstico Inteligente de Marketing</h1>
              <p className="text-muted-foreground">Responda 5 perguntas e receba um plano personalizado com IA.</p>
            </div>
          </div>

          {step === "questions" && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-muted-foreground">Pergunta {currentQ + 1} de {QUESTIONS.length}</span>
                <div className="flex gap-1">
                  {QUESTIONS.map((_, i) => (
                    <div key={i} className={`w-8 h-1.5 rounded-full transition-colors ${i <= currentQ ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
              <label className="block font-display font-semibold text-xl mb-4">{q.label}</label>
              <Input
                value={answers[q.name] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.name]: e.target.value })}
                placeholder={q.placeholder}
                className="bg-background/50 border-border/50 text-lg h-14 mb-6"
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                  Voltar
                </Button>
                <Button variant="hero" onClick={handleNext}>
                  {currentQ < QUESTIONS.length - 1 ? "Próxima" : "Ver Diagnóstico"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "lead" && <LeadCaptureForm onSubmit={handleLeadSubmit} isLoading={isLoading} />}

          {step === "result" && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="font-display font-semibold text-xl">Seu Diagnóstico Personalizado</h2>
              </div>
              {isLoading && !result && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Gerando seu diagnóstico personalizado...
                </div>
              )}
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              {!isLoading && result && (
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Button variant="whatsapp" size="lg" asChild>
                    <a href="https://wa.me/5521965982906?text=Olá! Fiz o diagnóstico de marketing e gostaria de conversar sobre os resultados." target="_blank" rel="noopener noreferrer">
                      Falar com Especialista no WhatsApp
                    </a>
                  </Button>
                  <Button variant="heroOutline" size="lg" onClick={() => { setStep("questions"); setCurrentQ(0); setResult(""); setAnswers({}); }}>
                    Novo Diagnóstico
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

export default DiagnosticoPage;
