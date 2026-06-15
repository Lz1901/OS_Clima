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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          acao: string
          company_id: string
          created_at: string
          detalhes: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          company_id: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          company_id?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string
          device: string | null
          id: string
          imagem_url: string
          ip: string | null
          nome: string
          pmoc_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          imagem_url: string
          ip?: string | null
          nome: string
          pmoc_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          imagem_url?: string
          ip?: string | null
          nome?: string
          pmoc_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_pmoc_id_fkey"
            columns: ["pmoc_id"]
            isOneToOne: false
            referencedRelation: "pmocs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          label: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          template_id: string
          tipo_campo: Database["public"]["Enums"]["checklist_field_type"]
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          label: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          template_id: string
          tipo_campo?: Database["public"]["Enums"]["checklist_field_type"]
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          label?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          template_id?: string
          tipo_campo?: Database["public"]["Enums"]["checklist_field_type"]
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj: string | null
          company_id: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          responsavel: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          assinatura_url: string | null
          block_reason: string | null
          cnpj: string | null
          cor_primaria: string | null
          crea: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          responsavel_tecnico: string | null
          status: Database["public"]["Enums"]["company_status"]
          suspended_at: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          assinatura_url?: string | null
          block_reason?: string | null
          cnpj?: string | null
          cor_primaria?: string | null
          crea?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          responsavel_tecnico?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          suspended_at?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          assinatura_url?: string | null
          block_reason?: string | null
          cnpj?: string | null
          cor_primaria?: string | null
          crea?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          responsavel_tecnico?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          suspended_at?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipamento_fotos: {
        Row: {
          company_id: string
          created_at: string
          descricao: string | null
          equipamento_id: string
          id: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          descricao?: string | null
          equipamento_id: string
          id?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          descricao?: string | null
          equipamento_id?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_fotos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_fotos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          btus: number | null
          company_id: string
          created_at: string
          data_instalacao: string | null
          gas_refrigerante: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["equipamento_status"]
          tensao: string | null
          tipo: Database["public"]["Enums"]["equipamento_tipo"]
          unidade_id: string
          updated_at: string
        }
        Insert: {
          btus?: number | null
          company_id: string
          created_at?: string
          data_instalacao?: string | null
          gas_refrigerante?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["equipamento_status"]
          tensao?: string | null
          tipo?: Database["public"]["Enums"]["equipamento_tipo"]
          unidade_id: string
          updated_at?: string
        }
        Update: {
          btus?: number | null
          company_id?: string
          created_at?: string
          data_instalacao?: string | null
          gas_refrigerante?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["equipamento_status"]
          tensao?: string | null
          tipo?: Database["public"]["Enums"]["equipamento_tipo"]
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          company_id: string
          cor: string | null
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          categoria_id: string
          cliente_id: string | null
          company_id: string
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          observacoes: string | null
          recorrencia: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id: string
          cliente_id?: string | null
          company_id: string
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          observacoes?: string | null
          recorrencia?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string
          cliente_id?: string | null
          company_id?: string
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          recorrencia?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          descricao: string | null
          id: string
          modulo: string
          nome: string
        }
        Insert: {
          descricao?: string | null
          id: string
          modulo: string
          nome: string
        }
        Update: {
          descricao?: string | null
          id?: string
          modulo?: string
          nome?: string
        }
        Relationships: []
      }
      pmoc_equipamentos: {
        Row: {
          created_at: string
          equipamento_id: string
          id: string
          observacoes: string | null
          pmoc_id: string
        }
        Insert: {
          created_at?: string
          equipamento_id: string
          id?: string
          observacoes?: string | null
          pmoc_id: string
        }
        Update: {
          created_at?: string
          equipamento_id?: string
          id?: string
          observacoes?: string | null
          pmoc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmoc_equipamentos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmoc_equipamentos_pmoc_id_fkey"
            columns: ["pmoc_id"]
            isOneToOne: false
            referencedRelation: "pmocs"
            referencedColumns: ["id"]
          },
        ]
      }
      pmoc_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          equipamento_id: string | null
          id: string
          pmoc_id: string
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          pmoc_id: string
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          equipamento_id?: string | null
          id?: string
          pmoc_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmoc_fotos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmoc_fotos_pmoc_id_fkey"
            columns: ["pmoc_id"]
            isOneToOne: false
            referencedRelation: "pmocs"
            referencedColumns: ["id"]
          },
        ]
      }
      pmoc_respostas: {
        Row: {
          created_at: string
          equipamento_id: string | null
          foto_url: string | null
          id: string
          item_id: string
          pmoc_id: string
          valor: string | null
        }
        Insert: {
          created_at?: string
          equipamento_id?: string | null
          foto_url?: string | null
          id?: string
          item_id: string
          pmoc_id: string
          valor?: string | null
        }
        Update: {
          created_at?: string
          equipamento_id?: string | null
          foto_url?: string | null
          id?: string
          item_id?: string
          pmoc_id?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pmoc_respostas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmoc_respostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmoc_respostas_pmoc_id_fkey"
            columns: ["pmoc_id"]
            isOneToOne: false
            referencedRelation: "pmocs"
            referencedColumns: ["id"]
          },
        ]
      }
      pmocs: {
        Row: {
          cliente_id: string | null
          company_id: string
          created_at: string
          data_agendada: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          id: string
          numero: string | null
          observacoes: string | null
          pdf_url: string | null
          periodicidade: string | null
          pmoc_origem_id: string | null
          proxima_execucao: string | null
          status: Database["public"]["Enums"]["pmoc_status"]
          tecnico_id: string | null
          template_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          company_id: string
          created_at?: string
          data_agendada?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          pdf_url?: string | null
          periodicidade?: string | null
          pmoc_origem_id?: string | null
          proxima_execucao?: string | null
          status?: Database["public"]["Enums"]["pmoc_status"]
          tecnico_id?: string | null
          template_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          company_id?: string
          created_at?: string
          data_agendada?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          pdf_url?: string | null
          periodicidade?: string | null
          pmoc_origem_id?: string | null
          proxima_execucao?: string | null
          status?: Database["public"]["Enums"]["pmoc_status"]
          tecnico_id?: string | null
          template_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmocs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmocs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmocs_pmoc_origem_id_fkey"
            columns: ["pmoc_origem_id"]
            isOneToOne: false
            referencedRelation: "pmocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmocs_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmocs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmocs_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          email: string
          id: string
          is_super_admin: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          email: string
          id: string
          is_super_admin?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          cliente_id: string
          company_id: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          responsavel_local: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["unidade_tipo"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          company_id: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          responsavel_local?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          company_id?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          responsavel_local?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assinaturas_safe: {
        Row: {
          created_at: string | null
          id: string | null
          imagem_url: string | null
          nome: string | null
          pmoc_id: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          imagem_url?: string | null
          nome?: string | null
          pmoc_id?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          imagem_url?: string | null
          nome?: string | null
          pmoc_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_pmoc_id_fkey"
            columns: ["pmoc_id"]
            isOneToOne: false
            referencedRelation: "pmocs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calc_proxima_execucao: {
        Args: { _base: string; _periodicidade: string }
        Returns: string
      }
      check_user_permission: {
        Args: { _permission_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_active: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "tecnico" | "financeiro" | "supervisor"
      checklist_field_type:
        | "checkbox"
        | "texto"
        | "numero"
        | "selecao"
        | "foto"
        | "observacao"
      company_status: "ativa" | "suspensa" | "bloqueada"
      equipamento_status: "ativo" | "inativo" | "manutencao" | "defeito"
      equipamento_tipo:
        | "split"
        | "cassete"
        | "piso_teto"
        | "vrf"
        | "fan_coil"
        | "chiller"
        | "janela"
      pmoc_status:
        | "pendente"
        | "em_andamento"
        | "finalizado"
        | "aguardando_aprovacao"
        | "cancelado"
      unidade_tipo: "matriz" | "filial" | "loja" | "escritorio" | "condominio"
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
      app_role: ["admin", "tecnico", "financeiro", "supervisor"],
      checklist_field_type: [
        "checkbox",
        "texto",
        "numero",
        "selecao",
        "foto",
        "observacao",
      ],
      company_status: ["ativa", "suspensa", "bloqueada"],
      equipamento_status: ["ativo", "inativo", "manutencao", "defeito"],
      equipamento_tipo: [
        "split",
        "cassete",
        "piso_teto",
        "vrf",
        "fan_coil",
        "chiller",
        "janela",
      ],
      pmoc_status: [
        "pendente",
        "em_andamento",
        "finalizado",
        "aguardando_aprovacao",
        "cancelado",
      ],
      unidade_tipo: ["matriz", "filial", "loja", "escritorio", "condominio"],
    },
  },
} as const
