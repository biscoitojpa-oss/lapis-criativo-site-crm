import { MessageCircle, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-600/10 to-primary/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        <div className="glass-card p-12 md:p-16 text-center max-w-4xl mx-auto border-primary/20">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Seu negócio não pode continuar{" "}
            <span className="neon-text">invisível</span> na internet.
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Vamos transformar sua presença digital e gerar resultados reais para o seu negócio.
            Entre em contato agora e descubra como podemos ajudar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="whatsapp" size="xl" asChild>
              <a
                href="https://wa.me/5521965982906"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </a>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <a href="#contato">
                <FileCheck className="w-5 h-5" />
                Solicitar Diagnóstico Gratuito
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
