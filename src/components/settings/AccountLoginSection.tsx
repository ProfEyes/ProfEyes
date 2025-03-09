import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ChevronRight, LogOut, Shield, Mail, Github, Laptop } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface AccountLoginSectionProps {
  onGoogleLogin?: () => Promise<void>;
  onMicrosoftLogin?: () => Promise<void>;
  onGithubLogin?: () => Promise<void>;
  onEmailLogin?: () => Promise<void>;
}

export function AccountLoginSection({
  onGoogleLogin,
  onMicrosoftLogin,
  onGithubLogin,
  onEmailLogin
}: AccountLoginSectionProps) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setLoading("logout");
      console.log("Iniciando logout");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast.success("Desconectado com sucesso");
      window.location.reload(); // Recarrega a página para atualizar o estado
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      toast.error("Falha ao desconectar. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  const handleLogin = async (provider: string) => {
    try {
      setLoading(provider);
      console.log(`Iniciando login com ${provider}`);
      
      let { data, error } = { data: null, error: null };
      
      // Escolhe o provedor de autenticação com base no parâmetro
      switch (provider) {
        case "google":
          ({ data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          }));
          break;
          
        case "microsoft":
          ({ data, error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          }));
          break;
          
        case "github":
          ({ data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          }));
          break;
          
        case "email":
          // Redireciona para a página de registro por email
          window.location.href = '/auth/register';
          return;
          
        default:
          throw new Error(`Provedor de login não suportado: ${provider}`);
      }
      
      if (error) {
        throw error;
      }
      
      console.log("Login iniciado:", data);
      
    } catch (error) {
      console.error(`Erro ao conectar com ${provider}:`, error);
      toast.error(`Falha ao conectar com ${provider}. Tente novamente.`);
    } finally {
      setLoading(null);
    }
  };

  const loginMethods = [
    {
      id: "google",
      text: "Conectar com Google",
      icon: <Mail className="h-4 w-4 text-white/60" />,
      onClick: () => handleLogin("google")
    },
    {
      id: "microsoft",
      text: "Conectar com Microsoft",
      icon: <Laptop className="h-4 w-4 text-white/60" />,
      onClick: () => handleLogin("microsoft")
    },
    {
      id: "github",
      text: "Conectar com GitHub",
      icon: <Github className="h-4 w-4 text-white/60" />,
      onClick: () => handleLogin("github")
    },
    {
      id: "email",
      text: "Criar conta com email",
      icon: <Mail className="h-4 w-4 text-white/60" />,
      onClick: () => handleLogin("email")
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Status da conta */}
      <div className="relative bg-black/20 backdrop-blur-sm rounded-lg border-[0.5px] border-white/[0.03] overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black/30 border-[0.5px] border-white/[0.03]">
              <Shield className="h-3.5 w-3.5 text-white/50" />
            </div>
            
            <div>
              <h3 className="text-[13px] font-light text-white/70 tracking-wide">Status da Conta</h3>
              <p className="text-[11px] text-white/40 mt-0.5 tracking-wide">
                {user ? `Conectado como ${user.email}` : "Não conectado"}
              </p>
            </div>
          </div>
          
          <Badge 
            variant={user ? "success" : "destructive"} 
            className={cn(
              "rounded-full text-[10px] uppercase tracking-wider py-0 px-2 font-light",
              user ? "bg-emerald-500/10 text-emerald-300/70" : "bg-red-500/10 text-red-300/70"
            )}
          >
            {user ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>

      {/* Opções de login */}
      {!user && (
        <div className="space-y-4">
          <p className="text-[10px] uppercase text-white/30 tracking-wider font-light ml-1">
            Métodos de Acesso
          </p>

          <div className="space-y-2">
            {loginMethods.map((method) => (
              <Button 
                key={method.id}
                onClick={method.onClick}
                disabled={loading === method.id}
                className="w-full relative group flex items-center justify-between bg-black/20 hover:bg-black/30 border-[0.5px] border-white/[0.03] rounded-lg p-3 h-auto text-white/60 hover:text-white/80 transition-all duration-300"
              >
                <div className="flex items-center">
                  {method.icon}
                  <span className="ml-3 text-xs tracking-wide">
                    {loading === method.id ? (
                      <div className="flex items-center">
                        <div className="h-3 w-3 mr-2 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                        Conectando...
                      </div>
                    ) : (
                      method.text
                    )}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/30 transition-colors duration-300" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer e informações */}
      <div className="text-[10px] leading-relaxed text-white/30 bg-black/20 p-3.5 rounded-lg border-[0.5px] border-white/[0.02]">
        Ao se conectar, você concorda com nossos <a href="#" className="text-white/40 hover:text-white/60 transition-colors">Termos de Serviço</a> e <a href="#" className="text-white/40 hover:text-white/60 transition-colors">Política de Privacidade</a>. Seus dados são protegidos e nunca compartilhados com terceiros sem sua permissão.
      </div>

      {/* Botão de logout */}
      {user && (
        <div className="flex justify-end">
          <Button 
            onClick={handleLogout}
            disabled={loading === "logout"}
            className="relative text-xs text-white/50 hover:text-white/70 tracking-wide flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-black/20 hover:bg-black/30 transition-all duration-300 group border-[0.5px] border-white/[0.03]"
          >
            {loading === "logout" ? (
              <>
                <div className="h-3 w-3 mr-1.5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                Desconectando...
              </>
            ) : (
              <>
                <LogOut className="h-3 w-3 opacity-40 group-hover:opacity-60 transition-opacity" />
                Desconectar
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
} 