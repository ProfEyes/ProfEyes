import { Language } from '@/contexts/LanguageContext';

interface IPLocationResponse {
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  timezone?: string;
  languages?: string[];
}

interface CountryLanguageMap {
  [key: string]: Language;
}

// Mapeamento de países para idiomas
const COUNTRY_LANGUAGE_MAP: CountryLanguageMap = {
  // Países que falam português
  'BR': 'pt', // Brasil
  'PT': 'pt', // Portugal
  'AO': 'pt', // Angola
  'MZ': 'pt', // Moçambique
  'CV': 'pt', // Cabo Verde
  'GW': 'pt', // Guiné-Bissau
  'ST': 'pt', // São Tomé e Príncipe
  'TL': 'pt', // Timor-Leste
  'MO': 'pt', // Macau

  // Países que falam espanhol
  'ES': 'es', // Espanha
  'MX': 'es', // México
  'AR': 'es', // Argentina
  'CO': 'es', // Colômbia
  'PE': 'es', // Peru
  'VE': 'es', // Venezuela
  'CL': 'es', // Chile
  'EC': 'es', // Equador
  'GT': 'es', // Guatemala
  'CU': 'es', // Cuba
  'BO': 'es', // Bolívia
  'DO': 'es', // República Dominicana
  'HN': 'es', // Honduras
  'PY': 'es', // Paraguai
  'SV': 'es', // El Salvador
  'NI': 'es', // Nicarágua
  'CR': 'es', // Costa Rica
  'PA': 'es', // Panamá
  'UY': 'es', // Uruguai
  'GQ': 'es', // Guiné Equatorial

  // Países que falam inglês (principais)
  'US': 'en', // Estados Unidos
  'GB': 'en', // Reino Unido
  'CA': 'en', // Canadá
  'AU': 'en', // Austrália
  'NZ': 'en', // Nova Zelândia
  'IE': 'en', // Irlanda
  'ZA': 'en', // África do Sul
  'IN': 'en', // Índia
  'SG': 'en', // Singapura
  'MY': 'en', // Malásia
  'PH': 'en', // Filipinas
  'NG': 'en', // Nigéria
  'KE': 'en', // Quênia
  'GH': 'en', // Gana
  'UG': 'en', // Uganda
  'TZ': 'en', // Tanzânia
  'ZW': 'en', // Zimbábue
  'BW': 'en', // Botsuana
  'MW': 'en', // Malawi
  'ZM': 'en', // Zâmbia
  'MT': 'en', // Malta
  'CY': 'en', // Chipre
  'JM': 'en', // Jamaica
  'TT': 'en', // Trinidad e Tobago
  'BB': 'en', // Barbados
  'BS': 'en', // Bahamas
  'BZ': 'en', // Belize
  'GY': 'en', // Guiana
  'SR': 'en', // Suriname (também fala holandês, mas inglês é comum)
  'FJ': 'en', // Fiji
  'PG': 'en', // Papua Nova Guiné
  'VU': 'en', // Vanuatu
  'SB': 'en', // Ilhas Salomão
  'WS': 'en', // Samoa
  'TO': 'en', // Tonga
  'KI': 'en', // Kiribati
  'NR': 'en', // Nauru
  'TV': 'en', // Tuvalu
  'PW': 'en', // Palau
  'MH': 'en', // Ilhas Marshall
  'FM': 'en', // Micronésia
  'LR': 'en', // Libéria
  'SL': 'en', // Serra Leoa
  'GM': 'en', // Gâmbia
};

class GeoLocationService {
  private cachedLocation: IPLocationResponse | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Detecta o idioma baseado na localização do IP
   */
  async detectLanguageFromIP(): Promise<Language> {
    try {
      // Verificar se já temos um idioma salvo pelo usuário
      const savedLanguage = localStorage.getItem('app-language');
      if (savedLanguage && ['pt', 'en', 'es'].includes(savedLanguage)) {
        
        return savedLanguage as Language;
      }

      // Obter localização do IP
      const location = await this.getLocationFromIP();
      
      if (location?.country_code) {
        const detectedLanguage = COUNTRY_LANGUAGE_MAP[location.country_code.toUpperCase()];
        
        if (detectedLanguage) {
          
          
          // Salvar o idioma detectado
          localStorage.setItem('app-language', detectedLanguage);
          localStorage.setItem('language-detection-source', 'geolocation');
          localStorage.setItem('detected-country', location.country_code);
          
          return detectedLanguage;
        }
      }

      
      return 'en'; // Padrão para inglês se o país não estiver mapeado

    } catch (error) {
      console.error('🌍 [GeoLocation] Erro ao detectar idioma:', error);
      
      // Fallback para detecção do navegador
      const browserLanguage = this.detectLanguageFromBrowser();
      
      
      return browserLanguage;
    }
  }

  /**
   * Obter localização baseada no IP
   */
  private async getLocationFromIP(): Promise<IPLocationResponse | null> {
    try {
      // Verificar cache
      const now = Date.now();
      if (this.cachedLocation && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        
        return this.cachedLocation;
      }

      // Tentar múltiplos serviços de geolocalização
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json',
        'https://api.ipgeolocation.io/ipgeo?apiKey=free'
      ];

      for (const serviceUrl of services) {
        try {
          
          
          const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // Timeout de 5 segundos
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const data = await response.json();
            
            // Normalizar resposta dependendo do serviço
            const normalizedData = this.normalizeLocationData(data, serviceUrl);
            
            if (normalizedData?.country_code) {
              
              
              // Salvar no cache
              this.cachedLocation = normalizedData;
              this.cacheTimestamp = now;
              
              // Salvar no localStorage para persistência
              localStorage.setItem('ip-location-cache', JSON.stringify(normalizedData));
              localStorage.setItem('ip-location-timestamp', now.toString());
              
              return normalizedData;
            }
          }
        } catch (serviceError) {
          console.warn(`🌍 [GeoLocation] Falha no serviço ${serviceUrl}:`, serviceError);
          continue;
        }
      }

      // Se todos os serviços falharam, tentar usar cache local
      const cachedData = localStorage.getItem('ip-location-cache');
      const cachedTimestamp = localStorage.getItem('ip-location-timestamp');
      
      if (cachedData && cachedTimestamp) {
        const cacheAge = now - parseInt(cachedTimestamp);
        // Usar cache mesmo se antigo em caso de emergência (máximo 7 dias)
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
          
          return JSON.parse(cachedData);
        }
      }

      return null;

    } catch (error) {
      console.error('🌍 [GeoLocation] Erro geral ao obter localização:', error);
      return null;
    }
  }

  /**
   * Normaliza dados de diferentes APIs de geolocalização
   */
  private normalizeLocationData(data: Record<string, unknown>, serviceUrl: string): IPLocationResponse | null {
    try {
      let normalized: IPLocationResponse = {};

      if (serviceUrl.includes('ipapi.co')) {
        normalized = {
          country: data.country_name,
          country_code: data.country_code,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
          languages: data.languages?.split(',') || []
        };
      } else if (serviceUrl.includes('ip-api.com')) {
        normalized = {
          country: data.country,
          country_code: data.countryCode,
          region: data.regionName,
          city: data.city,
          timezone: data.timezone
        };
      } else if (serviceUrl.includes('ipinfo.io')) {
        normalized = {
          country: data.country,
          country_code: data.country,
          region: data.region,
          city: data.city,
          timezone: data.timezone
        };
      } else if (serviceUrl.includes('ipgeolocation.io')) {
        normalized = {
          country: data.country_name,
          country_code: data.country_code2,
          region: data.state_prov,
          city: data.city,
          timezone: data.time_zone?.name
        };
      }

      return normalized.country_code ? normalized : null;

    } catch (error) {
      console.error('🌍 [GeoLocation] Erro ao normalizar dados:', error);
      return null;
    }
  }

  /**
   * Detecta idioma do navegador como fallback
   */
  private detectLanguageFromBrowser(): Language {
    try {
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      
      if (browserLang === 'pt') return 'pt';
      if (browserLang === 'es') return 'es';
      if (browserLang === 'en') return 'en';
      
      // Para outros idiomas, usar inglês como padrão
      return 'en';
      
    } catch (error) {
      console.error('🌍 [GeoLocation] Erro ao detectar idioma do navegador:', error);
      return 'en';
    }
  }

  /**
   * Força nova detecção (limpa cache)
   */
  clearCache(): void {
    this.cachedLocation = null;
    this.cacheTimestamp = 0;
    localStorage.removeItem('ip-location-cache');
    localStorage.removeItem('ip-location-timestamp');
    localStorage.removeItem('language-detection-source');
    localStorage.removeItem('detected-country');
    
  }

  /**
   * Obter informações de detecção para debug
   */
  getDetectionInfo(): {
    source: string | null;
    country: string | null;
    language: string | null;
    cached: boolean;
  } {
    return {
      source: localStorage.getItem('language-detection-source'),
      country: localStorage.getItem('detected-country'),
      language: localStorage.getItem('app-language'),
      cached: !!this.cachedLocation
    };
  }
}

// Instância singleton
export const geoLocationService = new GeoLocationService();

// Função de conveniência para uso direto
export const detectLanguageFromLocation = () => geoLocationService.detectLanguageFromIP(); 