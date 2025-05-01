import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ChevronRight, 
  PlayCircle, 
  BarChart3, 
  Briefcase, 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight,
  BookOpen,
  Timer,
  Zap,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VideoPlayer } from "@/components/ui/video-player";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const Instructions = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  // Scroll para o topo quando a página for carregada
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 15
      }
    }
  };

  // Variantes para animação de transição entre seções - modificadas para serem mais suaves
  const sectionVariants = {
    hidden: { 
      opacity: 0, 
      x: 10,
      height: "auto"
    },
    visible: { 
      opacity: 1, 
      x: 0,
      height: "auto",
      transition: { 
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    exit: { 
      opacity: 0, 
      x: -10,
      height: "auto",
      transition: { 
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const toggleSection = (section: string) => {
    // Salvar a posição de rolagem atual
    scrollPositionRef.current = window.scrollY;
    
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
      
      // Usar um pequeno atraso para esperar a animação iniciar antes de restaurar a posição
      setTimeout(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'smooth'
        });
      }, 50);
    }
  };

  return (
    <Layout>
      {/* Elementos visuais sutis de fundo */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-br from-blue-600/5 to-indigo-900/5 blur-[120px]" />
        <div className="absolute bottom-[20%] left-[5%] w-[25vw] h-[25vw] rounded-full bg-gradient-to-br from-sky-500/5 to-emerald-600/5 blur-[100px]" />
        <div className="absolute top-[40%] left-[35%] w-[15vw] h-[15vw] rounded-full bg-gradient-to-br from-amber-500/5 to-red-500/5 blur-[80px]" />
        </div>
        
      <div className="max-w-screen-lg mx-auto px-4 pb-16 relative z-10">
        {/* Cabeçalho */}
        <motion.div 
          className="flex justify-between items-center mb-8 pt-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">Instruções</h1>
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> 
            Voltar
          </Button>
        </motion.div>

        {/* Vídeo Principal */}
        <motion.div 
          className="mb-10 overflow-hidden rounded-xl shadow-[0_5px_30px_rgba(0,0,0,0.25)]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <VideoPlayer
            videoKey="video.main"
            posterKey="video.poster.instructions"
            className="w-full"
            controls={true}
          />
        </motion.div>

        {/* Menu de navegação */}
        <motion.div 
          className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.button
            className={`group flex items-center p-5 rounded-xl ${activeSection === 'intro' ? 'bg-gradient-to-br from-blue-950/60 to-blue-900/40' : 'bg-white/5 hover:bg-white/10'} border border-white/10 backdrop-blur-sm transition-all duration-300`}
            variants={item}
            onClick={() => toggleSection('intro')}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-white">Introdução</h3>
              <p className="text-sm text-white/60">Conheça nossa plataforma</p>
            </div>
          </motion.button>

          <motion.button
            className={`group flex items-center p-5 rounded-xl ${activeSection === 'operation' ? 'bg-gradient-to-br from-emerald-950/60 to-emerald-900/40' : 'bg-white/5 hover:bg-white/10'} border border-white/10 backdrop-blur-sm transition-all duration-300`}
            variants={item}
            onClick={() => toggleSection('operation')}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-white">Como Operar</h3>
              <p className="text-sm text-white/60">Guia passo a passo</p>
            </div>
          </motion.button>

          <motion.button
            className={`group flex items-center p-5 rounded-xl ${activeSection === 'strategy' ? 'bg-gradient-to-br from-purple-950/60 to-purple-900/40' : 'bg-white/5 hover:bg-white/10'} border border-white/10 backdrop-blur-sm transition-all duration-300`}
            variants={item}
            onClick={() => toggleSection('strategy')}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-medium text-white">Estratégia de Gale</h3>
              <p className="text-sm text-white/60">Maximize seus resultados</p>
            </div>
          </motion.button>
        </motion.div>

        {/* Conteúdo das seções */}
        <div className="space-y-6" ref={contentRef}>
          {/* Usando AnimatePresence para animações entre seções */}
          <AnimatePresence mode="wait">
            {/* Seção Introdução */}
            {activeSection === 'intro' && (
              <motion.div
                className="rounded-xl overflow-hidden bg-gradient-to-br from-blue-950/40 to-blue-900/20 border border-blue-500/10 backdrop-blur-sm"
                key="intro-section"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="p-6 md:p-8 space-y-6">
                  {/* Cabeçalho da seção */}
                  <div className="flex flex-col md:flex-row md:items-center gap-6 border-b border-white/10 pb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl"></div>
                      <div className="w-16 h-16 relative rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <BookOpen className="h-7 w-7 text-blue-300" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-100 pb-1">Bem-vindo ao Trending</h2>
                      <p className="text-white/70">Transforme conhecimento em resultados reais e consistentes</p>
                    </div>
                  </div>

                  {/* Descrição principal */}
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/5 backdrop-blur-sm p-5 rounded-lg border border-blue-500/20">
                    <p className="text-white/80 leading-relaxed">
                      Bem-vindo ao Trending! Se você está aqui, certamente deseja fazer de R$100 a R$500 todos os dias operando no mercado financeiro. Vou mostrar que alcançar esse resultado não é tão difícil como imagina.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-4">
                      Aqui não prometemos que você ficará rico ou milionário do dia para a noite. Nosso objetivo é provar que você pode ter resultados consistentes e lucrativos no mercado financeiro.
                    </p>
                    <p className="text-white/80 leading-relaxed mt-4">
                      Não se trata de cassino ou brincadeira - estamos falando do mercado financeiro real, com operações de day trade, câmbio e criptomoedas.
                    </p>
                  </div>

                  {/* Cards com detalhes */}
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div 
                      className="group"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="h-full bg-gradient-to-br from-blue-900/40 via-blue-900/30 to-sky-900/20 backdrop-blur-md p-6 rounded-lg border border-blue-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="relative flex flex-col">
                          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-600/10 mb-5 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300">
                            <Clock className="h-6 w-6 text-blue-300 group-hover:text-blue-200 transition-colors duration-300" />
                          </div>

                          <h3 className="text-xl font-semibold text-blue-200 mb-3 group-hover:text-white transition-colors duration-300">Operações em 3 horários</h3>
                          
                          <p className="text-white/70 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                            Manhã, tarde e noite. Escolha o melhor momento para operar conforme sua disponibilidade.
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="group"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="h-full bg-gradient-to-br from-sky-900/40 via-sky-900/30 to-blue-900/20 backdrop-blur-md p-6 rounded-lg border border-sky-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="relative flex flex-col">
                          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 mb-5 border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.2)] group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-300">
                            <Briefcase className="h-6 w-6 text-sky-300 group-hover:text-sky-200 transition-colors duration-300" />
                          </div>

                          <h3 className="text-xl font-semibold text-sky-200 mb-3 group-hover:text-white transition-colors duration-300">Análises em tempo real</h3>
                          
                          <p className="text-white/70 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                            Sinais ao vivo baseados em análise profissional de mercado, sem uso de robôs ou automações.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Seção Como Operar */}
            {activeSection === 'operation' && (
              <motion.div
                className="rounded-xl overflow-hidden bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-500/10 backdrop-blur-sm"
                key="operation-section"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="p-6 md:p-8 space-y-6">
                  {/* Cabeçalho da seção */}
                  <div className="flex flex-col md:flex-row md:items-center gap-6 border-b border-white/10 pb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl"></div>
                      <div className="w-16 h-16 relative rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        <BarChart3 className="h-7 w-7 text-emerald-300" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-100 pb-1">Domine as operações</h2>
                      <p className="text-white/70">Siga o passo a passo para começar a operar com confiança</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Primeiros passos */}
                    <div className="relative">
                      <div className="relative bg-gradient-to-br from-emerald-900/30 to-emerald-800/5 backdrop-blur-sm p-6 rounded-lg border border-emerald-500/20">
                        <h3 className="text-xl font-semibold text-emerald-200 mb-5 flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mr-3 border border-emerald-500/30">
                            <span className="text-sm text-emerald-300 font-medium">1</span>
                          </div>
                          Primeiros passos
                        </h3>
                        
                        <div className="space-y-4 ml-11">
                          <motion.div 
                            className="flex items-start gap-4 group"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.5 }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30 mt-0.5 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                              <span className="text-sm text-emerald-400 font-medium">1</span>
                            </div>
                            <p className="text-white/80 group-hover:text-white transition-colors duration-300">Faça seu cadastro na corretora através do link disponível no App</p>
                          </motion.div>

                          <motion.div 
                            className="flex items-start gap-4 group"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.5 }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30 mt-0.5 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                              <span className="text-sm text-emerald-400 font-medium">2</span>
                            </div>
                            <p className="text-white/80 group-hover:text-white transition-colors duration-300">Após cadastro, você receberá uma conta demo com R$10.000 para testes</p>
                          </motion.div>

                          <motion.div 
                            className="flex items-start gap-4 group"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.5 }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30 mt-0.5 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                              <span className="text-sm text-emerald-400 font-medium">3</span>
                            </div>
                            <p className="text-white/80 group-hover:text-white transition-colors duration-300">Para operar com dinheiro real, faça um depósito (recomendamos pelo menos R$100)</p>
                          </motion.div>

                          <motion.div 
                            className="flex items-start gap-4 group"
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.5 }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30 mt-0.5 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                              <span className="text-sm text-emerald-400 font-medium">4</span>
                            </div>
                            <p className="text-white/80 group-hover:text-white transition-colors duration-300">Configure o gráfico para formato de velas e tempo de 5 minutos</p>
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Executando operações */}
                    <div className="relative">
                      <div className="relative bg-gradient-to-br from-emerald-900/30 to-emerald-800/5 backdrop-blur-sm p-6 rounded-lg border border-emerald-500/20">
                        <h3 className="text-xl font-semibold text-emerald-200 mb-5 flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mr-3 border border-emerald-500/30">
                            <span className="text-sm text-emerald-300 font-medium">2</span>
                          </div>
                          Executando operações
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                          <motion.div 
                            className="group"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          >
                            <div className="h-full bg-gradient-to-br from-emerald-800/40 to-emerald-900/20 p-5 rounded-lg border border-emerald-500/30 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <div className="flex flex-col items-center text-center relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                                  <ArrowUpRight className="h-6 w-6 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                                </div>
                                <h4 className="text-white font-medium mb-2 group-hover:text-emerald-200 transition-colors duration-300">Para mercado em alta</h4>
                                <p className="text-white/70 text-sm group-hover:text-white/80 transition-colors duration-300">Clique no botão verde (comprar)</p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div 
                            className="group"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          >
                            <div className="h-full bg-gradient-to-br from-emerald-800/40 to-emerald-900/20 p-5 rounded-lg border border-emerald-500/30 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <div className="flex flex-col items-center text-center relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                                  <ArrowDownRight className="h-6 w-6 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                                </div>
                                <h4 className="text-white font-medium mb-2 group-hover:text-emerald-200 transition-colors duration-300">Para mercado em queda</h4>
                                <p className="text-white/70 text-sm group-hover:text-white/80 transition-colors duration-300">Clique no botão vermelho (vender)</p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div 
                            className="group"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          >
                            <div className="h-full bg-gradient-to-br from-emerald-800/40 to-emerald-900/20 p-5 rounded-lg border border-emerald-500/30 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <div className="flex flex-col items-center text-center relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow duration-300">
                                  <Timer className="h-6 w-6 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                                </div>
                                <h4 className="text-white font-medium mb-2 group-hover:text-emerald-200 transition-colors duration-300">Tempo de expiração</h4>
                                <p className="text-white/70 text-sm group-hover:text-white/80 transition-colors duration-300">Configure igual ao tempo de vela (5 minutos)</p>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Dica profissional */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-teal-500/2 to-teal-500/5 rounded-xl blur-xl"></div>
                      <div className="relative bg-gradient-to-br from-black/40 to-black/20 rounded-xl p-6 border border-teal-500/10 backdrop-blur-sm overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500/0 via-teal-500/30 to-teal-500/0"></div>
                        
                        <div className="flex flex-col sm:flex-row items-start gap-5">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-600/10 flex items-center justify-center flex-shrink-0 border border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.1)]">
                            <PlayCircle className="h-5 w-5 text-teal-400" />
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-teal-100 mb-2">Dica importante</h4>
                            <p className="text-white/70 leading-relaxed">
                              Siga os sinais enviados no App, operando no momento exato indicado. A disciplina e paciência são essenciais para obter resultados consistentes no mercado financeiro.
                            </p>
                            
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-teal-200/60 text-sm">
                                <div className="w-1 h-1 rounded-full bg-teal-400"></div>
                                <span>Opere apenas nos momentos indicados</span>
                              </div>
                              <div className="flex items-center gap-2 text-teal-200/60 text-sm">
                                <div className="w-1 h-1 rounded-full bg-teal-400"></div>
                                <span>Mantenha registro de suas operações</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Seção Estratégia de Gale */}
            {activeSection === 'strategy' && (
              <motion.div
                className="rounded-xl overflow-hidden bg-gradient-to-br from-purple-950/40 to-purple-900/20 border border-purple-500/10 backdrop-blur-sm"
                key="strategy-section"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="p-6 md:p-8 space-y-6">
                  {/* Cabeçalho da seção */}
                  <div className="flex flex-col md:flex-row md:items-center gap-6 border-b border-white/10 pb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl"></div>
                      <div className="w-16 h-16 relative rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center flex-shrink-0 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                        <Zap className="h-7 w-7 text-purple-300" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-100 pb-1">Estratégia de Gale</h2>
                      <p className="text-white/70">Maximize seus ganhos com nossa estratégia exclusiva de reentradas</p>
                    </div>
                  </div>

                  {/* Descrição principal */}
                  <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/5 backdrop-blur-sm p-5 rounded-lg border border-purple-500/20">
                    <p className="text-white/80 leading-relaxed">
                      Se não conseguir lucrar na primeira tentativa, nossa estratégia de Gale (reentradas) ajuda a recuperar operações perdidas. Esta técnica consiste em dobrar o valor investido em momentos estratégicos, aumentando suas chances de recuperação.
                    </p>
                  </div>

                  {/* Representação visual do Gale */}
                  <div className="relative py-10">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <svg width="400" height="150" viewBox="0 0 400 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M30,75 L120,120 L200,30 L280,120 L370,75" stroke="url(#gradientPath)" strokeWidth="3" strokeLinecap="round" fill="none"/>
                        <defs>
                          <linearGradient id="gradientPath" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="50%" stopColor="#EC4899" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <motion.div 
                        className="group"
                        whileHover={{ y: -8 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <div className="h-full bg-gradient-to-br from-purple-900/40 via-purple-900/30 to-fuchsia-900/20 backdrop-blur-md p-6 rounded-lg border border-purple-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative flex flex-col items-center md:items-start text-center md:text-left">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-600/10 mb-5 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300">
                              <span className="text-lg font-semibold text-purple-300 group-hover:text-purple-200 transition-colors duration-300">G1</span>
                            </div>
                            
                            <h3 className="text-xl font-semibold text-purple-200 mb-3 group-hover:text-white transition-colors duration-300">Gale 1</h3>
                            
                            <div className="w-10 h-1 bg-gradient-to-r from-purple-500/50 to-fuchsia-500/50 rounded-full mb-4 md:hidden"></div>
                            
                            <p className="text-white/80 leading-relaxed">
                              Quando a operação está perdendo, aguarde até faltarem 2 segundos para finalizar e faça uma reentrada dobrando o valor inicial da operação.
                            </p>

                            <div className="mt-4 pt-4 border-t border-purple-500/10 w-full">
                              <div className="flex items-center text-white/60 text-sm">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 mr-2"></div>
                                <span>Dobra o valor da entrada inicial</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="group"
                        whileHover={{ y: -8 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <div className="h-full bg-gradient-to-br from-fuchsia-900/40 via-fuchsia-900/30 to-purple-900/20 backdrop-blur-md p-6 rounded-lg border border-fuchsia-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative flex flex-col items-center md:items-start text-center md:text-left">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/10 mb-5 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,219,0.2)] group-hover:shadow-[0_0_15px_rgba(217,70,219,0.3)] transition-all duration-300">
                              <span className="text-lg font-semibold text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors duration-300">G2</span>
                            </div>
                            
                            <h3 className="text-xl font-semibold text-fuchsia-200 mb-3 group-hover:text-white transition-colors duration-300">Gale 2</h3>
                            
                            <div className="w-10 h-1 bg-gradient-to-r from-fuchsia-500/50 to-purple-500/50 rounded-full mb-4 md:hidden"></div>
                            
                            <p className="text-white/80 leading-relaxed">
                              Se o Gale 1 não recuperar a operação, faça uma segunda reentrada dobrando o valor do Gale 1 quando faltarem 2 segundos para finalizar.
                            </p>

                            <div className="mt-4 pt-4 border-t border-fuchsia-500/10 w-full">
                              <div className="flex items-center text-white/60 text-sm">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-red-500 mr-2"></div>
                                <span>Dobra o valor do Gale 1</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Dica profissional com design sofisticado */}
                  <div className="mt-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/2 to-amber-500/5 rounded-xl blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-black/40 to-black/20 rounded-xl p-6 border border-amber-500/10 backdrop-blur-sm overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0"></div>
                      
                      <div className="flex flex-col sm:flex-row items-start gap-5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/10 flex items-center justify-center flex-shrink-0 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                          <PlayCircle className="h-5 w-5 text-amber-400" />
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-100 mb-2">Cuidado com os riscos</h4>
                          <p className="text-white/70 leading-relaxed">
                            Embora a estratégia de Gale possa aumentar suas chances de recuperação, ela também aumenta o risco. Nunca invista mais do que pode perder e mantenha uma gestão rigorosa do seu capital.
                          </p>
                          
                          <div className="mt-4 flex items-center text-amber-200/60 text-sm">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mr-2"></div>
                            <span>O Trending indica quando usar a estratégia de Gale, para ajudar você a operar com mais segurança.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Chamada para ação quando nenhuma seção está selecionada */}
          {!activeSection && (
            <motion.div 
              className="text-center py-16 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/10 border border-white/10 mb-6"
                animate={{ 
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    "0 0 0 rgba(255,255,255,0.1)",
                    "0 0 20px rgba(255,255,255,0.2)",
                    "0 0 0 rgba(255,255,255,0.1)"
                  ]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <ChevronRight className="h-10 w-10 text-white/40" />
              </motion.div>
              <h3 className="text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-300 mb-3">Selecione uma seção para começar</h3>
              <p className="text-white/60 max-w-md mx-auto leading-relaxed">
                Escolha uma das opções acima para explorar os detalhes sobre como utilizar nossa plataforma e maximizar seus resultados.
              </p>
            </motion.div>
          )}
        </div>

        {/* Informações adicionais ao final */}
        <motion.div 
          className="mt-16 border-t border-white/10 pt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <h3 className="text-xl font-semibold text-white mb-3">Comece a operar agora mesmo</h3>
          <p className="text-white/60 max-w-xl mx-auto">
            O Trending facilita o acesso ao mercado financeiro com nossa tecnologia exclusiva.
          </p>
          <Button 
            className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 h-auto text-lg rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transition-all duration-300"
            onClick={() => {
              // Definir os links da corretora baseados no idioma
              const brokerLinks = {
                pt: "https://trade.xxbroker.com/register?aff=741613&aff_model=revenue&afftrack=",
                en: "https://trade.xxbroker.com/register?aff=741727&aff_model=revenue&afftrack=",
                es: "https://trade.xxbroker.com/register?aff=741726&aff_model=revenue&afftrack="
              };
              
              // Redirecionar para o link adequado baseado no idioma
              window.open(brokerLinks[language], "_blank");
            }}  
          >
            Abrir Corretora
            <ExternalLink className="h-5 w-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Instructions; 