import { Database } from './supabase';

// Tipos Supabase Auth

export type Provider = 'google' | 'facebook' | 'github' | 'azure' | 'bitbucket' | 'discord' | 'twitter' | 'apple' | 'slack';

export interface User {
  id: string;
  email?: string;
  email_verified?: boolean;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in: number;
  token_type: string;
  user: User;
}

// Tabela user_profiles
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

// Tabela notification_settings
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];
export type NotificationSettingsInsert = Database['public']['Tables']['notification_settings']['Insert'];
export type NotificationSettingsUpdate = Database['public']['Tables']['notification_settings']['Update'];

// Tabela trading_preferences
export type TradingPreferences = Database['public']['Tables']['trading_preferences']['Row'];
export type TradingPreferencesInsert = Database['public']['Tables']['trading_preferences']['Insert'];
export type TradingPreferencesUpdate = Database['public']['Tables']['trading_preferences']['Update'];

// Tabela user_management_logs
export type UserManagementLog = Database['public']['Tables']['user_management_logs']['Row'];
export type UserManagementLogInsert = Database['public']['Tables']['user_management_logs']['Insert'];
export type UserManagementLogUpdate = Database['public']['Tables']['user_management_logs']['Update'];

// Tabela auth_tokens
export type AuthToken = Database['public']['Tables']['auth_tokens']['Row'];
export type AuthTokenInsert = Database['public']['Tables']['auth_tokens']['Insert'];
export type AuthTokenUpdate = Database['public']['Tables']['auth_tokens']['Update'];

// Tabela user_sessions
export type UserSession = Database['public']['Tables']['user_sessions']['Row'];
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert'];
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update'];

// Estado de autenticação
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  isAdmin: boolean;
}

// Funções do contexto de autenticação
export interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string, remember?: boolean) => Promise<{
    error: Error | null;
  }>;
  signUp: (email: string, password: string, birthdate?: string) => Promise<{
    error: Error | null;
  }>;
  signOut: () => Promise<void>;
  verifyEmail: (email: string) => Promise<{
    error: Error | null;
  }>;
  resetPassword: (email: string) => Promise<{
    error: Error | null;
  }>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<{
    error: Error | null;
  }>;
  isStrongPassword: (password: string) => { isStrong: boolean; message: string };
  refreshUserProfile: () => Promise<void>;
  signInWithProvider: (provider: Provider) => Promise<{
    error: Error | null;
  }>;
} 