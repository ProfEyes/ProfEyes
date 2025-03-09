import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface TermsAndConditionsProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsAndConditions({ onAccept, onDecline }: TermsAndConditionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-black/40 backdrop-blur-xl rounded-2xl border-[0.5px] border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        <div className="p-6 border-b border-white/[0.05]">
          <h2 className="text-xl font-light text-white/90">Termos e Condições</h2>
          <p className="mt-2 text-sm text-white/50">
            Por favor, leia atentamente os termos e condições antes de prosseguir
          </p>
        </div>

        <ScrollArea className="h-[400px] p-6">
          <div className="space-y-6 text-sm text-white/70">
            <section>
              <h3 className="text-white/90 font-medium mb-3">1. Introdução e Aceitação dos Termos</h3>
              <p className="mb-4">
                Ao utilizar o ProfEyes ("Plataforma"), você concorda expressamente com estes Termos e Condições. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossa plataforma.
              </p>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">2. Natureza do Serviço</h3>
              <p className="mb-2">
                2.1. A Plataforma fornece análises e informações sobre mercados financeiros baseadas em algoritmos e inteligência artificial, NÃO constituindo recomendações de investimento.
              </p>
              <p className="mb-2">
                2.2. Todo o conteúdo disponibilizado é meramente informativo e educacional, NÃO devendo ser interpretado como aconselhamento financeiro, recomendação de investimento ou consultoria de valores mobiliários.
              </p>
              <p className="mb-2">
                2.3. A Plataforma NÃO é uma instituição financeira, corretora de valores mobiliários ou consultoria de investimentos registrada na CVM.
              </p>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">3. Isenção de Responsabilidade</h3>
              <p className="mb-2">
                3.1. O usuário reconhece e aceita que:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Investimentos em mercados financeiros envolvem riscos significativos de perdas que podem exceder os valores investidos;</li>
                <li>Resultados passados não garantem resultados futuros;</li>
                <li>As análises fornecidas podem conter erros ou imprecisões;</li>
                <li>A Plataforma não se responsabiliza por decisões de investimento tomadas pelo usuário;</li>
                <li>O usuário é o único responsável por suas decisões de investimento e deve realizar sua própria análise.</li>
              </ul>
              <p className="mb-2">
                3.2. A Plataforma não garante:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A precisão, completude ou atualidade das informações fornecidas;</li>
                <li>O funcionamento ininterrupto ou livre de erros do sistema;</li>
                <li>Resultados específicos ou retornos financeiros.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">4. Responsabilidades do Usuário</h3>
              <p className="mb-2">
                O usuário declara e garante que:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>É maior de 18 anos e plenamente capaz;</li>
                <li>Compreende os riscos associados a investimentos financeiros;</li>
                <li>Buscará aconselhamento profissional independente antes de tomar decisões de investimento;</li>
                <li>Utilizará as informações da Plataforma apenas como parte de uma análise mais ampla;</li>
                <li>Não responsabilizará a Plataforma por eventuais perdas ou prejuízos.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">5. Limitação de Responsabilidade</h3>
              <p className="mb-4">
                Em nenhuma circunstância a Plataforma, seus proprietários, funcionários ou afiliados serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais ou consequenciais resultantes do uso ou incapacidade de uso da Plataforma ou de seu conteúdo.
              </p>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">6. Conformidade Legal</h3>
              <p className="mb-4">
                6.1. Este serviço opera em conformidade com a legislação brasileira, incluindo mas não se limitando a:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Lei 6.385/76 (Mercado de Valores Mobiliários)</li>
                <li>Instruções CVM aplicáveis</li>
                <li>Lei Geral de Proteção de Dados (LGPD)</li>
                <li>Código de Defesa do Consumidor</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">7. Alterações nos Termos</h3>
              <p className="mb-4">
                A Plataforma reserva-se o direito de modificar estes termos a qualquer momento, sendo o usuário notificado sobre quaisquer alterações significativas.
              </p>
            </section>

            <section>
              <h3 className="text-white/90 font-medium mb-3">8. Declaração de Ciência</h3>
              <p className="mb-4">
                Ao aceitar estes termos, você declara expressamente que:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Leu, compreendeu e concorda com todas as condições estabelecidas;</li>
                <li>Entende que a Plataforma não fornece recomendações de investimento;</li>
                <li>Assume total responsabilidade por suas decisões de investimento;</li>
                <li>Compreende os riscos envolvidos em operações financeiras;</li>
                <li>Buscará orientação profissional quando necessário.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-white/[0.05] flex justify-end space-x-4">
          <Button
            variant="ghost"
            onClick={onDecline}
            className="text-white/50 hover:text-white/70 hover:bg-white/5"
          >
            Recusar
          </Button>
          <Button
            onClick={onAccept}
            className="bg-black/30 hover:bg-black/50 text-white/80 hover:text-white/90 border-[0.5px] border-white/[0.05] px-6"
          >
            Aceitar e Continuar
          </Button>
        </div>
      </div>
    </motion.div>
  );
} 