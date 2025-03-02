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
      crypto_prices: {
        Row: {
          id: number
          symbol: string
          timestamp: string
          open: number
          high: number
          low: number
          close: number
          volume: number
          price_change: number
          price_change_percent: number
        }
        Insert: {
          id?: number
          symbol: string
          timestamp: string
          open: number
          high: number
          low: number
          close: number
          volume: number
          price_change: number
          price_change_percent: number
        }
        Update: {
          id?: number
          symbol?: string
          timestamp?: string
          open?: number
          high?: number
          low?: number
          close?: number
          volume?: number
          price_change?: number
          price_change_percent?: number
        }
      }
      trading_signals: {
        Row: {
          id: number
          pair: string
          type: 'COMPRA' | 'VENDA'
          entry: string
          target: string
          stopLoss: string
          timestamp: string
          status: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO'
          successRate: number
          timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO'
          score: number
        }
        Insert: {
          id?: number
          pair: string
          type: 'COMPRA' | 'VENDA'
          entry: string
          target: string
          stopLoss: string
          timestamp: string
          status: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO'
          successRate: number
          timeframe: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO'
          score: number
        }
        Update: {
          id?: number
          pair?: string
          type?: 'COMPRA' | 'VENDA'
          entry?: string
          target?: string
          stopLoss?: string
          timestamp?: string
          status?: 'ATIVO' | 'CONCLUÍDO' | 'CANCELADO'
          successRate?: number
          timeframe?: 'DAYTRADING' | 'CURTO' | 'MÉDIO' | 'LONGO'
          score?: number
        }
      }
      portfolios: {
        Row: {
          id: number
          name: string
          risk_level: 'BAIXO' | 'MÉDIO' | 'ALTO'
          initial_amount: number
          current_value: number
          expected_return: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          risk_level: 'BAIXO' | 'MÉDIO' | 'ALTO'
          initial_amount: number
          current_value: number
          expected_return: number
          created_at: string
          updated_at: string
        }
        Update: {
          id?: number
          name?: string
          risk_level?: 'BAIXO' | 'MÉDIO' | 'ALTO'
          initial_amount?: number
          current_value?: number
          expected_return?: number
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_assets: {
        Row: {
          id: number
          portfolio_id: number
          symbol: string
          name: string
          type: 'AÇÃO' | 'CRIPTO'
          price: number
          quantity: number
          value: number
          allocation: number
          change: number
          change_percent: number
        }
        Insert: {
          id?: number
          portfolio_id: number
          symbol: string
          name: string
          type: 'AÇÃO' | 'CRIPTO'
          price: number
          quantity: number
          value: number
          allocation: number
          change: number
          change_percent: number
        }
        Update: {
          id?: number
          portfolio_id?: number
          symbol?: string
          name?: string
          type?: 'AÇÃO' | 'CRIPTO'
          price?: number
          quantity?: number
          value?: number
          allocation?: number
          change?: number
          change_percent?: number
        }
      }
    }
    Views: {
      [_ in never]: never
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
