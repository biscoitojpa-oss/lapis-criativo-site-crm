import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Brain, BarChart3, LogOut, Pencil,
  MapPin, Search, Target, Globe, LineChart, Calendar, Instagram,
  Briefcase, FileText, FilePlus, UserPlus, Package, BookOpen, Bot, Crosshair, MessageCircle, CreditCard, CalendarClock,
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
  { title: "Pagamentos", url: "/crm/pagamentos", icon: CreditCard },
];

const agentItems = [
  { title: "Criativo X", url: "/crm/criativo-x", icon: Bot },
  { title: "WhatsApp", url: "/crm/whatsapp", icon: MessageCircle },
  { title: "Buscador de Leads", url: "/crm/buscador-leads", icon: Crosshair },
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
        {renderGroup("Agentes", agentItems)}
        
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
