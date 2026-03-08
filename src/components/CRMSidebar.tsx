import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Brain, BarChart3, LogOut, Pencil,
  MapPin, Search, Target, Globe, LineChart, Calendar, Instagram,
  Briefcase, FileText, FilePlus, UserPlus, Package, BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard },
  { title: "Clientes", url: "/crm/clientes", icon: Briefcase },
  { title: "Propostas", url: "/crm/propostas", icon: FileText },
  { title: "Contratos", url: "/crm/contratos", icon: FilePlus },
  { title: "Leads", url: "/crm/leads", icon: Users },
];

const cadastroItems = [
  { title: "Serviços", url: "/crm/servicos", icon: Package },
  { title: "Usuários", url: "/crm/usuarios", icon: UserPlus },
  { title: "Base de Conhecimento", url: "/crm/base-conhecimento", icon: BookOpen },
];

const toolItems = [
  { title: "Google Meu Negócio", url: "/crm/ferramentas/google-business", icon: MapPin },
  { title: "Instagram", url: "/crm/ferramentas/instagram-analyzer", icon: Instagram },
  { title: "SEO", url: "/crm/ferramentas/seo-analyzer", icon: Search },
  { title: "Estratégia", url: "/crm/ferramentas/marketing-strategy", icon: Target },
  { title: "Landing Page", url: "/crm/ferramentas/landing-page", icon: Globe },
  { title: "Calendário", url: "/crm/ferramentas/content-calendar", icon: Calendar },
  { title: "Google Ads", url: "/crm/ferramentas/google-ads", icon: BarChart3 },
  { title: "Bio Instagram", url: "/crm/ferramentas/instagram-bio", icon: Pencil },
  { title: "Leads Strategy", url: "/crm/ferramentas/lead-generation", icon: Users },
  { title: "Concorrentes", url: "/crm/ferramentas/competitor-analysis", icon: LineChart },
];

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<{ nome: string; cargo: string } | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("nome, cargo").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user]);

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span className="text-xs">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Pencil className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-sm">Lápis <span className="text-primary">CRM</span></span>
          )}
        </div>
        {renderGroup("Principal", mainItems)}
        {renderGroup("Cadastros", cadastroItems)}
        {renderGroup("Ferramentas IA", toolItems)}
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && profile && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground truncate">{profile.nome}</p>
            <p className="truncate">{profile.cargo || "Membro"}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
