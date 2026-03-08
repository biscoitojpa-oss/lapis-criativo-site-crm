import { useState } from "react";
import { MapPin, Search, Instagram, Loader2, ExternalLink, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LeadResult {
  nome: string;
  url: string;
  descricao: string;
  telefone?: string;
}

const CRMBuscadorLeads = () => {
  const [tab, setTab] = useState("google");
  const [query, setQuery] = useState("");
  const [cidade, setCidade] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadResult[]>([]);

  const searchGoogleBusiness = async () => {
    if (!query.trim() || !cidade.trim()) {
      toast.error("Preencha o nicho e a cidade");
      return;
    }
    setLoading(true);
    setResults([]);

    try {
      const searchQuery = `${query} em ${cidade} site:google.com/maps OR telefone OR whatsapp`;
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: {
          query: searchQuery,
          options: { limit: 20, lang: "pt-br", country: "br" },
        },
      });

      if (error) throw error;

      const items = data?.data || data?.results || [];
      const leads: LeadResult[] = items.map((item: any) => ({
        nome: item.title || "Sem nome",
        url: item.url || "",
        descricao: item.description || item.markdown?.slice(0, 200) || "",
        telefone: extractPhone(item.description || item.markdown || ""),
      }));

      setResults(leads);
      if (leads.length === 0) toast.info("Nenhum resultado encontrado");
    } catch (e: any) {
      toast.error(e.message || "Erro na busca");
    } finally {
      setLoading(false);
    }
  };

  const searchInstagram = async () => {
    if (!query.trim()) {
      toast.error("Preencha o nicho ou perfil");
      return;
    }
    setLoading(true);
    setResults([]);

    try {
      const searchQuery = `site:instagram.com ${query} ${cidade || ""} seguidores`;
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: {
          query: searchQuery,
          options: { limit: 20, lang: "pt-br", country: "br" },
        },
      });

      if (error) throw error;

      const items = data?.data || data?.results || [];
      const leads: LeadResult[] = items
        .filter((item: any) => item.url?.includes("instagram.com"))
        .map((item: any) => ({
          nome: item.title?.replace(" • Instagram photos and videos", "").replace(" (@", " (") || "Perfil",
          url: item.url || "",
          descricao: item.description || "",
        }));

      setResults(leads);
      if (leads.length === 0) toast.info("Nenhum perfil encontrado");
    } catch (e: any) {
      toast.error(e.message || "Erro na busca");
    } finally {
      setLoading(false);
    }
  };

  const extractPhone = (text: string): string | undefined => {
    const match = text.match(/\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/);
    return match ? match[0] : undefined;
  };

  const handleSearch = () => {
    if (tab === "google") searchGoogleBusiness();
    else searchInstagram();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Buscador de Leads</h1>
        <p className="text-muted-foreground">Encontre leads no Google Meu Negócio e perfis no Instagram</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="google" className="gap-2"><MapPin className="w-4 h-4" /> Google Meu Negócio</TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2"><Instagram className="w-4 h-4" /> Instagram</TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="mt-4">
          <div className="glass-card p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nicho (ex: dentista, restaurante...)" className="bg-background/50 border-border/50" />
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade (ex: São Paulo)" className="bg-background/50 border-border/50" />
              <Button onClick={handleSearch} disabled={loading} variant="hero" className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? "Buscando..." : "Buscar Leads"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="instagram" className="mt-4">
          <div className="glass-card p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nicho ou hashtag (ex: #confeitaria)" className="bg-background/50 border-border/50" />
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade (opcional)" className="bg-background/50 border-border/50" />
              <Button onClick={handleSearch} disabled={loading} variant="hero" className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? "Buscando..." : "Buscar Perfis"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold text-sm">{results.length} resultados encontrados</h2>
          </div>
          <div className="divide-y divide-border/20">
            {results.map((r, i) => (
              <div key={i} className="p-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{r.nome}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.descricao}</p>
                    {r.telefone && (
                      <div className="flex items-center gap-1 mt-2 text-green-500 text-xs">
                        <Phone className="w-3 h-3" /> {r.telefone}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {r.telefone && (
                      <a href={`https://wa.me/55${r.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-green-500 text-xs h-7">WhatsApp</Button>
                      </a>
                    )}
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="text-xs h-7">
                        <ExternalLink className="w-3 h-3" /> Abrir
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMBuscadorLeads;
