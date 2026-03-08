import { useState } from "react";
import { ExternalLink } from "lucide-react";

const categories = ["Todos", "Design", "Web", "Marketing"];

const projects = [
  {
    id: 1,
    title: "Identidade Visual - Atelie Della Decor",
    category: "Design",
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop",
  },
  {
    id: 2,
    title: "E-commerce de Moda",
    category: "Web",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop",
  },
  {
    id: 3,
    title: "Campanha Google Ads",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
  },
  {
    id: 4,
    title: "Branding Restaurante",
    category: "Design",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
  },
  {
    id: 5,
    title: "Landing Page Imobiliária",
    category: "Web",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop",
  },
  {
    id: 6,
    title: "Gestão de Redes Sociais",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=400&fit=crop",
  },
];

const PortfolioSection = () => {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filteredProjects =
    activeCategory === "Todos"
      ? projects
      : projects.filter((p) => p.category === activeCategory);

  return (
    <section id="portfolio" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Nosso <span className="neon-text">Portfólio</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Conheça alguns dos projetos que desenvolvemos para nossos clientes.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(265_89%_65%/0.4)]"
                  : "bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group glass-card overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover-glow"
            >
              <div className="relative overflow-hidden aspect-[3/2]">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-medium">Ver Projeto</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  {project.category}
                </span>
                <h3 className="font-display font-semibold text-lg mt-2">{project.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
