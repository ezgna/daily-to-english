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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cards: {
        Row: {
          audio_end_sec: number | null
          audio_start_sec: number | null
          created_at: string
          due_at: string | null
          en: string | null
          generation_id: string
          id: string
          ja: string
          last_reviewed_at: string | null
          position: number
          review_count: number
          srs_status: string
          success_streak: number
          updated_at: string
          user_id: string
          word_end: number | null
          word_start: number | null
        }
        Insert: {
          audio_end_sec?: number | null
          audio_start_sec?: number | null
          created_at?: string
          due_at?: string | null
          en?: string | null
          generation_id: string
          id?: string
          ja: string
          last_reviewed_at?: string | null
          position: number
          review_count?: number
          srs_status?: string
          success_streak?: number
          updated_at?: string
          user_id: string
          word_end?: number | null
          word_start?: number | null
        }
        Update: {
          audio_end_sec?: number | null
          audio_start_sec?: number | null
          created_at?: string
          due_at?: string | null
          en?: string | null
          generation_id?: string
          id?: string
          ja?: string
          last_reviewed_at?: string | null
          position?: number
          review_count?: number
          srs_status?: string
          success_streak?: number
          updated_at?: string
          user_id?: string
          word_end?: number | null
          word_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_user_id_generation_id_fkey"
            columns: ["user_id", "generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      entries: {
        Row: {
          clean_text: string
          content_hash: string
          created_at: string
          id: string
          is_edited: boolean
          raw_text: string
          source: string
          summary: Json
          transcript: Json
          updated_at: string
          user_id: string
          waveform: Json
        }
        Insert: {
          clean_text: string
          content_hash: string
          created_at?: string
          id?: string
          is_edited?: boolean
          raw_text: string
          source: string
          summary?: Json
          transcript?: Json
          updated_at?: string
          user_id: string
          waveform?: Json
        }
        Update: {
          clean_text?: string
          content_hash?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          raw_text?: string
          source?: string
          summary?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
          waveform?: Json
        }
        Relationships: []
      }
      generations: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          entry_id: string
          error: Json | null
          id: string
          idempotency_key: string
          model_info: Json
          split_policy: string
          status: string
          translation_style: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          entry_id: string
          error?: Json | null
          id?: string
          idempotency_key: string
          model_info?: Json
          split_policy: string
          status?: string
          translation_style?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          entry_id?: string
          error?: Json | null
          id?: string
          idempotency_key?: string
          model_info?: Json
          split_policy?: string
          status?: string
          translation_style?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_user_id_entry_id_fkey"
            columns: ["user_id", "entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_events: {
        Row: {
          card_id: string
          id: number
          rating: string
          reviewed_at: string
          undone_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          id?: never
          rating: string
          reviewed_at?: string
          undone_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          id?: never
          rating?: string
          reviewed_at?: string
          undone_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_events_user_id_card_id_fkey"
            columns: ["user_id", "card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      usage_events: {
        Row: {
          audio_seconds: number | null
          created_at: string
          id: number
          input_tokens: number | null
          kind: string
          model: string
          output_tokens: number | null
          user_id: string
        }
        Insert: {
          audio_seconds?: number | null
          created_at?: string
          id?: never
          input_tokens?: number | null
          kind: string
          model: string
          output_tokens?: number | null
          user_id: string
        }
        Update: {
          audio_seconds?: number | null
          created_at?: string
          id?: never
          input_tokens?: number | null
          kind?: string
          model?: string
          output_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_usage: {
        Row: {
          audio_seconds: number | null
          call_count: number | null
          input_tokens: number | null
          kind: string | null
          output_tokens: number | null
          usage_day: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
