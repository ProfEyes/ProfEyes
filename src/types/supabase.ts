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