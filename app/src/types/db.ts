export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          colour_slot: number
          created_at: string | null
          currency: string
          external_account_number: string | null
          id: string
          institution: string
          name: string
          opening_balance: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          colour_slot?: number
          created_at?: string | null
          currency?: string
          external_account_number?: string | null
          id?: string
          institution: string
          name: string
          opening_balance?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          colour_slot?: number
          created_at?: string | null
          currency?: string
          external_account_number?: string | null
          id?: string
          institution?: string
          name?: string
          opening_balance?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_snapshots: {
        Row: {
          account_id: string
          balance: number
          created_at: string | null
          date: string
          id: string
          source: Database["public"]["Enums"]["snapshot_source"]
          statement_id: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          balance: number
          created_at?: string | null
          date: string
          id?: string
          source: Database["public"]["Enums"]["snapshot_source"]
          statement_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          balance?: number
          created_at?: string | null
          date?: string
          id?: string
          source?: Database["public"]["Enums"]["snapshot_source"]
          statement_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_snapshots_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      statements: {
        Row: {
          account_id: string
          closing_balance: number | null
          created_at: string | null
          id: string
          imported_at: string | null
          opening_balance: number | null
          parser_strategy: Database["public"]["Enums"]["parser_strategy"]
          parser_version: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["statement_status"]
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          closing_balance?: number | null
          created_at?: string | null
          id?: string
          imported_at?: string | null
          opening_balance?: number | null
          parser_strategy: Database["public"]["Enums"]["parser_strategy"]
          parser_version?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["statement_status"]
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          closing_balance?: number | null
          created_at?: string | null
          id?: string
          imported_at?: string | null
          opening_balance?: number | null
          parser_strategy?: Database["public"]["Enums"]["parser_strategy"]
          parser_version?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["statement_status"]
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          created_at: string | null
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          emoji: string
          id: string
          local_id: string | null
          search_vector: unknown
          status: Database["public"]["Enums"]["task_status"] | null
          sync_status: Database["public"]["Enums"]["sync_status"] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string
          id?: string
          local_id?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["task_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string
          id?: string
          local_id?: string | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["task_status"] | null
          sync_status?: Database["public"]["Enums"]["sync_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          date: string
          description: string
          external_id: string | null
          id: string
          notes: string | null
          statement_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          date: string
          description: string
          external_id?: string | null
          id?: string
          notes?: string | null
          statement_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          date?: string
          description?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          statement_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          home_currency: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          home_currency?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          home_currency?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          image_url: string | null
          name: string
          preferences: Json | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          image_url?: string | null
          name: string
          preferences?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          image_url?: string | null
          name?: string
          preferences?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_task: { Args: { task_id: string }; Returns: undefined }
      complete_task: { Args: { task_id: string }; Returns: undefined }
    }
    Enums: {
      account_type: "DEPOSIT" | "INVESTMENT"
      parser_strategy:
        | "TEXT_FORMAT_SPECIFIC"
        | "TEXT_GENERIC"
        | "OCR_GENERIC"
        | "MANUAL"
      snapshot_source: "STATEMENT" | "MANUAL"
      statement_status: "IMPORTED" | "NEEDS_REVIEW" | "FAILED"
      sync_status: "local" | "synced" | "pending"
      task_status: "active" | "completed" | "archived"
      transaction_type: "DEBIT" | "CREDIT"
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
    Enums: {
      account_type: ["DEPOSIT", "INVESTMENT"],
      parser_strategy: [
        "TEXT_FORMAT_SPECIFIC",
        "TEXT_GENERIC",
        "OCR_GENERIC",
        "MANUAL",
      ],
      snapshot_source: ["STATEMENT", "MANUAL"],
      statement_status: ["IMPORTED", "NEEDS_REVIEW", "FAILED"],
      sync_status: ["local", "synced", "pending"],
      task_status: ["active", "completed", "archived"],
      transaction_type: ["DEBIT", "CREDIT"],
    },
  },
} as const

