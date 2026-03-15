import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { syncUserEmail } from '@/lib/db-helpers';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando confirmação...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const type = url.searchParams.get('type');
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        console.log('AuthCallback - Parâmetros recebidos:', {
          type,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          error,
          errorDescription
        });

        // Verificar se há erro na URL
        if (error) {
          console.error('Erro no callback:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Erro ao processar confirmação');
          
          toast.error('Erro na confirmação', {
            description: errorDescription || 'Houve um problema ao confirmar seu email.'
          });
          
          // Redirecionar para auth após 3 segundos
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
          return;
        }

        // Processar diferentes tipos de callback
        if (type === 'signup' && accessToken && refreshToken) {
          // Callback de confirmação de email
          console.log('Processando confirmação de email...');
          
          // Obter a sessão atual
          const { data: sessionData, error: sessionError } = await (supabase as SupabaseClient<Database>).auth.getSession();
          
          if (sessionError) {
            console.error('Erro ao obter sessão:', sessionError);
            throw new Error('Erro ao processar confirmação');
          }

          // PROCESSAMENTO APÓS CONFIRMAÇÃO DE EMAIL
          // Agora vamos inserir o usuário na tabela user_profiles
          let userId = null;
          let userEmail = null;
          
          // Primeiro verificar se temos usuário na sessão atual
          if (sessionData?.session?.user) {
            userId = sessionData.session.user.id;
            userEmail = sessionData.session.user.email;
          }
          
          // Se não temos usuário na sessão, tentar usar o token de acesso
          if (!userId && accessToken) {
            try {
              // Estabelecer sessão com o token recebido
              const { data: tokenSession, error: tokenError } = await (supabase as SupabaseClient<Database>).auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (tokenError) {
                console.error("Erro ao usar token:", tokenError);
              } else if (tokenSession?.user) {
                userId = tokenSession.user.id;
                userEmail = tokenSession.user.email;
              }
            } catch (tokenError) {
              console.error("Erro ao processar token:", tokenError);
            }
          }
          
          // Se ainda não temos usuário, tentar recuperar dos dados temporários
          if (!userId || !userEmail) {
            try {
              const pendingData = localStorage.getItem('pending_user_data');
              if (pendingData) {
                const parsedData = JSON.parse(pendingData);
                userId = parsedData.user_id || null;
                userEmail = parsedData.email || null;
              }
            } catch (storageError) {
              console.warn("Erro ao recuperar dados temporários:", storageError);
            }
          }
          
          // Agora inserir na tabela user_profiles se temos o ID e email
          if (userId && userEmail) {
            try {
              console.log(`Processando confirmação de email para usuário: ${userId} (${userEmail})`);
              
              // Recuperar dados adicionais que podem ter sido salvos durante o cadastro
              let displayName = null;
              let birthdate = null;
              
              try {
                const pendingData = localStorage.getItem('pending_user_data');
                if (pendingData) {
                  const parsedData = JSON.parse(pendingData);
                  displayName = parsedData.display_name;
                  birthdate = parsedData.birthdate;
                  // Limpar dados temporários
                  localStorage.removeItem('pending_user_data');
                }
              } catch (parseError) {
                console.warn("Erro ao processar dados temporários:", parseError);
              }
              
              // Primeiro sincronizar o email usando nossa função dedicada
              const emailSynced = await syncUserEmail(userId, userEmail);
              
              if (emailSynced) {
                console.log("✅ Email sincronizado com sucesso na tabela user_profiles!");
                
                // Se temos dados adicionais, atualizar o perfil com esses dados
                if (displayName || birthdate) {
                  console.log("Atualizando dados adicionais do perfil...");
                  
                  const profileData: Record<string, unknown> = {
                    user_id: userId,
                    updated_at: new Date().toISOString(),
                    verified_email: true
                  };
                  
                  if (displayName) profileData.display_name = displayName;
                  if (birthdate) profileData.birthdate = birthdate;
                  
                  const { error: updateError } = await (supabase as SupabaseClient<Database>).from('user_profiles')
                    .update(profileData)
                    .eq('user_id', userId);
                  
                  if (updateError) {
                    console.warn("Erro ao atualizar dados adicionais:", updateError);
                  } else {
                    console.log("✅ Dados adicionais atualizados com sucesso!");
                  }
                }
              } else {
                console.error("❌ Falha ao sincronizar email na tabela user_profiles");
                
                // Tentar inserção direta como fallback
                console.log("Tentando inserção direta como fallback...");
                
                const profileData: Database['public']['Tables']['user_profiles']['Insert'] = {
                  user_id: userId,
                  email: userEmail.trim().toLowerCase(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  verified_email: true
                };
                
                // Adicionar dados extras se disponíveis
                if (displayName) profileData.display_name = displayName;
                
                // Inserir na tabela user_profiles
                const { error: upsertError } = await (supabase as SupabaseClient<Database>).from('user_profiles')
                  .upsert(profileData, { 
                    onConflict: 'user_id' 
                  });
                
                if (upsertError) {
                  console.error("❌ Erro ao inserir usuário confirmado:", upsertError);
                } else {
                  console.log("✅ Usuário confirmado inserido na tabela user_profiles com sucesso!");
                }
              }
            } catch (dbError) {
              console.error("Erro ao processar inserção na tabela user_profiles:", dbError);
            }
          } else {
            console.warn("Não foi possível identificar o usuário para inserção na tabela");
          }

          if (sessionData?.session?.user) {
            console.log('Email confirmado com sucesso, usuário logado');
            setStatus('success');
            setMessage('Email confirmado com sucesso!');
            
            toast.success('Email confirmado!', {
              description: 'Sua conta foi ativada com sucesso.'
            });
            
            // Redirecionar para a página inicial
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else {
            console.log('Email confirmado, mas usuário não está logado');
            setStatus('success');
            setMessage('Email confirmado! Agora você pode fazer login.');
            
            toast.success('Email confirmado!', {
              description: 'Sua conta foi ativada. Agora você pode fazer login.'
            });
            
            // Redirecionar para login
            setTimeout(() => {
              navigate('/auth');
            }, 2000);
          }
        } else if (type === 'recovery' && accessToken) {
          // Callback de recuperação de senha
          console.log('Processando recuperação de senha...');
          setStatus('success');
          setMessage('Redirecionando para redefinição de senha...');
          
          // Redirecionar para a página de redefinição de senha
          navigate('/auth/reset-password');
        } else {
          // Tipo de callback não reconhecido ou parâmetros inválidos
          console.warn('Callback não reconhecido ou parâmetros inválidos');
          setStatus('error');
          setMessage('Link de confirmação inválido ou expirado');
          
          toast.error('Link inválido', {
            description: 'O link de confirmação é inválido ou expirou.'
          });
          
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        }
      } catch (error) {
        console.error('Erro ao processar callback:', error);
        setStatus('error');
        setMessage('Erro ao processar confirmação');
        
        toast.error('Erro na confirmação', {
          description: 'Houve um problema ao processar a confirmação.'
        });
        
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/30 via-black to-black p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="p-8 bg-black/40 backdrop-blur-xl rounded-2xl border-[0.5px] border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                delay: 0.2 
              }}
              className="mb-6 relative flex justify-center"
            >
              {status === 'loading' && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-md"></div>
                  <Loader2 className="h-16 w-16 text-blue-400/80 animate-spin" strokeWidth={1.5} />
                </div>
              )}
              
              {status === 'success' && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md"></div>
                  <CheckCircle2 className="h-16 w-16 text-emerald-400/80" strokeWidth={1.5} />
                </div>
              )}
              
              {status === 'error' && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/10 blur-md"></div>
                  <AlertCircle className="h-16 w-16 text-red-400/80" strokeWidth={1.5} />
                </div>
              )}
            </motion.div>
            
            <motion.h2 
              className="text-xl font-light text-white/90 mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {status === 'loading' && 'Processando...'}
              {status === 'success' && 'Sucesso!'}
              {status === 'error' && 'Erro'}
            </motion.h2>
            
            <motion.p 
              className="text-white/50 text-sm mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {message}
            </motion.p>
            
            {status !== 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="w-full"
              >
                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      status === 'success' 
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">
                  {status === 'success' ? 'Redirecionando...' : 'Voltando para login...'}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
} 