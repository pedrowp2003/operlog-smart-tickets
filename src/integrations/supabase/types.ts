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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      armazens: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      chamado_acoes: {
        Row: {
          chamado_id: string
          created_at: string
          desconsiderada: boolean
          descricao: string
          fornecedor_id: string | null
          id: string
          tecnico_id: string
          valor: number | null
        }
        Insert: {
          chamado_id: string
          created_at?: string
          desconsiderada?: boolean
          descricao: string
          fornecedor_id?: string | null
          id?: string
          tecnico_id: string
          valor?: number | null
        }
        Update: {
          chamado_id?: string
          created_at?: string
          desconsiderada?: boolean
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          tecnico_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_acoes_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: {
          categoria: string | null
          codigo_erro: string | null
          created_at: string
          criado_por: string
          data_inicio: string | null
          data_prevista_termino: string | null
          descricao: string
          foto_defeito_url: string | null
          id: string
          maquina_id: string
          numero: string
          progresso: number
          servico_descricao: string | null
          situacao_maquina: string
          status: string
          tecnico_id: string | null
          tecnico2_id: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          codigo_erro?: string | null
          created_at?: string
          criado_por: string
          data_inicio?: string | null
          data_prevista_termino?: string | null
          descricao: string
          foto_defeito_url?: string | null
          id?: string
          maquina_id: string
          numero: string
          progresso?: number
          servico_descricao?: string | null
          situacao_maquina: string
          status?: string
          tecnico_id?: string | null
          tecnico2_id?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          codigo_erro?: string | null
          created_at?: string
          criado_por?: string
          data_inicio?: string | null
          data_prevista_termino?: string | null
          descricao?: string
          foto_defeito_url?: string | null
          id?: string
          maquina_id?: string
          numero?: string
          progresso?: number
          servico_descricao?: string | null
          situacao_maquina?: string
          status?: string
          tecnico_id?: string | null
          tecnico2_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          created_at: string
          descricao: string
          foto_url: string | null
          id: string
          natureza: string
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          foto_url?: string | null
          id?: string
          natureza?: string
          nome: string
          telefone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          foto_url?: string | null
          id?: string
          natureza?: string
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      maquina_frotas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      maquina_marcas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      maquina_modelos: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      maquina_tipos: {
        Row: {
          created_at: string
          id: string
          nome: string
          prioridade: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          prioridade?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          prioridade?: boolean
        }
        Relationships: []
      }
      maquinas: {
        Row: {
          armazem: string
          created_at: string
          foto_url: string | null
          frota: string
          id: string
          marca: string
          modelo: string
          prioridade: boolean
          tipo: string
          unidade: string
          updated_at: string
        }
        Insert: {
          armazem: string
          created_at?: string
          foto_url?: string | null
          frota: string
          id?: string
          marca: string
          modelo: string
          prioridade?: boolean
          tipo: string
          unidade: string
          updated_at?: string
        }
        Update: {
          armazem?: string
          created_at?: string
          foto_url?: string | null
          frota?: string
          id?: string
          marca?: string
          modelo?: string
          prioridade?: boolean
          tipo?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          armazem: string | null
          created_at: string
          email: string
          foto_url: string | null
          id: string
          is_master_analista: boolean
          must_change_password: boolean
          nome: string | null
          role: Database["public"]["Enums"]["app_role"]
          sobrenome: string | null
          telefone: string
          unidade: string | null
          updated_at: string
          username: string
        }
        Insert: {
          area?: string | null
          armazem?: string | null
          created_at?: string
          email: string
          foto_url?: string | null
          id: string
          is_master_analista?: boolean
          must_change_password?: boolean
          nome?: string | null
          role: Database["public"]["Enums"]["app_role"]
          sobrenome?: string | null
          telefone: string
          unidade?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          area?: string | null
          armazem?: string | null
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: string
          is_master_analista?: boolean
          must_change_password?: boolean
          nome?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sobrenome?: string | null
          telefone?: string
          unidade?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_analista_ids: { Args: never; Returns: string[] }
      get_email_by_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_analista: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "gerente"
        | "coordenador"
        | "supervisor"
        | "tecnico"
        | "analista"
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
      app_role: ["gerente", "coordenador", "supervisor", "tecnico", "analista"],
    },
  },
} as const
