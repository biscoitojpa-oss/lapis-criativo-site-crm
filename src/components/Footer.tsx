import { Instagram, Facebook, Globe, MessageCircle } from "lucide-react";
import logoImg from "@/assets/logo-lapis-criativo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { href: "#inicio", label: "Início" },
    { href: "#sobre", label: "Sobre" },
    { href: "#servicos", label: "Serviços" },
    { href: "#portfolio", label: "Portfólio" },
    { href: "#contato", label: "Contato" },
  ];

  const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/agencialapiscriativo", label: "Instagram" },
    { icon: Facebook, href: "https://facebook.com/agencialapiscriativo", label: "Facebook" },
    { icon: Globe, href: "https://agencialapiscriativo.com.br", label: "Website" },
  ];

  return (
    <footer className="bg-card/50 border-t border-border/50">
      <div className="container-custom py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-6">
            <a href="#" className="flex items-center gap-2 group">
              <img src={logoImg} alt="Lápis Criativo" className="w-32 h-32 object-contain" />
            </a>
            <p className="text-muted-foreground max-w-md">
              Agência de marketing digital especializada em transformar negócios
              através de estratégias criativas e resultados mensuráveis.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 hover:scale-110 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-primary" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-display font-semibold mb-6">Navegação</h4>
            <nav className="space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-6">Contato</h4>
            <div className="space-y-3 text-muted-foreground">
              <p>(21) 96598-2906</p>
              <p>contato@agencialapiscriativo.com.br</p>
              <p>Rio de Janeiro - RJ</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Agência Lápis Criativo. Todos os direitos reservados.
          </p>
          <a
            href="https://wa.me/5521991796781"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all z-50 animate-pulse-glow"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
