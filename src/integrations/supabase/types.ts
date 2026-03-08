export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      base_conhecimento: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string
          conteudo: string
          criado_em: string
          id: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          conteudo: string
          criado_em?: string
          id?: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          conteudo?: string
          criado_em?: string
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          criado_em: string
          email: string | null
          empresa: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          criado_em?: string
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          criado_em?: string
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      contrato_itens: {
        Row: {
          contrato_id: string
          descricao: string
          id: string
          quantidade: number
          servico_id: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          contrato_id: string
          descricao: string
          id?: string
          quantidade?: number
          servico_id?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          contrato_id?: string
          descricao?: string
          id?: string
          quantidade?: number
          servico_id?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_itens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          assinado_em: string | null
          assinatura_cliente: string | null
          atualizado_em: string
          cliente_id: string
          criado_em: string
          criado_por: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          duracao_meses: number | null
          id: string
          numero: number
          observacoes: string | null
          proposta_id: string | null
          status: Database["public"]["Enums"]["contrato_status"]
          tipo_pagamento: Database["public"]["Enums"]["tipo_pagamento"]
          titulo: string
          token_assinatura: string | null
          valor_mensal: number | null
          valor_total: number
        }
        Insert: {
          assinado_em?: string | null
          assinatura_cliente?: string | null
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          criado_por: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          duracao_meses?: number | null
          id?: string
          numero?: number
          observacoes?: string | null
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          tipo_pagamento?: Database["public"]["Enums"]["tipo_pagamento"]
          titulo: string
          token_assinatura?: string | null
          valor_mensal?: number | null
          valor_total?: number
        }
        Update: {
          assinado_em?: string | null
          assinatura_cliente?: string | null
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          criado_por?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          duracao_meses?: number | null
          id?: string
          numero?: number
          observacoes?: string | null
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["contrato_status"]
          tipo_pagamento?: Database["public"]["Enums"]["tipo_pagamento"]
          titulo?: string
          token_assinatura?: string | null
          valor_mensal?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          atualizado_em: string
          criado_em: string
          dados_entrada: Json | null
          email: string
          ferramenta: string
          id: string
          nome: string
          resultado_analise: Json | null
          whatsapp: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dados_entrada?: Json | null
          email: string
          ferramenta: string
          id?: string
          nome: string
          resultado_analise?: Json | null
          whatsapp: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dados_entrada?: Json | null
          email?: string
          ferramenta?: string
          id?: string
          nome?: string
          resultado_analise?: Json | null
          whatsapp?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          atualizado_em: string
          avatar_url: string | null
          cargo: string
          criado_em: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          avatar_url?: string | null
          cargo?: string
          criado_em?: string
          id?: string
          nome?: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          avatar_url?: string | null
          cargo?: string
          criado_em?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      proposta_itens: {
        Row: {
          descricao: string
          id: string
          proposta_id: string
          quantidade: number
          servico_id: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          descricao: string
          id?: string
          proposta_id: string
          quantidade?: number
          servico_id?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          descricao?: string
          id?: string
          proposta_id?: string
          quantidade?: number
          servico_id?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          atualizado_em: string
          cliente_id: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          numero: number
          observacoes: string | null
          status: Database["public"]["Enums"]["proposta_status"]
          titulo: string
          validade_dias: number
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          titulo: string
          validade_dias?: number
          valor_total?: number
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          titulo?: string
          validade_dias?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string | null
          criado_em: string
          descricao: string | null
          entregaveis: string | null
          id: string
          nivel_complexidade: string | null
          nome: string
          prazo_entrega: number | null
          requer_reuniao: boolean | null
          tipo_cobranca: string
          valor_padrao: number | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          entregaveis?: string | null
          id?: string
          nivel_complexidade?: string | null
          nome: string
          prazo_entrega?: number | null
          requer_reuniao?: boolean | null
          tipo_cobranca?: string
          valor_padrao?: number | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          entregaveis?: string | null
          id?: string
          nivel_complexidade?: string | null
          nome?: string
          prazo_entrega?: number | null
          requer_reuniao?: boolean | null
          tipo_cobranca?: string
          valor_padrao?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          atualizado_em: string
          criado_em: string
          descanso_max: number
          descanso_min: number
          dias_envio: number[]
          digitacao_max: number
          digitacao_min: number
          horario_fim: string
          horario_inicio: string
          id: string
          intervalo_max: number
          intervalo_min: number
          msgs_antes_descanso: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descanso_max?: number
          descanso_min?: number
          dias_envio?: number[]
          digitacao_max?: number
          digitacao_min?: number
          horario_fim?: string
          horario_inicio?: string
          id?: string
          intervalo_max?: number
          intervalo_min?: number
          msgs_antes_descanso?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descanso_max?: number
          descanso_min?: number
          dias_envio?: number[]
          digitacao_max?: number
          digitacao_min?: number
          horario_fim?: string
          horario_inicio?: string
          id?: string
          intervalo_max?: number
          intervalo_min?: number
          msgs_antes_descanso?: number
        }
        Relationships: []
      }
      whatsapp_fila: {
        Row: {
          agendado_para: string
          atualizado_em: string
          criado_em: string
          criado_por: string
          enviado_em: string | null
          erro: string | null
          id: string
          instancia: string
          max_tentativas: number
          mensagem: string
          nome_lead: string | null
          status: Database["public"]["Enums"]["fila_status"]
          telefone: string
          tentativas: number
        }
        Insert: {
          agendado_para?: string
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          instancia?: string
          max_tentativas?: number
          mensagem: string
          nome_lead?: string | null
          status?: Database["public"]["Enums"]["fila_status"]
          telefone: string
          tentativas?: number
        }
        Update: {
          agendado_para?: string
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          instancia?: string
          max_tentativas?: number
          mensagem?: string
          nome_lead?: string | null
          status?: Database["public"]["Enums"]["fila_status"]
          telefone?: string
          tentativas?: number
        }
        Relationships: []
      }
      whatsapp_handoff: {
        Row: {
          ativado_em: string
          ativo: boolean
          desativado_em: string | null
          id: string
          telefone: string
        }
        Insert: {
          ativado_em?: string
          ativo?: boolean
          desativado_em?: string | null
          id?: string
          telefone: string
        }
        Update: {
          ativado_em?: string
          ativo?: boolean
          desativado_em?: string | null
          id?: string
          telefone?: string
        }
        Relationships: []
      }
      whatsapp_mensagens: {
        Row: {
          criado_em: string
          direcao: string
          humano_ativo: boolean
          id: string
          instancia: string
          mensagem: string
          metadata: Json | null
          nome_contato: string | null
          status: string
          telefone: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          direcao?: string
          humano_ativo?: boolean
          id?: string
          instancia?: string
          mensagem: string
          metadata?: Json | null
          nome_contato?: string | null
          status?: string
          telefone: string
          tipo?: string
        }
        Update: {
          criado_em?: string
          direcao?: string
          humano_ativo?: boolean
          id?: string
          instancia?: string
          mensagem?: string
          metadata?: Json | null
          nome_contato?: string | null
          status?: string
          telefone?: string
          tipo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      contrato_status: "ativo" | "encerrado" | "cancelado" | "suspenso"
      fila_status: "pendente" | "processando" | "enviado" | "erro" | "expirado"
      proposta_status:
        | "rascunho"
        | "enviada"
        | "aprovada"
        | "recusada"
        | "cancelada"
      tipo_pagamento: "mensal" | "unico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      contrato_status: ["ativo", "encerrado", "cancelado", "suspenso"],
      fila_status: ["pendente", "processando", "enviado", "erro", "expirado"],
      proposta_status: [
        "rascunho",
        "enviada",
        "aprovada",
        "recusada",
        "cancelada",
      ],
      tipo_pagamento: ["mensal", "unico"],
    },
  },
} as const
