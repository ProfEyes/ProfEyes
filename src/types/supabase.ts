export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_id: number
          can_manage_content: boolean | null
          can_manage_payments: boolean | null
          can_manage_users: boolean | null
          created_at: string | null
          dashboard_layout: Json | null
          id: number
          last_updated: string | null
          monitor_active_users: boolean | null
          show_sensitive_data: boolean | null
          updated_at: string | null
        }
        Insert: {
          admin_id: number
          can_manage_content?: boolean | null
          can_manage_payments?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string | null
          dashboard_layout?: Json | null
          id?: number
          last_updated?: string | null
          monitor_active_users?: boolean | null
          show_sensitive_data?: boolean | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: number
          can_manage_content?: boolean | null
          can_manage_payments?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string | null
          dashboard_layout?: Json | null
          id?: number
          last_updated?: string | null
          monitor_active_users?: boolean | null
          show_sensitive_data?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
        ]
      }
      administrators: {
        Row: {
          created_at: string
          email: string
          id: number
          is_super_admin: boolean
          last_login_at: string | null
          name: string | null
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          is_super_admin?: boolean
          last_login_at?: string | null
          name?: string | null
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          is_super_admin?: boolean
          last_login_at?: string | null
          name?: string | null
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          live_stream_notifications: boolean | null
          news_alerts: boolean | null
          push_notifications: boolean | null
          sound_enabled: boolean | null
          trading_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          live_stream_notifications?: boolean | null
          news_alerts?: boolean | null
          push_notifications?: boolean | null
          sound_enabled?: boolean | null
          trading_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          live_stream_notifications?: boolean | null
          news_alerts?: boolean | null
          push_notifications?: boolean | null
          sound_enabled?: boolean | null
          trading_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: number
          token: string
          user_id: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: number
          token: string
          user_id: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: number
          token?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          attempt_at: string
          created_at: string
          currency: string
          id: number
          method: string | null
          payment_date: string
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: number | null
          transaction_code: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          attempt_at?: string
          created_at?: string
          currency?: string
          id?: number
          method?: string | null
          payment_date: string
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id?: number | null
          transaction_code?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attempt_at?: string
          created_at?: string
          currency?: string
          id?: number
          method?: string | null
          payment_date?: string
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: number | null
          transaction_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          created_at: string
          favorite_asset: string | null
          id: number
          notify_email: boolean
          notify_push: boolean
          timezone: string
          updated_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          favorite_asset?: string | null
          id?: number
          notify_email?: boolean
          notify_push?: boolean
          timezone?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          favorite_asset?: string | null
          id?: number
          notify_email?: boolean
          notify_push?: boolean
          timezone?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          device: string | null
          ended_at: string | null
          id: number
          ip_address: string | null
          location: string | null
          started_at: string
          updated_at: string
          user_id: number
        }
        Insert: {
          device?: string | null
          ended_at?: string | null
          id?: number
          ip_address?: string | null
          location?: string | null
          started_at?: string
          updated_at?: string
          user_id: number
        }
        Update: {
          device?: string | null
          ended_at?: string | null
          id?: number
          ip_address?: string | null
          location?: string | null
          started_at?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          id: number
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_days: number
          id?: number
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          id?: number
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string
          id: number
          latest_payment_id: number | null
          plan_id: number
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: number
          latest_payment_id?: number | null
          plan_id: number
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: number
          latest_payment_id?: number | null
          plan_id?: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_latest_payment_id_fkey"
            columns: ["latest_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          language: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          verified_email: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          language?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          verified_email?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          language?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          verified_email?: boolean | null
        }
        Relationships: []
      }
      users: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string
          email_verification_token: string | null
          email_verified: boolean
          id: number
          is_admin: boolean | null
          language: string
          last_login_at: string | null
          last_login_ip: string | null
          name: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email: string
          email_verification_token?: string | null
          email_verified?: boolean
          id?: number
          is_admin?: boolean | null
          language?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          name: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          email_verification_token?: string | null
          email_verified?: boolean
          id?: number
          is_admin?: boolean | null
          language?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          name?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      all_users: {
        Row: {
          created_at: string | null
          email: string | null
          id: number | null
          is_admin: boolean | null
          name: string | null
          updated_at: string | null
          user_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_admin_status: {
        Args: { email: string }
        Returns: Json
      }
      exec_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_administrator: {
        Args: { check_email: string }
        Returns: boolean
      }
      sync_admin_after_login: {
        Args: { admin_email: string }
        Returns: Json
      }
      verify_connection: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      account_status: "created" | "active" | "inactive" | "suspended"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      subscription_status:
        | "inactive"
        | "trialing"
        | "active"
        | "expired"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["created", "active", "inactive", "suspended"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      subscription_status: [
        "inactive",
        "trialing",
        "active",
        "expired",
        "cancelled",
      ],
    },
  },
} as const 