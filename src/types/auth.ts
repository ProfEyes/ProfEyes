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
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
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

// Tipos genéricos para tabelas não definidas no schema atual
// Nota: As tabelas abaixo podem não existir no schema do Supabase
// Se necessário, adicione-as ao arquivo database.types.ts

export interface NotificationSettings {
  user_id: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
}
export type NotificationSettingsInsert = Partial<NotificationSettings>;
export type NotificationSettingsUpdate = Partial<NotificationSettings>;

export interface TradingPreferences {
  user_id: string;
  preferred_broker?: string;
  preferred_trader_link?: string;
  created_at?: string;
  updated_at?: string;
}
export type TradingPreferencesInsert = Partial<TradingPreferences>;
export type TradingPreferencesUpdate = Partial<TradingPreferences>;

export interface UserManagementLog {
  id: string;
  user_id: string;
  action: string;
  performed_by?: string;
  created_at?: string;
}
export type UserManagementLogInsert = Partial<UserManagementLog>;
export type UserManagementLogUpdate = Partial<UserManagementLog>;

export interface AuthToken {
  id: string;
  user_id: string;
  token: string;
  expires_at?: string;
  created_at?: string;
}
export type AuthTokenInsert = Partial<AuthToken>;
export type AuthTokenUpdate = Partial<AuthToken>;

export interface UserSession {
  id: string;
  user_id: string;
  device_id?: string;
  ip_address?: string;
  created_at?: string;
  expires_at?: string;
}
export type UserSessionInsert = Partial<UserSession>;
export type UserSessionUpdate = Partial<UserSession>;

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
  signUp: (email: string, password: string, birthdate?: string, displayName?: string, investorType?: string) => Promise<{
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