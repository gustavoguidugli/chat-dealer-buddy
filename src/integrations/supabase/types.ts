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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      anexos_anotacao: {
        Row: {
          created_at: string
          id: number
          id_anotacao: number
          id_empresa: number
          nome_arquivo: string
          storage_path: string
          tamanho: number
          tipo_arquivo: string
          url_publica: string
        }
        Insert: {
          created_at?: string
          id?: number
          id_anotacao: number
          id_empresa: number
          nome_arquivo: string
          storage_path: string
          tamanho?: number
          tipo_arquivo: string
          url_publica: string
        }
        Update: {
          created_at?: string
          id?: number
          id_anotacao?: number
          id_empresa?: number
          nome_arquivo?: string
          storage_path?: string
          tamanho?: number
          tipo_arquivo?: string
          url_publica?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_anotacao_id_anotacao_fkey"
            columns: ["id_anotacao"]
            isOneToOne: false
            referencedRelation: "anotacoes_lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_anotacao_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      anotacoes_lead: {
        Row: {
          conteudo: string
          created_at: string | null
          criado_por: string | null
          id: number
          id_empresa: number
          id_lead: number
          mencionados: string[] | null
          updated_at: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          criado_por?: string | null
          id?: number
          id_empresa: number
          id_lead: number
          mencionados?: string[] | null
          updated_at?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          criado_por?: string | null
          id?: number
          id_empresa?: number
          id_lead?: number
          mencionados?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anotacoes_lead_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anotacoes_lead_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      atividade_participantes: {
        Row: {
          created_at: string | null
          email: string
          id_atividade: number
          nome: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id_atividade: number
          nome?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id_atividade?: number
          nome?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividade_participantes_id_atividade_fkey"
            columns: ["id_atividade"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_participantes_id_atividade_fkey"
            columns: ["id_atividade"]
            isOneToOne: false
            referencedRelation: "atividades_sao_paulo"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          assunto: string
          atribuida_a: string | null
          concluida: boolean | null
          concluida_em: string | null
          concluida_por: string | null
          created_at: string | null
          created_by: string | null
          data_vencimento: string
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: number
          id_empresa: number
          id_lead: number | null
          prioridade: string | null
          tipo: string
          updated_at: string | null
          visivel_convidados: boolean | null
        }
        Insert: {
          assunto: string
          atribuida_a?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_vencimento: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: number
          id_empresa: number
          id_lead?: number | null
          prioridade?: string | null
          tipo: string
          updated_at?: string | null
          visivel_convidados?: boolean | null
        }
        Update: {
          assunto?: string
          atribuida_a?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_vencimento?: string
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: number
          id_empresa?: number
          id_lead?: number | null
          prioridade?: string | null
          tipo?: string
          updated_at?: string | null
          visivel_convidados?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      buffer_supabase: {
        Row: {
          created_at: string | null
          id: number
          id_empresa: number | null
          mensagem: string | null
          whatsapp_chat_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_empresa?: number | null
          mensagem?: string | null
          whatsapp_chat_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_empresa?: number | null
          mensagem?: string | null
          whatsapp_chat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buffer_supabase_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_customizados: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: number
          id_empresa: number
          id_funil: number | null
          nome: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          slug: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          id_empresa: number
          id_funil?: number | null
          nome: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          slug: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          id_empresa?: number
          id_funil?: number | null
          nome?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          slug?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "campos_customizados_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_customizados_id_funil_fkey"
            columns: ["id_funil"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      config_empresas_geral: {
        Row: {
          created_at: string
          crm_is_ativo: boolean | null
          faq_geral_maquina: string | null
          faq_pos_qualificacao_maquina: string
          faq_purificador: string
          faq_qualificacao_maquina: string
          horarios_funcionamento: Json
          id_empresa: number
          mensagem_saudacao: string | null
          mensagem_triagem: string | null
          triagem_is_ativo: boolean | null
          updated_at: string
          wait_segundos: number | null
        }
        Insert: {
          created_at?: string
          crm_is_ativo?: boolean | null
          faq_geral_maquina?: string | null
          faq_pos_qualificacao_maquina?: string
          faq_purificador?: string
          faq_qualificacao_maquina?: string
          horarios_funcionamento?: Json
          id_empresa: number
          mensagem_saudacao?: string | null
          mensagem_triagem?: string | null
          triagem_is_ativo?: boolean | null
          updated_at?: string
          wait_segundos?: number | null
        }
        Update: {
          created_at?: string
          crm_is_ativo?: boolean | null
          faq_geral_maquina?: string | null
          faq_pos_qualificacao_maquina?: string
          faq_purificador?: string
          faq_qualificacao_maquina?: string
          horarios_funcionamento?: Json
          id_empresa?: number
          mensagem_saudacao?: string | null
          mensagem_triagem?: string | null
          triagem_is_ativo?: boolean | null
          updated_at?: string
          wait_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "config_empresas_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: true
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          anotacao_interna: string | null
          celular: string | null
          chatbot_ativo: boolean | null
          cidade: string | null
          cliente_nome: string | null
          codigo_cliente: string
          data_criacao: string
          data_disparo: string | null
          data_importacao: string | null
          data_ultima_mensagem: string | null
          disparo_enviado: boolean | null
          email: string | null
          encaminhado_para_atendente: boolean | null
          etapa_chatbot: string | null
          etapa_macro: Database["public"]["Enums"]["etapa_macro"] | null
          external_id: string | null
          first_fup: boolean | null
          first_fup_data: string | null
          id: number
          id_cliente: string
          id_empresa: number | null
          imagem_perfil_url: string | null
          nome_empresa: string
          nome_importacao: string | null
          quem_disparou: string | null
          regiao: string | null
          score: number | null
          second_fup: boolean | null
          second_fup_data: string | null
          tags: string | null
          telefone_fixo: string | null
          third_fup: boolean | null
          third_fup_data: string | null
          tipo: Database["public"]["Enums"]["tipo_contato"] | null
          tipo_contato: string | null
          tipo_refil: string | null
          ultima_mensagem: string
          whatsapp: string | null
        }
        Insert: {
          anotacao_interna?: string | null
          celular?: string | null
          chatbot_ativo?: boolean | null
          cidade?: string | null
          cliente_nome?: string | null
          codigo_cliente?: string
          data_criacao?: string
          data_disparo?: string | null
          data_importacao?: string | null
          data_ultima_mensagem?: string | null
          disparo_enviado?: boolean | null
          email?: string | null
          encaminhado_para_atendente?: boolean | null
          etapa_chatbot?: string | null
          etapa_macro?: Database["public"]["Enums"]["etapa_macro"] | null
          external_id?: string | null
          first_fup?: boolean | null
          first_fup_data?: string | null
          id?: number
          id_cliente?: string
          id_empresa?: number | null
          imagem_perfil_url?: string | null
          nome_empresa?: string
          nome_importacao?: string | null
          quem_disparou?: string | null
          regiao?: string | null
          score?: number | null
          second_fup?: boolean | null
          second_fup_data?: string | null
          tags?: string | null
          telefone_fixo?: string | null
          third_fup?: boolean | null
          third_fup_data?: string | null
          tipo?: Database["public"]["Enums"]["tipo_contato"] | null
          tipo_contato?: string | null
          tipo_refil?: string | null
          ultima_mensagem?: string
          whatsapp?: string | null
        }
        Update: {
          anotacao_interna?: string | null
          celular?: string | null
          chatbot_ativo?: boolean | null
          cidade?: string | null
          cliente_nome?: string | null
          codigo_cliente?: string
          data_criacao?: string
          data_disparo?: string | null
          data_importacao?: string | null
          data_ultima_mensagem?: string | null
          disparo_enviado?: boolean | null
          email?: string | null
          encaminhado_para_atendente?: boolean | null
          etapa_chatbot?: string | null
          etapa_macro?: Database["public"]["Enums"]["etapa_macro"] | null
          external_id?: string | null
          first_fup?: boolean | null
          first_fup_data?: string | null
          id?: number
          id_cliente?: string
          id_empresa?: number | null
          imagem_perfil_url?: string | null
          nome_empresa?: string
          nome_importacao?: string | null
          quem_disparou?: string | null
          regiao?: string | null
          score?: number | null
          second_fup?: boolean | null
          second_fup_data?: string | null
          tags?: string | null
          telefone_fixo?: string | null
          third_fup?: boolean | null
          third_fup_data?: string | null
          tipo?: Database["public"]["Enums"]["tipo_contato"] | null
          tipo_contato?: string | null
          tipo_refil?: string | null
          ultima_mensagem?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_geral: {
        Row: {
          ativo: boolean | null
          created_at: string
          deal_id_pipedrive: string | null
          empresa_id: number | null
          id: number
          interesse: string | null
          nome_lead: string | null
          sourceApp: string | null
          tipo_atendimento: string | null
          whatsapp: string | null
          whatsapp_id: string | null
          whatsapp_padrao_pipedrive: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          deal_id_pipedrive?: string | null
          empresa_id?: number | null
          id?: number
          interesse?: string | null
          nome_lead?: string | null
          sourceApp?: string | null
          tipo_atendimento?: string | null
          whatsapp?: string | null
          whatsapp_id?: string | null
          whatsapp_padrao_pipedrive?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          deal_id_pipedrive?: string | null
          empresa_id?: number | null
          id?: number
          interesse?: string | null
          nome_lead?: string | null
          sourceApp?: string | null
          tipo_atendimento?: string | null
          whatsapp?: string | null
          whatsapp_id?: string | null
          whatsapp_padrao_pipedrive?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_geral_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_sdr_maquinagelo: {
        Row: {
          "1_dimensionamento_maquina": string | null
          "2_dimensionamento_maquina": string | null
          ativo: boolean | null
          cidade: string | null
          cnpj: string | null
          consumo_diario: number | null
          consumo_mensal: number | null
          created_at: string | null
          deal_id_pipedrive: string | null
          dias_semana: number | null
          enviou_modelos: boolean | null
          etiqueta: string | null
          gasto_mensal: number | null
          id: string
          id_empresa: number | null
          interesse: string | null
          nome_lead: string
          sourceApp: string | null
          stage: string | null
          tipo_atendimento: string
          tipo_uso: string | null
          whatsapp: string
          whatsapp_id: string | null
          whatsapp_padrao_pipedrive: string | null
        }
        Insert: {
          "1_dimensionamento_maquina"?: string | null
          "2_dimensionamento_maquina"?: string | null
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          consumo_diario?: number | null
          consumo_mensal?: number | null
          created_at?: string | null
          deal_id_pipedrive?: string | null
          dias_semana?: number | null
          enviou_modelos?: boolean | null
          etiqueta?: string | null
          gasto_mensal?: number | null
          id?: string
          id_empresa?: number | null
          interesse?: string | null
          nome_lead?: string
          sourceApp?: string | null
          stage?: string | null
          tipo_atendimento?: string
          tipo_uso?: string | null
          whatsapp?: string
          whatsapp_id?: string | null
          whatsapp_padrao_pipedrive?: string | null
        }
        Update: {
          "1_dimensionamento_maquina"?: string | null
          "2_dimensionamento_maquina"?: string | null
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          consumo_diario?: number | null
          consumo_mensal?: number | null
          created_at?: string | null
          deal_id_pipedrive?: string | null
          dias_semana?: number | null
          enviou_modelos?: boolean | null
          etiqueta?: string | null
          gasto_mensal?: number | null
          id?: string
          id_empresa?: number | null
          interesse?: string | null
          nome_lead?: string
          sourceApp?: string | null
          stage?: string | null
          tipo_atendimento?: string
          tipo_uso?: string | null
          whatsapp?: string
          whatsapp_id?: string | null
          whatsapp_padrao_pipedrive?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_sdr_maquinagelo_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_sdr_maquinagelo"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_sdr_purificador: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          created_at: string
          deal_id_pipedrive: string | null
          id: number
          id_empresa: number | null
          imagens_enviadas: boolean | null
          interesse: string | null
          sourceApp: string | null
          tipo_uso: string | null
          whatsapp: string | null
          whatsapp_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          created_at?: string
          deal_id_pipedrive?: string | null
          id?: number
          id_empresa?: number | null
          imagens_enviadas?: boolean | null
          interesse?: string | null
          sourceApp?: string | null
          tipo_uso?: string | null
          whatsapp?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          created_at?: string
          deal_id_pipedrive?: string | null
          id?: number
          id_empresa?: number | null
          imagens_enviadas?: boolean | null
          interesse?: string | null
          sourceApp?: string | null
          tipo_uso?: string | null
          whatsapp?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_sdr_purificador_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_sdr_purificador"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          anotacao_interna: string | null
          assigned_user_id: string | null
          atualizado_em: string | null
          contato_nome: string | null
          contato_whatsapp: string | null
          criado_em: string | null
          etapa: string | null
          finalizado_em: string | null
          foto_perfil: string | null
          id: string
          id_atendente: string | null
          id_contato: string | null
          id_empresa: number | null
          status: Database["public"]["Enums"]["status_conversa"] | null
          tags: string | null
          ultima_mensagem: string | null
          ultima_mensagem_em: string | null
        }
        Insert: {
          anotacao_interna?: string | null
          assigned_user_id?: string | null
          atualizado_em?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          criado_em?: string | null
          etapa?: string | null
          finalizado_em?: string | null
          foto_perfil?: string | null
          id?: string
          id_atendente?: string | null
          id_contato?: string | null
          id_empresa?: number | null
          status?: Database["public"]["Enums"]["status_conversa"] | null
          tags?: string | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
        }
        Update: {
          anotacao_interna?: string | null
          assigned_user_id?: string | null
          atualizado_em?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          criado_em?: string | null
          etapa?: string | null
          finalizado_em?: string | null
          foto_perfil?: string | null
          id?: string
          id_atendente?: string | null
          id_contato?: string | null
          id_empresa?: number | null
          status?: Database["public"]["Enums"]["status_conversa"] | null
          tags?: string | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_id_atendente_fkey"
            columns: ["id_atendente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "conversas_id_contato_fkey"
            columns: ["id_contato"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id_cliente"]
          },
          {
            foreignKeyName: "conversas_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas_sdr_maquinagelo: {
        Row: {
          anotacao_interna: string | null
          assigned_user_id: string | null
          atualizado_em: string | null
          contato_nome: string | null
          contato_whatsapp: string | null
          criado_em: string | null
          etapa: string | null
          finalizado_em: string | null
          foto_perfil: string | null
          id: string
          id_atendente: string | null
          id_contato: string | null
          id_empresa: number | null
          status: Database["public"]["Enums"]["status_conversa"] | null
          tags: string | null
          ultima_mensagem: string | null
          ultima_mensagem_em: string | null
        }
        Insert: {
          anotacao_interna?: string | null
          assigned_user_id?: string | null
          atualizado_em?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          criado_em?: string | null
          etapa?: string | null
          finalizado_em?: string | null
          foto_perfil?: string | null
          id?: string
          id_atendente?: string | null
          id_contato?: string | null
          id_empresa?: number | null
          status?: Database["public"]["Enums"]["status_conversa"] | null
          tags?: string | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
        }
        Update: {
          anotacao_interna?: string | null
          assigned_user_id?: string | null
          atualizado_em?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          criado_em?: string | null
          etapa?: string | null
          finalizado_em?: string | null
          foto_perfil?: string | null
          id?: string
          id_atendente?: string | null
          id_contato?: string | null
          id_empresa?: number | null
          status?: Database["public"]["Enums"]["status_conversa"] | null
          tags?: string | null
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_sdr_maquinagelo_id_atendente_fkey"
            columns: ["id_atendente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "conversas_sdr_maquinagelo_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_sdr_maquinagelo"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string | null
          criado_por: string | null
          email_destino: string | null
          empresa_id: number
          expira_em: string | null
          id: string
          max_usos: number | null
          tipo: string
          token: string
          updated_at: string | null
          usos_atuais: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          criado_por?: string | null
          email_destino?: string | null
          empresa_id: number
          expira_em?: string | null
          id?: string
          max_usos?: number | null
          tipo: string
          token?: string
          updated_at?: string | null
          usos_atuais?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          criado_por?: string | null
          email_destino?: string | null
          empresa_id?: number
          expira_em?: string | null
          id?: string
          max_usos?: number | null
          tipo?: string
          token?: string
          updated_at?: string | null
          usos_atuais?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      document_labels: {
        Row: {
          created_at: string | null
          document_id: number
          label_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: number
          label_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: number
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_labels_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          id_empresa: number | null
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          id_empresa?: number | null
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          id_empresa?: number | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          data_criacao: string | null
          email: string | null
          endereco: string | null
          id: number
          logo_url: string | null
          message_sender: string | null
          message_sender_token: string | null
          message_sender_url: string | null
          nome: string
          nome_automacao_refil: string | null
          site_url: string | null
          telefone: string | null
          whatsapp_automacao_refil: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          data_criacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: never
          logo_url?: string | null
          message_sender?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          nome: string
          nome_automacao_refil?: string | null
          site_url?: string | null
          telefone?: string | null
          whatsapp_automacao_refil?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          data_criacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: never
          logo_url?: string | null
          message_sender?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          nome?: string
          nome_automacao_refil?: string | null
          site_url?: string | null
          telefone?: string | null
          whatsapp_automacao_refil?: string | null
        }
        Relationships: []
      }
      empresas_geral: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          endereço: string | null
          id: number
          message_sender: string | null
          message_sender_token: string | null
          message_sender_url: string | null
          message_sender_url_document: string | null
          message_sender_url_image: string | null
          nome: string | null
          nome_automacao: string | null
          numero_automacao: string | null
          site_url: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereço?: string | null
          id?: number
          message_sender?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          message_sender_url_document?: string | null
          message_sender_url_image?: string | null
          nome?: string | null
          nome_automacao?: string | null
          numero_automacao?: string | null
          site_url?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereço?: string | null
          id?: number
          message_sender?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          message_sender_url_document?: string | null
          message_sender_url_image?: string | null
          nome?: string | null
          nome_automacao?: string | null
          numero_automacao?: string | null
          site_url?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      empresas_sdr_maquinagelo: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          data_criacao: string | null
          email: string | null
          endereco: string | null
          id: number
          logo_url: string | null
          message_sender: string | null
          message_sender_token: string | null
          message_sender_url: string | null
          nome: string
          nome_automacao_sdr_maquinagelo: string | null
          nome_numero_manutencao: string | null
          nome_numero_purificador: string | null
          site_url: string | null
          telefone: string | null
          whatsapp_automacao_sdr_maqgelo: string | null
          whatsapp_numero_manutencao: string | null
          whatsapp_numero_purificador: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          data_criacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: never
          logo_url?: string | null
          message_sender?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          nome: string
          nome_automacao_sdr_maquinagelo?: string | null
          nome_numero_manutencao?: string | null
          nome_numero_purificador?: string | null
          site_url?: string | null
          telefone?: string | null
          whatsapp_automacao_sdr_maqgelo?: string | null
          whatsapp_numero_manutencao?: string | null
          whatsapp_numero_purificador?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          data_criacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: never
          logo_url?: string | null
          message_sender?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          nome?: string
          nome_automacao_sdr_maquinagelo?: string | null
          nome_numero_manutencao?: string | null
          nome_numero_purificador?: string | null
          site_url?: string | null
          telefone?: string | null
          whatsapp_automacao_sdr_maqgelo?: string | null
          whatsapp_numero_manutencao?: string | null
          whatsapp_numero_purificador?: string | null
        }
        Relationships: []
      }
      empresas_sdr_purificador: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cnpj: string | null
          data_criacao: string | null
          email: string | null
          endereco: string | null
          id: number
          logo_url: string | null
          message_sender: string | null
          message_sender_document_url: string | null
          message_sender_image_url: string | null
          message_sender_token: string | null
          message_sender_url: string | null
          nome: string
          nome_automacao_sdr_purificador: string | null
          site_url: string | null
          telefone: string | null
          whatsapp_automacao_sdr_purificador: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          data_criacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: never
          logo_url?: string | null
          message_sender?: string | null
          message_sender_document_url?: string | null
          message_sender_image_url?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          nome: string
          nome_automacao_sdr_purificador?: string | null
          site_url?: string | null
          telefone?: string | null
          whatsapp_automacao_sdr_purificador?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          data_criacao?: string | null
          email?: string | null
          endereco?: string | null
          id?: never
          logo_url?: string | null
          message_sender?: string | null
          message_sender_document_url?: string | null
          message_sender_image_url?: string | null
          message_sender_token?: string | null
          message_sender_url?: string | null
          nome?: string
          nome_automacao_sdr_purificador?: string | null
          site_url?: string | null
          telefone?: string | null
          whatsapp_automacao_sdr_purificador?: string | null
        }
        Relationships: []
      }
      etapas_funil: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: number
          id_funil: number
          meta_dias: number | null
          nome: string
          ordem: number
          probabilidade_fechamento: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          id_funil: number
          meta_dias?: number | null
          nome: string
          ordem: number
          probabilidade_fechamento?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: number
          id_funil?: number
          meta_dias?: number | null
          nome?: string
          ordem?: number
          probabilidade_fechamento?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapas_funil_id_funil_fkey"
            columns: ["id_funil"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquestas_conversa: {
        Row: {
          created_at: string
          criada_por: string | null
          id: number
          id_conversa: string | null
          id_etiqueta: number | null
        }
        Insert: {
          created_at?: string
          criada_por?: string | null
          id?: number
          id_conversa?: string | null
          id_etiqueta?: number | null
        }
        Update: {
          created_at?: string
          criada_por?: string | null
          id?: number
          id_conversa?: string | null
          id_etiqueta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "etiquestas_conversa_criada_por_fkey"
            columns: ["criada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "etiquestas_conversa_id_conversa_fkey"
            columns: ["id_conversa"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etiquestas_conversa_id_etiqueta_fkey"
            columns: ["id_etiqueta"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          cor: string | null
          created_at: string
          id: number
          id_empresa: number | null
          titulo: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: number
          id_empresa?: number | null
          titulo?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: number
          id_empresa?: number | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas_card: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          icone: string | null
          id: number
          id_empresa: number
          nome: string
          ordem: number | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: number
          id_empresa: number
          nome: string
          ordem?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: number
          id_empresa?: number
          nome?: string
          ordem?: number | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_card_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_empresa: {
        Row: {
          ativo: boolean | null
          contexto: string
          created_at: string | null
          embedding: string | null
          empresa_id: number
          id: string
          ordem: number | null
          pergunta: string
          resposta: string
          tags: string[] | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          contexto: string
          created_at?: string | null
          embedding?: string | null
          empresa_id: number
          id?: string
          ordem?: number | null
          pergunta: string
          resposta: string
          tags?: string[] | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          contexto?: string
          created_at?: string | null
          embedding?: string | null
          empresa_id?: number
          id?: string
          ordem?: number | null
          pergunta?: string
          resposta?: string
          tags?: string[] | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_labels: {
        Row: {
          created_at: string | null
          faq_id: number
          label_id: string
        }
        Insert: {
          created_at?: string | null
          faq_id: number
          label_id: string
        }
        Update: {
          created_at?: string | null
          faq_id?: number
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_labels_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "faqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          ativo: boolean | null
          contexto: string
          created_at: string | null
          created_by: string | null
          id: number
          id_empresa: number
          observacoes: string | null
          pergunta: string
          resposta: string
          tags: string[] | null
          tipo_faq: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          contexto: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          id_empresa: number
          observacoes?: string | null
          pergunta: string
          resposta: string
          tags?: string[] | null
          tipo_faq: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          contexto?: string
          created_at?: string | null
          created_by?: string | null
          id?: number
          id_empresa?: number
          observacoes?: string | null
          pergunta?: string
          resposta?: string
          tags?: string[] | null
          tipo_faq?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxos: {
        Row: {
          created_at: string
          id: number
          nome_fluxo: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome_fluxo?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome_fluxo?: string | null
        }
        Relationships: []
      }
      fluxos_empresas: {
        Row: {
          created_at: string
          empresa_id: number | null
          fluxo_id: number | null
          id: number
          numero_zapi: string | null
        }
        Insert: {
          created_at?: string
          empresa_id?: number | null
          fluxo_id?: number | null
          id?: number
          numero_zapi?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: number | null
          fluxo_id?: number | null
          id?: number
          numero_zapi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fluxos_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fluxos_empresas_fluxo_id_fkey"
            columns: ["fluxo_id"]
            isOneToOne: false
            referencedRelation: "fluxos"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_tipos: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      funis: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: number
          id_empresa: number
          nome: string
          ordem: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: number
          id_empresa: number
          nome: string
          ordem?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: number
          id_empresa?: number
          nome?: string
          ordem?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funis_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_tipo_fkey"
            columns: ["tipo"]
            isOneToOne: false
            referencedRelation: "funil_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_lead: {
        Row: {
          automatico: boolean | null
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string
          etapa_destino_id: number | null
          etapa_origem_id: number | null
          id: number
          id_empresa: number
          id_lead: number
          metadados: Json | null
          tempo_na_etapa_anterior: string | null
          tipo_evento: string
          usuario_id: string | null
          valor_antigo: number | null
          valor_novo: number | null
        }
        Insert: {
          automatico?: boolean | null
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao: string
          etapa_destino_id?: number | null
          etapa_origem_id?: number | null
          id?: number
          id_empresa: number
          id_lead: number
          metadados?: Json | null
          tempo_na_etapa_anterior?: string | null
          tipo_evento: string
          usuario_id?: string | null
          valor_antigo?: number | null
          valor_novo?: number | null
        }
        Update: {
          automatico?: boolean | null
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string
          etapa_destino_id?: number | null
          etapa_origem_id?: number | null
          id?: number
          id_empresa?: number
          id_lead?: number
          metadados?: Json | null
          tempo_na_etapa_anterior?: string | null
          tipo_evento?: string
          usuario_id?: string | null
          valor_antigo?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_lead_etapa_destino_id_fkey"
            columns: ["etapa_destino_id"]
            isOneToOne: false
            referencedRelation: "etapas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_lead_etapa_origem_id_fkey"
            columns: ["etapa_origem_id"]
            isOneToOne: false
            referencedRelation: "etapas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_lead_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_lead_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      icones_atividades: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          icone: string
          id: number
          id_empresa: number
          nome: string
          ordem: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone: string
          id?: number
          id_empresa: number
          nome: string
          ordem?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          icone?: string
          id?: number
          id_empresa?: number
          nome?: string
          ordem?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icones_atividades_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          ativo: boolean | null
          cor: string
          created_at: string | null
          empresa_id: number
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          empresa_id: number
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          empresa_id?: number
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_etiquetas: {
        Row: {
          aplicada_automaticamente: boolean | null
          aplicada_por: string | null
          created_at: string | null
          id_etiqueta: number
          id_lead: number
        }
        Insert: {
          aplicada_automaticamente?: boolean | null
          aplicada_por?: string | null
          created_at?: string | null
          id_etiqueta: number
          id_lead: number
        }
        Update: {
          aplicada_automaticamente?: boolean | null
          aplicada_por?: string | null
          created_at?: string | null
          id_etiqueta?: number
          id_lead?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_etiquetas_id_etiqueta_fkey"
            columns: ["id_etiqueta"]
            isOneToOne: false
            referencedRelation: "etiquetas_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_etiquetas_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_crm: {
        Row: {
          anotacoes: string | null
          ativo: boolean | null
          campanha: string | null
          campos_extras: Json | null
          cpf_cnpj: string | null
          created_at: string | null
          criado_por: string | null
          data_criacao: string | null
          data_entrada_etapa_atual: string | null
          data_entrada_funil: string | null
          data_ganho: string | null
          data_perdido: string | null
          data_primeira_proposta: string | null
          data_primeira_qualificacao: string | null
          email: string | null
          empresa_cliente: string | null
          id: number
          id_contato_geral: number | null
          id_empresa: number
          id_etapa_atual: number
          id_funil: number
          midia: string | null
          motivo_perda: string | null
          nome: string
          ordem_no_funil: number | null
          origem: string | null
          previsao_fechamento: string | null
          proprietario_id: string | null
          status: string | null
          tipo_contato_sdr: string | null
          updated_at: string | null
          valor_estimado: number | null
          valor_final: number | null
          whatsapp: string | null
        }
        Insert: {
          anotacoes?: string | null
          ativo?: boolean | null
          campanha?: string | null
          campos_extras?: Json | null
          cpf_cnpj?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_criacao?: string | null
          data_entrada_etapa_atual?: string | null
          data_entrada_funil?: string | null
          data_ganho?: string | null
          data_perdido?: string | null
          data_primeira_proposta?: string | null
          data_primeira_qualificacao?: string | null
          email?: string | null
          empresa_cliente?: string | null
          id?: number
          id_contato_geral?: number | null
          id_empresa: number
          id_etapa_atual: number
          id_funil: number
          midia?: string | null
          motivo_perda?: string | null
          nome: string
          ordem_no_funil?: number | null
          origem?: string | null
          previsao_fechamento?: string | null
          proprietario_id?: string | null
          status?: string | null
          tipo_contato_sdr?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
          valor_final?: number | null
          whatsapp?: string | null
        }
        Update: {
          anotacoes?: string | null
          ativo?: boolean | null
          campanha?: string | null
          campos_extras?: Json | null
          cpf_cnpj?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_criacao?: string | null
          data_entrada_etapa_atual?: string | null
          data_entrada_funil?: string | null
          data_ganho?: string | null
          data_perdido?: string | null
          data_primeira_proposta?: string | null
          data_primeira_qualificacao?: string | null
          email?: string | null
          empresa_cliente?: string | null
          id?: number
          id_contato_geral?: number | null
          id_empresa?: number
          id_etapa_atual?: number
          id_funil?: number
          midia?: string | null
          motivo_perda?: string | null
          nome?: string
          ordem_no_funil?: number | null
          origem?: string | null
          previsao_fechamento?: string | null
          proprietario_id?: string | null
          status?: string | null
          tipo_contato_sdr?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
          valor_final?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_crm_id_contato_geral_fkey"
            columns: ["id_contato_geral"]
            isOneToOne: false
            referencedRelation: "contatos_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_crm_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_crm_id_etapa_atual_fkey"
            columns: ["id_etapa_atual"]
            isOneToOne: false
            referencedRelation: "etapas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_crm_id_funil_fkey"
            columns: ["id_funil"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_interesses: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          empresa_id: number | null
          id: string
          label: string
          mensagem_resposta: string
          nome: string
          ordem: number
          palavras_chave: string[]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          empresa_id?: number | null
          id?: string
          label: string
          mensagem_resposta: string
          nome: string
          ordem: number
          palavras_chave: string[]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          empresa_id?: number | null
          id?: string
          label?: string
          mensagem_resposta?: string
          nome?: string
          ordem?: number
          palavras_chave?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_interesses_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      macros: {
        Row: {
          ativo: boolean | null
          criado_por: string | null
          data_criacao: string | null
          id: number
          id_empresa: number | null
          id_time: number | null
          mensagem: string
          slug: string
          tipo: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          criado_por?: string | null
          data_criacao?: string | null
          id?: never
          id_empresa?: number | null
          id_time?: number | null
          mensagem: string
          slug: string
          tipo?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          criado_por?: string | null
          data_criacao?: string | null
          id?: never
          id_empresa?: number | null
          id_time?: number | null
          mensagem?: string
          slug?: string
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "macros_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macros_id_time_fkey"
            columns: ["id_time"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          autor: Database["public"]["Enums"]["autor_mensagem"] | null
          conversa_id: string | null
          created_at: string | null
          document_title: string | null
          empresa_id: number | null
          enviado_para: string | null
          enviado_por: string | null
          enviado_recebido: string | null
          fluxo: string | null
          id: number
          media_duration_ms: number | null
          media_url: string | null
          mensagem: string | null
          message_id_zapi: string | null
          mime_type: string | null
          nome_empresa: string
          read_at: string | null
          tipo_mensagem: Database["public"]["Enums"]["tipo_mensagem"] | null
          whatsapp: string | null
        }
        Insert: {
          autor?: Database["public"]["Enums"]["autor_mensagem"] | null
          conversa_id?: string | null
          created_at?: string | null
          document_title?: string | null
          empresa_id?: number | null
          enviado_para?: string | null
          enviado_por?: string | null
          enviado_recebido?: string | null
          fluxo?: string | null
          id?: number
          media_duration_ms?: number | null
          media_url?: string | null
          mensagem?: string | null
          message_id_zapi?: string | null
          mime_type?: string | null
          nome_empresa?: string
          read_at?: string | null
          tipo_mensagem?: Database["public"]["Enums"]["tipo_mensagem"] | null
          whatsapp?: string | null
        }
        Update: {
          autor?: Database["public"]["Enums"]["autor_mensagem"] | null
          conversa_id?: string | null
          created_at?: string | null
          document_title?: string | null
          empresa_id?: number | null
          enviado_para?: string | null
          enviado_por?: string | null
          enviado_recebido?: string | null
          fluxo?: string | null
          id?: number
          media_duration_ms?: number | null
          media_url?: string | null
          mensagem?: string | null
          message_id_zapi?: string | null
          mime_type?: string | null
          nome_empresa?: string
          read_at?: string | null
          tipo_mensagem?: Database["public"]["Enums"]["tipo_mensagem"] | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_sdr_maquinagelo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_fluxo_fkey"
            columns: ["fluxo"]
            isOneToOne: false
            referencedRelation: "fluxos"
            referencedColumns: ["nome_fluxo"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_cliente_final_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_maquina: {
        Row: {
          capacidade_deposito: number | null
          created_at: string
          id: number
          image_url: string | null
          mensagem_maquina_dimensionada_padrao: string | null
          mensagem_proposta_padrao: string | null
          nome_modelo_maquina: string | null
          preco_aluguel_mensal: number | null
          preco_compra_prazo: number | null
          preco_compra_vista: number | null
          producao_por_dia: number | null
          tipo_maquina: string | null
          updated_at: string | null
        }
        Insert: {
          capacidade_deposito?: number | null
          created_at?: string
          id?: number
          image_url?: string | null
          mensagem_maquina_dimensionada_padrao?: string | null
          mensagem_proposta_padrao?: string | null
          nome_modelo_maquina?: string | null
          preco_aluguel_mensal?: number | null
          preco_compra_prazo?: number | null
          preco_compra_vista?: number | null
          producao_por_dia?: number | null
          tipo_maquina?: string | null
          updated_at?: string | null
        }
        Update: {
          capacidade_deposito?: number | null
          created_at?: string
          id?: number
          image_url?: string | null
          mensagem_maquina_dimensionada_padrao?: string | null
          mensagem_proposta_padrao?: string | null
          nome_modelo_maquina?: string | null
          preco_aluguel_mensal?: number | null
          preco_compra_prazo?: number | null
          preco_compra_vista?: number | null
          producao_por_dia?: number | null
          tipo_maquina?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          custo: number | null
          data_criacao: string | null
          descricao: string | null
          id: number
          id_empresa: number | null
          nome: string
          numero_parcelas: number | null
          preco: number | null
          unidade_medida: string | null
        }
        Insert: {
          ativo?: boolean | null
          custo?: number | null
          data_criacao?: string | null
          descricao?: string | null
          id?: never
          id_empresa?: number | null
          nome: string
          numero_parcelas?: number | null
          preco?: number | null
          unidade_medida?: string | null
        }
        Update: {
          ativo?: boolean | null
          custo?: number | null
          data_criacao?: string | null
          descricao?: string | null
          id?: never
          id_empresa?: number | null
          nome?: string
          numero_parcelas?: number | null
          preco?: number | null
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_buffer_mensagem: {
        Row: {
          created_at: string
          id_empresa: number | null
          id_empresa_purificador: number | null
          mensagem: string
          whatsapp: string | null
          whatsapp_id: string | null
        }
        Insert: {
          created_at?: string
          id_empresa?: number | null
          id_empresa_purificador?: number | null
          mensagem: string
          whatsapp?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          created_at?: string
          id_empresa?: number | null
          id_empresa_purificador?: number | null
          mensagem?: string
          whatsapp?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_buffer_mensagem_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_sdr_maquinagelo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_buffer_mensagem_id_empresa_purificador_fkey"
            columns: ["id_empresa_purificador"]
            isOneToOne: false
            referencedRelation: "empresas_sdr_purificador"
            referencedColumns: ["id"]
          },
        ]
      }
      telefone_time: {
        Row: {
          created_at: string
          id: number
          id_telefone: number | null
          id_time: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_telefone?: number | null
          id_time?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          id_telefone?: number | null
          id_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telefone_time_id_telefone_fkey"
            columns: ["id_telefone"]
            isOneToOne: false
            referencedRelation: "telefones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telefone_time_id_time_fkey"
            columns: ["id_time"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      telefones: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: number
          id_empresa: number | null
          id_fluxo: number | null
          numero: string | null
          token: string | null
          url_integracao: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: number
          id_empresa?: number | null
          id_fluxo?: number | null
          numero?: string | null
          token?: string | null
          url_integracao?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: number
          id_empresa?: number | null
          id_fluxo?: number | null
          numero?: string | null
          token?: string | null
          url_integracao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telefones_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telefones_id_fluxo_fkey"
            columns: ["id_fluxo"]
            isOneToOne: false
            referencedRelation: "fluxos"
            referencedColumns: ["id"]
          },
        ]
      }
      times: {
        Row: {
          created_at: string
          id: number
          nome_time: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome_time?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome_time?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      user_empresa: {
        Row: {
          convite_id: string | null
          created_at: string | null
          empresa_id: number
          role: string | null
          user_id: string
        }
        Insert: {
          convite_id?: string | null
          created_at?: string | null
          empresa_id: number
          role?: string | null
          user_id: string
        }
        Update: {
          convite_id?: string | null
          created_at?: string | null
          empresa_id?: number
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresa_convite_id_fkey"
            columns: ["convite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      user_empresa_geral: {
        Row: {
          created_at: string | null
          empresa_id: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresa_geral_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      usuario_time: {
        Row: {
          created_at: string
          id: number
          id_empresa: number | null
          id_time: number | null
          id_usuario: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_empresa?: number | null
          id_time?: number | null
          id_usuario?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          id_empresa?: number | null
          id_time?: number | null
          id_usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_time_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_time_id_time_fkey"
            columns: ["id_time"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_time_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["uuid"]
          },
        ]
      }
      usuarios: {
        Row: {
          cargo: string | null
          data_criacao: string
          email: string
          id_empresa: number | null
          nivel_acesso: string | null
          nome: string | null
          status: Database["public"]["Enums"]["status_usuario"] | null
          ultima_roleta: string | null
          uuid: string
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          data_criacao?: string
          email: string
          id_empresa?: number | null
          nivel_acesso?: string | null
          nome?: string | null
          status?: Database["public"]["Enums"]["status_usuario"] | null
          ultima_roleta?: string | null
          uuid?: string
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          data_criacao?: string
          email?: string
          id_empresa?: number | null
          nivel_acesso?: string | null
          nome?: string | null
          status?: Database["public"]["Enums"]["status_usuario"] | null
          ultima_roleta?: string | null
          uuid?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      atividades_sao_paulo: {
        Row: {
          assunto: string | null
          atribuida_a: string | null
          concluida: boolean | null
          concluida_em: string | null
          concluida_por: string | null
          created_at: string | null
          created_by: string | null
          data_formatada: string | null
          data_legivel: string | null
          data_vencimento: string | null
          data_vencimento_sp: string | null
          descricao: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: number | null
          id_empresa: number | null
          id_lead: number | null
          prioridade: string | null
          tipo: string | null
          updated_at: string | null
          visivel_convidados: boolean | null
        }
        Insert: {
          assunto?: string | null
          atribuida_a?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_formatada?: never
          data_legivel?: never
          data_vencimento?: string | null
          data_vencimento_sp?: never
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: number | null
          id_empresa?: number | null
          id_lead?: number | null
          prioridade?: string | null
          tipo?: string | null
          updated_at?: string | null
          visivel_convidados?: boolean | null
        }
        Update: {
          assunto?: string | null
          atribuida_a?: string | null
          concluida?: boolean | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          created_by?: string | null
          data_formatada?: never
          data_legivel?: never
          data_vencimento?: string | null
          data_vencimento_sp?: never
          descricao?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: number | null
          id_empresa?: number | null
          id_lead?: number | null
          prioridade?: string | null
          tipo?: string | null
          updated_at?: string | null
          visivel_convidados?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas_geral"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      buscar_faq_similar: {
        Args: {
          p_empresa_id: number
          p_limit?: number
          p_query_embedding: string
          p_similarity_threshold?: number
          p_tipos_faq?: string[]
        }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      criar_lead_triagem: {
        Args: { p_id_empresa?: number; p_nome?: string; p_whatsapp: string }
        Returns: number
      }
      get_etiquetas_by_empresa: {
        Args: { empresa_id: number }
        Returns: {
          color: string
          created_at: string
          id: number
          id_empresa: number
          nome_etiqueta: string
        }[]
      }
      get_user_empresa_id: { Args: { user_uuid: string }; Returns: number }
      get_usuarios_empresa: {
        Args: { empresa_id_param: number }
        Returns: {
          banned_until: string
          email: string
          id: string
          last_sign_in_at: string
          nome: string
          raw_user_meta_data: Json
          role: string
        }[]
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_documents_by_empresa:
        | {
            Args: { filter: Json; match_count: number; query_embedding: string }
            Returns: {
              content: string
              id: number
              metadata: Json
              similarity: number
            }[]
          }
        | {
            Args: {
              match_count: number
              p_id_empresa: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: number
              metadata: Json
              similarity: number
            }[]
          }
      match_documents_pos_qualificacao: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_documents_purificador: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_documents_qualificacao: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      remove_user_from_empresa: {
        Args: { p_empresa_id: number; p_user_id: string }
        Returns: boolean
      }
      timestamp_sao_paulo: { Args: { ts: string }; Returns: string }
      update_user_role: {
        Args: { p_empresa_id: number; p_new_role: string; p_user_id: string }
        Returns: boolean
      }
      usar_convite: {
        Args: { p_convite_id: string; p_user_id: string }
        Returns: boolean
      }
      validar_convite: {
        Args: { p_token: string }
        Returns: {
          convite_id: string
          email_destino: string
          empresa_id: number
          erro: string
          valido: boolean
        }[]
      }
      vetorizar_faq_texto: {
        Args: { p_empresa_id: number; p_texto_faq: string; p_tipo: string }
        Returns: Json
      }
    }
    Enums: {
      autor_mensagem: "cliente" | "humano" | "chatbot" | "AI" | "bot_disparo"
      etapa_macro:
        | "DISPARO ENVIADO"
        | "CHATBOT"
        | "ATENDIMENTO HUMANO"
        | "PERGUNTOU PREÇO"
        | "AGENDAMENTO"
        | "AGENDADA"
        | "FINALIZADO"
        | "FOLLOW-UP"
      funcoes_usuarios:
        | "vendedor_refil"
        | "vendedor_purificador"
        | "vendedor_maquina_gelo"
        | "assistencia_tecnica"
        | "admin"
        | "numero_automacao"
      status_conversa: "aberta" | "pendente" | "finalizada"
      status_usuario: "online" | "offline"
      tipo_contato: "lead" | "cliente" | "fornecedor" | "interno"
      tipo_mensagem:
        | "text"
        | "button_question"
        | "button_reply"
        | "audio"
        | "image"
        | "document"
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
      autor_mensagem: ["cliente", "humano", "chatbot", "AI", "bot_disparo"],
      etapa_macro: [
        "DISPARO ENVIADO",
        "CHATBOT",
        "ATENDIMENTO HUMANO",
        "PERGUNTOU PREÇO",
        "AGENDAMENTO",
        "AGENDADA",
        "FINALIZADO",
        "FOLLOW-UP",
      ],
      funcoes_usuarios: [
        "vendedor_refil",
        "vendedor_purificador",
        "vendedor_maquina_gelo",
        "assistencia_tecnica",
        "admin",
        "numero_automacao",
      ],
      status_conversa: ["aberta", "pendente", "finalizada"],
      status_usuario: ["online", "offline"],
      tipo_contato: ["lead", "cliente", "fornecedor", "interno"],
      tipo_mensagem: [
        "text",
        "button_question",
        "button_reply",
        "audio",
        "image",
        "document",
      ],
    },
  },
} as const
