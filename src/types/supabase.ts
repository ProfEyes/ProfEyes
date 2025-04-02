export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          language: string | null;
          timezone: string | null;
          risk_level: 'conservador' | 'moderado' | 'agressivo' | null;
          default_currency: string | null;
          phone_number: string | null;
          address: Json | null;
          birthdate: string | null;
          verified_email: boolean;
          verified_phone: boolean;
          is_admin: boolean;
          status: 'active' | 'inactive' | 'suspended' | 'deleted';
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          language?: string | null;
          timezone?: string | null;
          risk_level?: 'conservador' | 'moderado' | 'agressivo' | null;
          default_currency?: string | null;
          phone_number?: string | null;
          address?: Json | null;
          birthdate?: string | null;
          verified_email?: boolean;
          verified_phone?: boolean;
          is_admin?: boolean;
          status?: 'active' | 'inactive' | 'suspended' | 'deleted';
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          language?: string | null;
          timezone?: string | null;
          risk_level?: 'conservador' | 'moderado' | 'agressivo' | null;
          default_currency?: string | null;
          phone_number?: string | null;
          address?: Json | null;
          birthdate?: string | null;
          verified_email?: boolean;
          verified_phone?: boolean;
          is_admin?: boolean;
          status?: 'active' | 'inactive' | 'suspended' | 'deleted';
        };
      };
      trading_preferences: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          default_order_size: number | null;
          default_stop_loss: number | null;
          default_take_profit: number | null;
          enable_advanced_charts: boolean;
          auto_backup: boolean;
          data_export: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          default_order_size?: number | null;
          default_stop_loss?: number | null;
          default_take_profit?: number | null;
          enable_advanced_charts?: boolean;
          auto_backup?: boolean;
          data_export?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          default_order_size?: number | null;
          default_stop_loss?: number | null;
          default_take_profit?: number | null;
          enable_advanced_charts?: boolean;
          auto_backup?: boolean;
          data_export?: boolean;
        };
      };
      notification_settings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          trading_signals: boolean;
          important_news: boolean;
          price_alerts: boolean;
          volume: number;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          browser_enabled: boolean;
          email_enabled: boolean;
          mobile_enabled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          trading_signals?: boolean;
          important_news?: boolean;
          price_alerts?: boolean;
          volume?: number;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          browser_enabled?: boolean;
          email_enabled?: boolean;
          mobile_enabled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          trading_signals?: boolean;
          important_news?: boolean;
          price_alerts?: boolean;
          volume?: number;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          browser_enabled?: boolean;
          email_enabled?: boolean;
          mobile_enabled?: boolean;
        };
      };
      user_management_logs: {
        Row: {
          id: string;
          created_at: string;
          admin_id: string | null;
          action: 'create' | 'update' | 'delete' | 'reset_password' | 'login' | 'logout' | 'verify_email';
          target_user_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          admin_id?: string | null;
          action: 'create' | 'update' | 'delete' | 'reset_password' | 'login' | 'logout' | 'verify_email';
          target_user_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          admin_id?: string | null;
          action?: 'create' | 'update' | 'delete' | 'reset_password' | 'login' | 'logout' | 'verify_email';
          target_user_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      auth_tokens: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          expires_at: string;
          token: string;
          type: 'email_verification' | 'password_reset' | 'invite';
          used: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          expires_at: string;
          token: string;
          type: 'email_verification' | 'password_reset' | 'invite';
          used?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          expires_at?: string;
          token?: string;
          type?: 'email_verification' | 'password_reset' | 'invite';
          used?: boolean;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          last_active: string;
          expires_at: string | null;
          ip_address: string | null;
          user_agent: string | null;
          device_info: Json | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          last_active?: string;
          expires_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: Json | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          last_active?: string;
          expires_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: Json | null;
          is_active?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 