import { Language } from '@/contexts/LanguageContext';

export interface TermsAndConditions {
  country: string;
  language: Language;
  title: string;
  lastUpdated: string;
  content: {
    legalWarning: string;
    introduction: string;
    sections: {
      title: string;
      content: string;
    }[];
    acceptance: {
      title: string;
      items: string[];
      footer: string;
    };
  };
}

// Termos e Condições para o Brasil
const BRAZIL_TERMS: TermsAndConditions = {
  country: 'BR',
  language: 'pt',
  title: 'Termos e Condições de Uso',
  lastUpdated: new Date().toLocaleDateString('pt-BR'),
  content: {
    legalWarning: 'AVISO LEGAL IMPORTANTE: ESTE É UM CONTRATO VINCULANTE SOB A LEGISLAÇÃO BRASILEIRA. LEIA ATENTAMENTE ANTES DE UTILIZAR O SERVIÇO.',
    introduction: 'Ao acessar ou utilizar o Trending, você concorda expressamente com estes termos e aceita as limitações de responsabilidade conforme detalhado abaixo, em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/90) e demais normas aplicáveis.',
    sections: [
      {
        title: '1. NATUREZA DO SERVIÇO E LIMITAÇÕES',
        content: `<p><strong>SERVIÇO EDUCACIONAL:</strong> O Trending é uma plataforma de informações educacionais sobre mercados financeiros. Não oferecemos consultoria de investimentos, conforme definido pela Instrução CVM nº 592/2017.</p>
        
        <p><strong>INFORMAÇÕES GERAIS:</strong> Todo conteúdo disponibilizado tem caráter meramente informativo e educacional, não constituindo recomendação personalizada de investimento.</p>
        
        <p><strong>RESPONSABILIDADE DO USUÁRIO:</strong> O usuário é exclusivamente responsável por suas decisões de investimento e deve sempre buscar aconselhamento profissional qualificado.</p>`
      },
      {
        title: '2. ISENÇÃO DE RESPONSABILIDADE',
        content: `<p><strong>JURISDIÇÃO DOS SERVIÇOS:</strong> Trending fornece seus serviços exclusivamente nos territórios em que é licenciada. Trending não está autorizada pela Comissão de Valores Mobiliários (CVM) a oferecer diretamente serviços de distribuição de valores mobiliários a investidores residentes, domiciliados ou incorporados na República Federativa do Brasil. Nada neste site deve ser entendido como uma oferta direta de serviços endereçados a esses investidores.</p>`
      },
      {
        title: '3. LIMITAÇÃO DE RESPONSABILIDADE',
        content: `<p><strong>LIMITAÇÃO LEGAL:</strong> Nossa responsabilidade está limitada ao máximo permitido pela legislação brasileira, respeitando o Código de Defesa do Consumidor.</p>
        
        <p><strong>RISCOS INERENTES:</strong> Investimentos envolvem riscos de perdas. O usuário reconhece e assume todos os riscos relacionados a suas decisões de investimento.</p>
        
        <p><strong>FALHAS TÉCNICAS:</strong> Não nos responsabilizamos por falhas técnicas, interrupções de serviço ou problemas de conectividade que estejam fora de nosso controle direto.</p>
        
        <p><strong>PRECISÃO DAS INFORMAÇÕES:</strong> Envidamos esforços para fornecer informações precisas, mas não garantimos a exatidão absoluta de todos os dados, que podem conter erros ou atrasos.</p>`
      },
      {
        title: '4. CONFORMIDADE LEGAL BRASILEIRA',
        content: `<p><strong>LEGISLAÇÃO APLICÁVEL:</strong> Este contrato é regido pelas leis da República Federativa do Brasil, incluindo a Lei nº 6.385/76 (mercado de valores mobiliários), Instruções da CVM, e Lei nº 13.709/2018 (LGPD).</p>
        
        <p><strong>PROTEÇÃO DE DADOS:</strong> Seus dados pessoais são tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD), conforme nossa Política de Privacidade.</p>
        
        <p><strong>DIREITOS DO CONSUMIDOR:</strong> Respeitamos integralmente o Código de Defesa do Consumidor e todos os direitos dele decorrentes.</p>`
      },
      {
        title: '5. RESOLUÇÃO DE CONFLITOS',
        content: `<p><strong>FORO COMPETENTE:</strong> Qualquer disputa será resolvida no foro da comarca de domicílio do usuário, conforme garantido pelo Código de Defesa do Consumidor.</p>
        
        <p><strong>MEDIAÇÃO:</strong> Encorajamos a resolução amigável de conflitos através de mediação antes de qualquer procedimento judicial.</p>
        
        <p><strong>PRAZO PARA RECLAMAÇÕES:</strong> Reclamações devem ser apresentadas dentro dos prazos legais estabelecidos pelo Código de Defesa do Consumidor.</p>`
      },
      {
        title: '6. MODIFICAÇÕES E ATUALIZAÇÕES',
        content: `<p><strong>ALTERAÇÕES:</strong> Alterações nestes termos serão comunicadas com antecedência mínima de 30 dias, conforme exigido pela legislação brasileira.</p>
        
        <p><strong>CONTINUIDADE DO SERVIÇO:</strong> O uso continuado após as alterações constitui aceitação dos novos termos.</p>`
      }
    ],
    acceptance: {
      title: 'DECLARAÇÃO DE CIÊNCIA E ACEITAÇÃO',
      items: [
        'Li, compreendi e concordo com todos os termos descritos acima',
        'Compreendo que este é um serviço educacional e não constitui consultoria de investimentos',
        'Reconheço os riscos inerentes aos investimentos financeiros',
        'Assumo total responsabilidade por minhas decisões de investimento',
        'Estou ciente de meus direitos como consumidor brasileiro',
        'Tenho capacidade legal para aceitar estes termos'
      ],
      footer: 'Se não concordar com qualquer parte destes termos, você não deve utilizar nossa plataforma.'
    }
  }
};

// Termos e Condições para os Estados Unidos
const USA_TERMS: TermsAndConditions = {
  country: 'US',
  language: 'en',
  title: 'Terms and Conditions of Use',
  lastUpdated: new Date().toLocaleDateString('en-US'),
  content: {
    legalWarning: 'IMPORTANT LEGAL NOTICE: THIS IS A BINDING CONTRACT UNDER UNITED STATES LAW. READ CAREFULLY BEFORE USING THE SERVICE.',
    introduction: 'By accessing or using Trending, you expressly agree to these terms and accept the limitations of liability as detailed below, in accordance with applicable federal and state laws.',
    sections: [
      {
        title: '1. NATURE OF SERVICE AND LIMITATIONS',
        content: `<p><strong>EDUCATIONAL SERVICE:</strong> Trending is an educational information platform about financial markets. We do not provide investment advice as defined by the Investment Advisers Act of 1940.</p>
        
        <p><strong>GENERAL INFORMATION:</strong> All content provided is for informational and educational purposes only and does not constitute personalized investment recommendations.</p>
        
        <p><strong>USER RESPONSIBILITY:</strong> You are solely responsible for your investment decisions and should always seek qualified professional advice.</p>`
      },
      {
        title: '2. DISCLAIMER',
        content: `<p><strong>JURISDICTION OF SERVICES:</strong> Trending provides its services exclusively in territories where it is licensed. Trending is not authorized by the Brazilian Securities and Exchange Commission (CVM) to directly offer securities distribution services to investors who are residents, domiciled, or incorporated in the Federative Republic of Brazil. Nothing on this website should be construed as a direct offer of services addressed to these investors.</p>`
      },
      {
        title: '3. LIMITATION OF LIABILITY',
        content: `<p><strong>LEGAL LIMITATION:</strong> Our liability is limited to the maximum extent permitted by applicable federal and state laws.</p>
        
        <p><strong>INHERENT RISKS:</strong> Investments involve risk of loss. You acknowledge and assume all risks related to your investment decisions.</p>
        
        <p><strong>TECHNICAL FAILURES:</strong> We are not responsible for technical failures, service interruptions, or connectivity issues beyond our direct control.</p>
        
        <p><strong>INFORMATION ACCURACY:</strong> While we strive to provide accurate information, we do not guarantee absolute accuracy of all data, which may contain errors or delays.</p>`
      },
      {
        title: '4. UNITED STATES LEGAL COMPLIANCE',
        content: `<p><strong>APPLICABLE LAW:</strong> This agreement is governed by the laws of the United States, including federal securities laws and applicable state regulations.</p>
        
        <p><strong>DATA PROTECTION:</strong> Your personal data is handled in accordance with applicable privacy laws and our Privacy Policy.</p>
        
        <p><strong>REGULATORY COMPLIANCE:</strong> We comply with all applicable federal and state financial regulations.</p>`
      },
      {
        title: '5. DISPUTE RESOLUTION',
        content: `<p><strong>BINDING ARBITRATION:</strong> Any disputes will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
        
        <p><strong>CLASS ACTION WAIVER:</strong> You waive any right to participate in class action lawsuits against us.</p>
        
        <p><strong>JURY WAIVER:</strong> Both parties waive the right to trial by jury.</p>
        
        <p><strong>STATUTE OF LIMITATIONS:</strong> Any claims must be brought within one year of the cause of action arising.</p>`
      },
      {
        title: '6. MODIFICATIONS AND UPDATES',
        content: `<p><strong>CHANGES:</strong> We may modify these terms at any time with notice as required by applicable law.</p>
        
        <p><strong>CONTINUED USE:</strong> Continued use after changes constitutes acceptance of new terms.</p>`
      }
    ],
    acceptance: {
      title: 'ACKNOWLEDGMENT AND ACCEPTANCE',
      items: [
        'I have read, understood, and agree to all terms described above',
        'I understand this is an educational service and does not constitute investment advice',
        'I recognize the inherent risks of financial investments',
        'I assume full responsibility for my investment decisions',
        'I am aware of my rights under applicable US laws',
        'I have legal capacity to accept these terms'
      ],
      footer: 'If you do not agree with any part of these terms, you must not use our platform.'
    }
  }
};

// Termos e Condições para a Espanha
const SPAIN_TERMS: TermsAndConditions = {
  country: 'ES',
  language: 'es',
  title: 'Términos y Condiciones de Uso',
  lastUpdated: new Date().toLocaleDateString('es-ES'),
  content: {
    legalWarning: 'AVISO LEGAL IMPORTANTE: ESTE ES UN CONTRATO VINCULANTE BAJO LA LEGISLACIÓN ESPAÑOLA. LEA ATENTAMENTE ANTES DE UTILIZAR EL SERVICIO.',
    introduction: 'Al acceder o utilizar Trending, usted acepta expresamente estos términos y las limitaciones de responsabilidad según se detalla a continuación, en conformidad con la legislación española aplicable.',
    sections: [
      {
        title: '1. NATURALEZA DEL SERVICIO Y LIMITACIONES',
        content: `<p><strong>SERVICIO EDUCATIVO:</strong> Trending es una plataforma de información educativa sobre mercados financieros. No ofrecemos asesoramiento de inversiones según se define en la normativa española.</p>
        
        <p><strong>INFORMACIÓN GENERAL:</strong> Todo el contenido proporcionado tiene carácter meramente informativo y educativo, no constituye recomendaciones personalizadas de inversión.</p>
        
        <p><strong>RESPONSABILIDAD DEL USUARIO:</strong> Usted es exclusivamente responsable de sus decisiones de inversión y debe buscar siempre asesoramiento profesional cualificado.</p>`
      },
      {
        title: '2. EXENCIÓN DE RESPONSABILIDAD',
        content: `<p><strong>JURISDICCIÓN DE SERVICIOS:</strong> Trending proporciona sus servicios exclusivamente en los territorios donde está autorizada. Trending no está autorizada por la Comisión de Valores Mobiliarios de Brasil (CVM) para ofrecer directamente servicios de distribución de valores a inversores residentes, domiciliados o constituidos en la República Federativa de Brasil. Nada en este sitio web debe interpretarse como una oferta directa de servicios dirigida a estos inversores.</p>`
      },
      {
        title: '3. LIMITACIÓN DE RESPONSABILIDAD',
        content: `<p><strong>LIMITACIÓN LEGAL:</strong> Nuestra responsabilidad está limitada al máximo permitido por la legislación española aplicable.</p>
        
        <p><strong>RIESGOS INHERENTES:</strong> Las inversiones conllevan riesgo de pérdidas. Usted reconoce y asume todos los riesgos relacionados con sus decisiones de inversión.</p>
        
        <p><strong>FALLOS TÉCNICOS:</strong> No nos responsabilizamos de fallos técnicos, interrupciones del servicio o problemas de conectividad que estén fuera de nuestro control directo.</p>
        
        <p><strong>PRECISIÓN DE LA INFORMACIÓN:</strong> Aunque nos esforzamos por proporcionar información precisa, no garantizamos la exactitud absoluta de todos los datos, que pueden contener errores o retrasos.</p>`
      },
      {
        title: '4. CUMPLIMIENTO LEGAL ESPAÑOL',
        content: `<p><strong>LEGISLACIÓN APLICABLE:</strong> Este contrato se rige por las leyes de España, incluyendo la normativa sobre mercados de valores y regulaciones aplicables.</p>
        
        <p><strong>PROTECCIÓN DE DATOS:</strong> Sus datos personales se tratan en conformidad con el Reglamento General de Protección de Datos (RGPD) y nuestra Política de Privacidad.</p>
        
        <p><strong>CUMPLIMIENTO NORMATIVO:</strong> Cumplimos con toda la normativa financiera española aplicable.</p>`
      },
      {
        title: '5. RESOLUCIÓN DE CONFLICTOS',
        content: `<p><strong>JURISDICCIÓN COMPETENTE:</strong> Cualquier disputa será resuelta en los tribunales españoles competentes según la legislación aplicable.</p>
        
        <p><strong>MEDIACIÓN:</strong> Fomentamos la resolución amigable de conflictos a través de mediación antes de cualquier procedimiento judicial.</p>
        
        <p><strong>PLAZO PARA RECLAMACIONES:</strong> Las reclamaciones deben presentarse dentro de los plazos legales establecidos por la legislación española.</p>`
      },
      {
        title: '6. MODIFICACIONES Y ACTUALIZACIONES',
        content: `<p><strong>CAMBIOS:</strong> Las modificaciones de estos términos se comunicarán con la antelación requerida por la legislación española.</p>
        
        <p><strong>USO CONTINUADO:</strong> El uso continuado después de los cambios constituye aceptación de los nuevos términos.</p>`
      }
    ],
    acceptance: {
      title: 'DECLARACIÓN DE CONOCIMIENTO Y ACEPTACIÓN',
      items: [
        'He leído, comprendido y acepto todos los términos descritos anteriormente',
        'Entiendo que este es un servicio educativo y no constituye asesoramiento de inversiones',
        'Reconozco los riesgos inherentes a las inversiones financieras',
        'Asumo total responsabilidad por mis decisiones de inversión',
        'Soy consciente de mis derechos bajo la legislación española',
        'Tengo capacidad legal para aceptar estos términos'
      ],
      footer: 'Si no está de acuerdo con cualquier parte de estos términos, no debe utilizar nuestra plataforma.'
    }
  }
};

// Mapeamento de países para termos específicos
const COUNTRY_TERMS_MAP: { [key: string]: TermsAndConditions } = {
  'BR': BRAZIL_TERMS,
  'US': USA_TERMS,
  'ES': SPAIN_TERMS,
  // Países lusófonos usam termos do Brasil
  'PT': BRAZIL_TERMS,
  'AO': BRAZIL_TERMS,
  'MZ': BRAZIL_TERMS,
  'CV': BRAZIL_TERMS,
  'GW': BRAZIL_TERMS,
  'ST': BRAZIL_TERMS,
  'TL': BRAZIL_TERMS,
  'MO': BRAZIL_TERMS,
  // Países hispânicos usam termos da Espanha
  'MX': SPAIN_TERMS,
  'AR': SPAIN_TERMS,
  'CO': SPAIN_TERMS,
  'PE': SPAIN_TERMS,
  'VE': SPAIN_TERMS,
  'CL': SPAIN_TERMS,
  'EC': SPAIN_TERMS,
  'GT': SPAIN_TERMS,
  'CU': SPAIN_TERMS,
  'BO': SPAIN_TERMS,
  'DO': SPAIN_TERMS,
  'HN': SPAIN_TERMS,
  'PY': SPAIN_TERMS,
  'SV': SPAIN_TERMS,
  'NI': SPAIN_TERMS,
  'CR': SPAIN_TERMS,
  'PA': SPAIN_TERMS,
  'UY': SPAIN_TERMS,
  'GQ': SPAIN_TERMS,
  // Países anglófonos usam termos dos EUA
  'GB': USA_TERMS,
  'CA': USA_TERMS,
  'AU': USA_TERMS,
  'NZ': USA_TERMS,
  'IE': USA_TERMS,
  'ZA': USA_TERMS,
  'IN': USA_TERMS,
  'SG': USA_TERMS,
  'MY': USA_TERMS,
  'PH': USA_TERMS,
  'NG': USA_TERMS,
  'KE': USA_TERMS,
  'GH': USA_TERMS,
  'UG': USA_TERMS,
  'TZ': USA_TERMS,
  'ZW': USA_TERMS,
  'BW': USA_TERMS,
  'MW': USA_TERMS,
  'ZM': USA_TERMS,
  'MT': USA_TERMS,
  'CY': USA_TERMS,
  'JM': USA_TERMS,
  'TT': USA_TERMS,
  'BB': USA_TERMS,
  'BS': USA_TERMS,
  'BZ': USA_TERMS,
  'GY': USA_TERMS,
  'SR': USA_TERMS,
  'FJ': USA_TERMS,
  'PG': USA_TERMS,
  'VU': USA_TERMS,
  'SB': USA_TERMS,
  'WS': USA_TERMS,
  'TO': USA_TERMS,
  'KI': USA_TERMS,
  'NR': USA_TERMS,
  'TV': USA_TERMS,
  'PW': USA_TERMS,
  'MH': USA_TERMS,
  'FM': USA_TERMS,
  'LR': USA_TERMS,
  'SL': USA_TERMS,
  'GM': USA_TERMS
};

class TermsAndConditionsService {
  private cachedCountry: string | null = null;

  /**
   * Obtém os termos e condições baseados no país do usuário ou idioma específico
   */
  async getTermsForUserCountry(targetLanguage?: Language): Promise<TermsAndConditions> {
    try {
      // Se um idioma específico foi fornecido, usar ele primeiro
      if (targetLanguage) {
        let terms: TermsAndConditions;
        
        switch (targetLanguage) {
          case 'pt':
            terms = BRAZIL_TERMS;
            break;
          case 'en':
            terms = USA_TERMS;
            break;
          case 'es':
            terms = SPAIN_TERMS;
            break;
          default:
            terms = USA_TERMS;
        }
        
                return terms;
      }

      // Verificar se há país detectado no cache
      let detectedCountry = this.cachedCountry;
      
      if (!detectedCountry) {
        // Buscar país detectado pelo serviço de geolocalização
        detectedCountry = localStorage.getItem('detected-country');
        
        if (detectedCountry) {
          this.cachedCountry = detectedCountry;
        }
      }

      // Se não encontrou país detectado, tentar detectar agora
      if (!detectedCountry) {
        const { geoLocationService } = await import('@/services/geoLocationService');
        await geoLocationService.detectLanguageFromIP();
        detectedCountry = localStorage.getItem('detected-country');
        
        if (detectedCountry) {
          this.cachedCountry = detectedCountry;
        }
      }

      
      // Retornar termos específicos do país ou padrão (EUA)
      const terms = detectedCountry ? 
        COUNTRY_TERMS_MAP[detectedCountry.toUpperCase()] || USA_TERMS : 
        USA_TERMS;

            
      return terms;

    } catch (error) {
      console.error('🏛️ [TermsService] Erro ao obter termos:', error);
      // Fallback para termos dos EUA em caso de erro
      return USA_TERMS;
    }
  }

  /**
   * Obtém termos específicos de um país
   */
  getTermsForCountry(countryCode: string): TermsAndConditions {
    return COUNTRY_TERMS_MAP[countryCode.toUpperCase()] || USA_TERMS;
  }

  /**
   * Lista todos os países suportados
   */
  getSupportedCountries(): string[] {
    return Object.keys(COUNTRY_TERMS_MAP);
  }

  /**
   * Limpa o cache de país
   */
  clearCountryCache(): void {
    this.cachedCountry = null;
  }
}

export const termsAndConditionsService = new TermsAndConditionsService();
export default termsAndConditionsService; 