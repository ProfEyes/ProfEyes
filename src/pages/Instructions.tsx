import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { PlayCircle, InfoIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VideoPlayer } from "@/components/ui/video-player";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const Instructions = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Scroll para o topo quando a página for carregada
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <div className="animate-fade space-y-8">
        {/* Elementos decorativos flutuantes */}
        <div className="fixed w-full h-full inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] right-[8%] w-32 h-32 bg-gradient-to-r from-purple-500/10 to-violet-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[25%] left-[10%] w-40 h-40 bg-gradient-to-r from-emerald-500/5 to-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[45%] left-[25%] w-24 h-24 bg-gradient-to-br from-white/5 to-white/10 rounded-full blur-2xl"></div>
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent 
                         drop-shadow-[0_0px_10px_rgba(255,255,255,0.1)]">
              {t('instructions.title')}
            </h1>
            <p className="text-muted-foreground opacity-80 text-sm">
              {t('instructions.subtitle')}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="rounded-lg border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/10 flex items-center gap-2 
                     transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
          >
            <ArrowLeft className="h-3.5 w-3.5 opacity-80" /> {t('instructions.back')}
          </Button>
        </div>

        {/* Área do vídeo */}
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8">
          <VideoPlayer
            videoKey="video.instructions"
            posterKey="video.poster.instructions"
            className="w-full"
            controls={true}
          />
        </div>

        {/* Cards de instruções */}
        <div className="grid gap-6 md:grid-cols-2 relative z-10">
          {/* Card de Introdução */}
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t('instructions.intro.title')}</h2>
            <p className="text-white/70 mb-3">
              {t('instructions.intro.text1')}
            </p>
            <p className="text-white/70 mb-3">
              {t('instructions.intro.text2')}
            </p>
            <p className="text-white/70">
              {t('instructions.intro.text3')}
            </p>
          </div>

          {/* Card de Funcionalidades */}
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t('instructions.features.title')}</h2>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <span>{t('instructions.features.dashboard')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <span>{t('instructions.features.signals')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <span>{t('instructions.features.news')}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-4 h-4 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <span>{t('instructions.features.notifications')}</span>
              </li>
            </ul>
          </div>

          {/* Card de Como Utilizar */}
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t('instructions.howto.title')}</h2>
            <p className="text-white/70 mb-3">
              {t('instructions.howto.intro')}
            </p>
            <ol className="space-y-2 text-white/70 ml-5 list-decimal">
              <li>{t('instructions.howto.step1')}</li>
              <li>{t('instructions.howto.step2')}</li>
              <li>{t('instructions.howto.step3')}</li>
              <li>{t('instructions.howto.step4')}</li>
              <li>{t('instructions.howto.step5')}</li>
            </ol>
          </div>

          {/* Card de Termos Importantes */}
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t('instructions.terms.title')}</h2>
            <div className="space-y-3 text-white/70">
              <div>
                <h3 className="font-semibold">{t('instructions.terms.signal.title')}</h3>
                <p className="text-sm">{t('instructions.terms.signal.desc')}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('instructions.terms.entry.title')}</h3>
                <p className="text-sm">{t('instructions.terms.entry.desc')}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('instructions.terms.target.title')}</h3>
                <p className="text-sm">{t('instructions.terms.target.desc')}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('instructions.terms.stop.title')}</h3>
                <p className="text-sm">{t('instructions.terms.stop.desc')}</p>
              </div>
              <div>
                <h3 className="font-semibold">{t('instructions.terms.reentry.title')}</h3>
                <p className="text-sm">{t('instructions.terms.reentry.desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Instructions; 