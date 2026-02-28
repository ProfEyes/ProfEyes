import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useLanguage, Language } from './LanguageContext';

// Tipos para representar um fuso horário
export interface TimeZone {
  id: string;
  name: string;
  offset: string;
  hasDST: boolean;
  dstStartMonth?: number; // Mês de início do horário de verão (0-11)
  dstEndMonth?: number;   // Mês de fim do horário de verão (0-11)
  // Nomes traduzidos para cada idioma
  nameTranslations?: {
    pt?: string;
    en?: string;
    es?: string;
  };
}

// Interface para o contexto
interface TimeZoneContextType {
  timeZone: TimeZone;
  setTimeZone: (tz: TimeZone) => void;
  availableTimeZones: TimeZone[];
  setAvailableTimeZones: (timeZones: TimeZone[]) => void;
  isDST: boolean;
  convertTimeToSelected: (timeStr: string | undefined) => string;
  adjustTime: (date: Date) => Date;
  isTimeZoneInDST: (tz: TimeZone) => boolean;
  getTimeZonesForLanguage: (language?: Language) => TimeZone[];
  getDefaultTimeZone: (language?: Language) => TimeZone;
}

// Criação do contexto
const TimeZoneContext = createContext<TimeZoneContextType | undefined>(undefined);

// Interface para props do provedor
interface TimeZoneProviderProps {
  children: ReactNode;
}

// Lista de fusos horários para o idioma português
const ptTimeZones: TimeZone[] = [
  { 
    id: 'america-brasilia', 
    name: 'Brasil - Brasília (GMT-3)', 
    offset: '-03:00', 
    hasDST: false, // ✅ Brasil não tem horário de verão desde 2019
    nameTranslations: {
      pt: 'Brasil - Brasília (GMT-3)',
      en: 'Brazil - Brasília (GMT-3)',
      es: 'Brasil - Brasilia (GMT-3)'
    }
  },
  { 
    id: 'america-manaus', 
    name: 'Brasil - Manaus (GMT-4)', 
    offset: '-04:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Brasil - Manaus (GMT-4)',
      en: 'Brazil - Manaus (GMT-4)',
      es: 'Brasil - Manaos (GMT-4)'
    }
  },
  { 
    id: 'america-rio_branco', 
    name: 'Brasil - Rio Branco (GMT-5)', 
    offset: '-05:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Brasil - Rio Branco (GMT-5)',
      en: 'Brazil - Rio Branco (GMT-5)',
      es: 'Brasil - Rio Branco (GMT-5)'
    }
  },
  { 
    id: 'europe-lisbon', 
    name: 'Portugal - Lisboa (GMT+1)', 
    offset: '+01:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Portugal - Lisboa (GMT+1)',
      en: 'Portugal - Lisbon (GMT+1)',
      es: 'Portugal - Lisboa (GMT+1)'
    }
  },
  { 
    id: 'atlantic-azores', 
    name: 'Portugal - Açores (GMT+0)', 
    offset: '+00:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Portugal - Açores (GMT+0)',
      en: 'Portugal - Azores (GMT+0)',
      es: 'Portugal - Azores (GMT+0)'
    }
  },
  { 
    id: 'africa-luanda', 
    name: 'Angola - Luanda (GMT+1)', 
    offset: '+01:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Angola - Luanda (GMT+1)',
      en: 'Angola - Luanda (GMT+1)',
      es: 'Angola - Luanda (GMT+1)'
    }
  },
  { 
    id: 'africa-maputo', 
    name: 'Moçambique - Maputo (GMT+2)', 
    offset: '+02:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Moçambique - Maputo (GMT+2)',
      en: 'Mozambique - Maputo (GMT+2)',
      es: 'Mozambique - Maputo (GMT+2)'
    }
  },
  { 
    id: 'africa-cape_verde', 
    name: 'Cabo Verde - Praia (GMT-1)', 
    offset: '-01:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Cabo Verde - Praia (GMT-1)',
      en: 'Cape Verde - Praia (GMT-1)',
      es: 'Cabo Verde - Praia (GMT-1)'
    }
  },
  { 
    id: 'africa-bissau', 
    name: 'Guiné-Bissau - Bissau (GMT+0)', 
    offset: '+00:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Guiné-Bissau - Bissau (GMT+0)',
      en: 'Guinea-Bissau - Bissau (GMT+0)',
      es: 'Guinea-Bisáu - Bisáu (GMT+0)'
    }
  },
  { 
    id: 'africa-sao_tome', 
    name: 'São Tomé e Príncipe - São Tomé (GMT+0)', 
    offset: '+00:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'São Tomé e Príncipe - São Tomé (GMT+0)',
      en: 'São Tomé and Príncipe - São Tomé (GMT+0)',
      es: 'Santo Tomé y Príncipe - Santo Tomé (GMT+0)'
    }
  },
  { 
    id: 'asia-macau', 
    name: 'China - Macau (GMT+8)', 
    offset: '+08:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'China - Macau (GMT+8)',
      en: 'China - Macau (GMT+8)',
      es: 'China - Macao (GMT+8)'
    }
  },
  { 
    id: 'asia-dili', 
    name: 'Timor-Leste - Díli (GMT+9)', 
    offset: '+09:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Timor-Leste - Díli (GMT+9)',
      en: 'East Timor - Dili (GMT+9)',
      es: 'Timor Oriental - Dili (GMT+9)'
    }
  },
];

// Lista de fusos horários para o idioma inglês
const enTimeZones: TimeZone[] = [
  { 
    id: 'america-new_york', 
    name: 'USA - New York (GMT-4)', 
    offset: '-04:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'EUA - Nova Iorque (GMT-4)',
      en: 'USA - New York (GMT-4)',
      es: 'EE.UU. - Nueva York (GMT-4)'
    }
  },
  { 
    id: 'america-chicago', 
    name: 'USA - Chicago (GMT-5)', 
    offset: '-05:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'EUA - Chicago (GMT-5)',
      en: 'USA - Chicago (GMT-5)',
      es: 'EE.UU. - Chicago (GMT-5)'
    }
  },
  { 
    id: 'america-denver', 
    name: 'USA - Denver (GMT-6)', 
    offset: '-06:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'EUA - Denver (GMT-6)',
      en: 'USA - Denver (GMT-6)',
      es: 'EE.UU. - Denver (GMT-6)'
    }
  },
  { 
    id: 'america-los_angeles', 
    name: 'USA - Los Angeles (GMT-7)', 
    offset: '-07:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'EUA - Los Angeles (GMT-7)',
      en: 'USA - Los Angeles (GMT-7)',
      es: 'EE.UU. - Los Ángeles (GMT-7)'
    }
  },
  { 
    id: 'america-anchorage', 
    name: 'USA - Anchorage (GMT-8)', 
    offset: '-08:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'EUA - Anchorage (GMT-8)',
      en: 'USA - Anchorage (GMT-8)',
      es: 'EE.UU. - Anchorage (GMT-8)'
    }
  },
  { 
    id: 'america-honolulu', 
    name: 'USA - Honolulu (GMT-10)', 
    offset: '-10:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'EUA - Honolulu (GMT-10)',
      en: 'USA - Honolulu (GMT-10)',
      es: 'EE.UU. - Honolulu (GMT-10)'
    }
  },
  { 
    id: 'america-toronto', 
    name: 'Canada - Toronto (GMT-4)', 
    offset: '-04:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Canadá - Toronto (GMT-4)',
      en: 'Canada - Toronto (GMT-4)',
      es: 'Canadá - Toronto (GMT-4)'
    }
  },
  { 
    id: 'america-vancouver', 
    name: 'Canada - Vancouver (GMT-7)', 
    offset: '-07:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Canadá - Vancouver (GMT-7)',
      en: 'Canada - Vancouver (GMT-7)',
      es: 'Canadá - Vancouver (GMT-7)'
    }
  },
  { 
    id: 'america-edmonton', 
    name: 'Canada - Edmonton (GMT-6)', 
    offset: '-06:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Canadá - Edmonton (GMT-6)',
      en: 'Canada - Edmonton (GMT-6)',
      es: 'Canadá - Edmonton (GMT-6)'
    }
  },
  { 
    id: 'europe-london', 
    name: 'UK - London (GMT+0)', 
    offset: '+00:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Reino Unido - Londres (GMT+0)',
      en: 'UK - London (GMT+0)',
      es: 'Reino Unido - Londres (GMT+0)'
    }
  },
  { 
    id: 'europe-dublin', 
    name: 'Ireland - Dublin (GMT+1)', 
    offset: '+01:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Irlanda - Dublin (GMT+1)',
      en: 'Ireland - Dublin (GMT+1)',
      es: 'Irlanda - Dublín (GMT+1)'
    }
  },
  { 
    id: 'australia-sydney', 
    name: 'Australia - Sydney (GMT+10)', 
    offset: '+10:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Austrália - Sydney (GMT+10)',
      en: 'Australia - Sydney (GMT+10)',
      es: 'Australia - Sídney (GMT+10)'
    }
  },
  { 
    id: 'australia-perth', 
    name: 'Australia - Perth (GMT+8)', 
    offset: '+08:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Austrália - Perth (GMT+8)',
      en: 'Australia - Perth (GMT+8)',
      es: 'Australia - Perth (GMT+8)'
    }
  },
  { 
    id: 'pacific-auckland', 
    name: 'New Zealand - Auckland (GMT+12)', 
    offset: '+12:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Nova Zelândia - Auckland (GMT+12)',
      en: 'New Zealand - Auckland (GMT+12)',
      es: 'Nueva Zelanda - Auckland (GMT+12)'
    }
  },
  { 
    id: 'europe-malta', 
    name: 'Malta - Valletta (GMT+2)', 
    offset: '+02:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Malta - Valeta (GMT+2)',
      en: 'Malta - Valletta (GMT+2)',
      es: 'Malta - La Valeta (GMT+2)'
    }
  },
  { 
    id: 'asia-singapore', 
    name: 'Singapore - Singapore (GMT+8)', 
    offset: '+08:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Singapura - Singapura (GMT+8)',
      en: 'Singapore - Singapore (GMT+8)',
      es: 'Singapur - Singapur (GMT+8)'
    }
  },
  { 
    id: 'africa-johannesburg', 
    name: 'South Africa - Johannesburg (GMT+2)', 
    offset: '+02:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'África do Sul - Joanesburgo (GMT+2)',
      en: 'South Africa - Johannesburg (GMT+2)',
      es: 'Sudáfrica - Johannesburgo (GMT+2)'
    }
  },
  { 
    id: 'asia-manila', 
    name: 'Philippines - Manila (GMT+8)', 
    offset: '+08:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Filipinas - Manila (GMT+8)',
      en: 'Philippines - Manila (GMT+8)',
      es: 'Filipinas - Manila (GMT+8)'
    }
  },
  { 
    id: 'caribbean-jamaica', 
    name: 'Jamaica - Kingston (GMT-5)', 
    offset: '-05:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Jamaica - Kingston (GMT-5)',
      en: 'Jamaica - Kingston (GMT-5)',
      es: 'Jamaica - Kingston (GMT-5)'
    }
  },
  { 
    id: 'caribbean-barbados', 
    name: 'Barbados - Bridgetown (GMT-4)', 
    offset: '-04:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Barbados - Bridgetown (GMT-4)',
      en: 'Barbados - Bridgetown (GMT-4)',
      es: 'Barbados - Bridgetown (GMT-4)'
    }
  },
  { 
    id: 'africa-accra', 
    name: 'Ghana - Accra (GMT+0)', 
    offset: '+00:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Gana - Acra (GMT+0)',
      en: 'Ghana - Accra (GMT+0)',
      es: 'Ghana - Accra (GMT+0)'
    }
  },
  { 
    id: 'africa-lagos', 
    name: 'Nigeria - Lagos (GMT+1)', 
    offset: '+01:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Nigéria - Lagos (GMT+1)',
      en: 'Nigeria - Lagos (GMT+1)',
      es: 'Nigeria - Lagos (GMT+1)'
    }
  },
];

// Lista de fusos horários para o idioma espanhol
const esTimeZones: TimeZone[] = [
  { 
    id: 'europe-madrid', 
    name: 'España - Madrid (GMT+2)', 
    offset: '+02:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Espanha - Madrid (GMT+2)',
      en: 'Spain - Madrid (GMT+2)',
      es: 'España - Madrid (GMT+2)'
    }
  },
  { 
    id: 'europe-canary', 
    name: 'España - Islas Canarias (GMT+0)', 
    offset: '+00:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Espanha - Ilhas Canárias (GMT+0)',
      en: 'Spain - Canary Islands (GMT+0)',
      es: 'España - Islas Canarias (GMT+0)'
    }
  },
  { 
    id: 'africa-ceuta', 
    name: 'España - Ceuta y Melilla (GMT+2)', 
    offset: '+02:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Espanha - Ceuta e Melilla (GMT+2)',
      en: 'Spain - Ceuta and Melilla (GMT+2)',
      es: 'España - Ceuta y Melilla (GMT+2)'
    }
  },
  { 
    id: 'america-buenos_aires', 
    name: 'Argentina - Buenos Aires (GMT-3)', 
    offset: '-03:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Argentina - Buenos Aires (GMT-3)',
      en: 'Argentina - Buenos Aires (GMT-3)',
      es: 'Argentina - Buenos Aires (GMT-3)'
    }
  },
  { 
    id: 'america-mexico_city', 
    name: 'México - Ciudad de México (GMT-5)', 
    offset: '-05:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'México - Cidade do México (GMT-5)',
      en: 'Mexico - Mexico City (GMT-5)',
      es: 'México - Ciudad de México (GMT-5)'
    }
  },
  { 
    id: 'america-santiago', 
    name: 'Chile - Santiago (GMT-4)', 
    offset: '-04:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Chile - Santiago (GMT-4)',
      en: 'Chile - Santiago (GMT-4)',
      es: 'Chile - Santiago (GMT-4)'
    }
  },
  { 
    id: 'america-bogota', 
    name: 'Colombia - Bogotá (GMT-5)', 
    offset: '-05:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Colômbia - Bogotá (GMT-5)',
      en: 'Colombia - Bogotá (GMT-5)',
      es: 'Colômbia - Bogotá (GMT-5)'
    }
  },
  { 
    id: 'america-lima', 
    name: 'Perú - Lima (GMT-5)', 
    offset: '-05:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Perú - Lima (GMT-5)',
      en: 'Perú - Lima (GMT-5)',
      es: 'Perú - Lima (GMT-5)'
    }
  },
  { 
    id: 'america-caracas', 
    name: 'Venezuela - Caracas (GMT-4)', 
    offset: '-04:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Venezuela - Caracas (GMT-4)',
      en: 'Venezuela - Caracas (GMT-4)',
      es: 'Venezuela - Caracas (GMT-4)'
    }
  },
  { 
    id: 'america-quito', 
    name: 'Ecuador - Quito (GMT-5)', 
    offset: '-05:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Equador - Quito (GMT-5)',
      en: 'Ecuador - Quito (GMT-5)',
      es: 'Equador - Quito (GMT-5)'
    }
  },
  { 
    id: 'america-asuncion', 
    name: 'Paraguay - Asunción (GMT-4)', 
    offset: '-04:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Paraguai - Assunção (GMT-4)',
      en: 'Paraguay - Asunción (GMT-4)',
      es: 'Paraguay - Asunción (GMT-4)'
    }
  },
  { 
    id: 'america-la_paz', 
    name: 'Bolivia - La Paz (GMT-4)', 
    offset: '-04:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Bolívia - La Paz (GMT-4)',
      en: 'Bolivia - La Paz (GMT-4)',
      es: 'Bolívia - La Paz (GMT-4)'
    }
  },
  { 
    id: 'america-montevideo', 
    name: 'Uruguay - Montevideo (GMT-3)', 
    offset: '-03:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Uruguai - Montevidéu (GMT-3)',
      en: 'Uruguay - Montevideo (GMT-3)',
      es: 'Uruguay - Montevideo (GMT-3)'
    }
  },
  { 
    id: 'america-guatemala', 
    name: 'Guatemala - Ciudad de Guatemala (GMT-6)', 
    offset: '-06:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Guatemala - Cidade de Guatemala (GMT-6)',
      en: 'Guatemala - Guatemala City (GMT-6)',
      es: 'Guatemala - Ciudad de Guatemala (GMT-6)'
    }
  },
  { 
    id: 'america-panama', 
    name: 'Panamá - Ciudad de Panamá (GMT-5)', 
    offset: '-05:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Panamá - Cidade do Panamá (GMT-5)',
      en: 'Panama - Panama City (GMT-5)',
      es: 'Panamá - Ciudad de Panamá (GMT-5)'
    }
  },
  { 
    id: 'america-el_salvador', 
    name: 'El Salvador - San Salvador (GMT-6)', 
    offset: '-06:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'El Salvador - San Salvador (GMT-6)',
      en: 'El Salvador - San Salvador (GMT-6)',
      es: 'El Salvador - San Salvador (GMT-6)'
    }
  },
  { 
    id: 'america-managua', 
    name: 'Nicaragua - Managua (GMT-6)', 
    offset: '-06:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Nicarágua - Managua (GMT-6)',
      en: 'Nicaragua - Managua (GMT-6)',
      es: 'Nicaragua - Managua (GMT-6)'
    }
  },
  { 
    id: 'america-tegucigalpa', 
    name: 'Honduras - Tegucigalpa (GMT-6)', 
    offset: '-06:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Honduras - Tegucigalpa (GMT-6)',
      en: 'Honduras - Tegucigalpa (GMT-6)',
      es: 'Honduras - Tegucigalpa (GMT-6)'
    }
  },
  { 
    id: 'america-san_jose', 
    name: 'Costa Rica - San José (GMT-6)', 
    offset: '-06:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Costa Rica - San José (GMT-6)',
      en: 'Costa Rica - San José (GMT-6)',
      es: 'Costa Rica - San José (GMT-6)'
    }
  },
  { 
    id: 'america-havana', 
    name: 'Cuba - La Habana (GMT-4)', 
    offset: '-04:00', 
    hasDST: true,
    nameTranslations: {
      pt: 'Cuba - La Habana (GMT-4)',
      en: 'Cuba - La Habana (GMT-4)',
      es: 'Cuba - La Habana (GMT-4)'
    }
  },
  { 
    id: 'america-santo_domingo', 
    name: 'República Dominicana - Santo Domingo (GMT-4)', 
    offset: '-04:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'República Dominicana - Santo Domingo (GMT-4)',
      en: 'Dominican Republic - Santo Domingo (GMT-4)',
      es: 'República Dominicana - Santo Domingo (GMT-4)'
    }
  },
  { 
    id: 'america-puerto_rico', 
    name: 'Puerto Rico - San Juan (GMT-4)', 
    offset: '-04:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Puerto Rico - San Juan (GMT-4)',
      en: 'Puerto Rico - San Juan (GMT-4)',
      es: 'Puerto Rico - San Juan (GMT-4)'
    }
  },
  { 
    id: 'africa-malabo', 
    name: 'Guinea Ecuatorial - Malabo (GMT+1)', 
    offset: '+01:00', 
    hasDST: false,
    nameTranslations: {
      pt: 'Guiné Equatorial - Malabo (GMT+1)',
      en: 'Equatorial Guinea - Malabo (GMT+1)',
      es: 'Guinea Ecuatorial - Malabo (GMT+1)'
    }
  },
];

export const TimeZoneProvider = ({ children }: TimeZoneProviderProps) => {
  const { language } = useLanguage();
  
  // Determinar fusos horários disponíveis com base no idioma
  const getTimeZonesForLanguage = useCallback((overrideLanguage?: Language): TimeZone[] => {
    const langToUse = overrideLanguage || language;

    let timezones;
    switch (langToUse) {
      case 'pt':
        timezones = ptTimeZones;
        break;
      case 'es':
        timezones = esTimeZones;
        break;
      case 'en':
      default:
        timezones = enTimeZones;
        break;
    }

    // Atualizar os nomes dos fusos horários de acordo com o idioma atual
    return timezones.map(tz => {
      if (tz.nameTranslations && tz.nameTranslations[langToUse]) {
        return {
          ...tz,
          name: tz.nameTranslations[langToUse] || tz.name
        };
      }
      return tz;
    });
  }, [language]);

  // Obter fuso horário padrão com base no idioma
  const getDefaultTimeZone = useCallback((overrideLanguage?: Language): TimeZone => {
    const langToUse = overrideLanguage || language;
    const storedTimeZoneId = localStorage.getItem('timeZone');
    const availableTimeZonesLocal = getTimeZonesForLanguage(langToUse);

    if (storedTimeZoneId) {
      const storedTimeZone = availableTimeZonesLocal.find(tz => tz.id === storedTimeZoneId);
      if (storedTimeZone) return storedTimeZone;
    }

    // Valores padrão baseados no idioma
    switch (langToUse) {
      case 'pt':
        return availableTimeZonesLocal.find(tz => tz.id === 'america-brasilia') || availableTimeZonesLocal[0];
      case 'es':
        return availableTimeZonesLocal.find(tz => tz.id === 'europe-madrid') || availableTimeZonesLocal[0];
      case 'en':
      default:
        return availableTimeZonesLocal.find(tz => tz.id === 'america-new_york') || availableTimeZonesLocal[0];
    }
  }, [language, getTimeZonesForLanguage]);

  // Verificar se é horário de verão
  const checkIsDST = (): boolean => {
    const today = new Date();
    const jan = new Date(today.getFullYear(), 0, 1);
    const jul = new Date(today.getFullYear(), 6, 1);
    
    return today.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  };

  // ✅ FUNÇÃO MELHORADA: Detecta DST automaticamente usando API nativa do navegador
  const isTimeZoneInDST = useCallback((tz: TimeZone): boolean => {
    if (!tz.hasDST) return false;
    
    try {
      // Mapear ID do timezone para o formato IANA
      const ianaTimezone = tz.id.replace(/-/g, '/').split('/').map((part, index) => {
        if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1);
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join('/');
      
      const now = new Date();
      
      // Criar duas datas: uma em janeiro (inverno no hemisfério norte) e uma em julho (verão no hemisfério norte)
      const january = new Date(now.getFullYear(), 0, 1);
      const july = new Date(now.getFullYear(), 6, 1);
      
      // Obter o offset UTC para cada data neste timezone
      const getOffset = (date: Date, timezone: string): number => {
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset'
          });
          
          const parts = formatter.formatToParts(date);
          const offsetPart = parts.find(part => part.type === 'timeZoneName');
          
          if (offsetPart && offsetPart.value.includes('GMT')) {
            const offset = offsetPart.value.replace('GMT', '').trim();
            if (offset === '') return 0;
            
            const sign = offset[0] === '-' ? -1 : 1;
            const [hours, minutes] = offset.slice(1).split(':').map(Number);
            return sign * (hours * 60 + (minutes || 0));
          }
          return 0;
        } catch {
          return 0;
        }
      };
      
      const janOffset = getOffset(january, ianaTimezone);
      const julOffset = getOffset(july, ianaTimezone);
      const currentOffset = getOffset(now, ianaTimezone);
      
      // Se os offsets de janeiro e julho são diferentes, há DST
      if (janOffset !== julOffset) {
        // ✅ CORREÇÃO: Determinar hemisfério pela ESTAÇÃO
        // Janeiro = inverno no Norte, verão no Sul
        // Julho = verão no Norte, inverno no Sul
        // 
        // Horário de verão sempre tem offset MAIOR (mais próximo de UTC ou mais positivo)
        // 
        // Se julho > janeiro → Hemisfério Norte (DST no verão = julho)
        // Se janeiro > julho → Hemisfério Sul (DST no verão = janeiro)
        
        let dstOffset: number;
        
        if (julOffset > janOffset) {
          // Hemisfério Norte: DST acontece no verão (julho)
          dstOffset = julOffset;
        } else {
          // Hemisfério Sul: DST acontece no verão (janeiro)
          dstOffset = janOffset;
        }
        
        return currentOffset === dstOffset;
      }
      
      return false;
    } catch (error) {
      console.warn(`Erro ao detectar DST para ${tz.id}:`, error);
      
      // Fallback: lógica manual baseada em mês (menos precisa)
      const now = new Date();
      const currentMonth = now.getMonth();
      
      // Hemisfério Norte (DST geralmente de março a novembro)
      if (tz.offset.startsWith('+')) {
        const startMonth = tz.dstStartMonth !== undefined ? tz.dstStartMonth : 2;
        const endMonth = tz.dstEndMonth !== undefined ? tz.dstEndMonth : 10;
        
        if (startMonth < endMonth) {
          return currentMonth >= startMonth && currentMonth < endMonth;
        } else {
          return currentMonth >= startMonth || currentMonth < endMonth;
        }
      } 
      // Hemisfério Sul (DST geralmente de outubro a março)
      else {
        const startMonth = tz.dstStartMonth !== undefined ? tz.dstStartMonth : 9;
        const endMonth = tz.dstEndMonth !== undefined ? tz.dstEndMonth : 2;
        
        if (startMonth > endMonth) {
          return currentMonth >= startMonth || currentMonth < endMonth;
        } else {
          return currentMonth >= startMonth && currentMonth < endMonth;
        }
      }
    }
  }, []);

  // Estado para armazenar o fuso horário atual
  const [timeZone, setTimeZone] = useState<TimeZone>(getDefaultTimeZone());
  const [availableTimeZones, setAvailableTimeZones] = useState<TimeZone[]>(getTimeZonesForLanguage());
  const [isDST, setIsDST] = useState<boolean>(checkIsDST());

  // Função para converter horário no formato HH:MM para o fuso selecionado
  const convertTimeToSelected = useCallback((timeStr: string | undefined): string => {
    if (!timeStr) return '';
    
    try {
      // Verificar se o formato é válido (HH:MM)
      if (!/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
      
      // Extrair horas e minutos
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      // Verificar se os valores são válidos
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return timeStr;
      }
      
      // Criar data base (hoje às HH:MM no fuso de Brasília que é o padrão dos sinais)
      const baseDate = new Date();
      baseDate.setHours(hours, minutes, 0, 0);
      
      // Obter o offset do fuso base (Brasília/Brasil)
      const baseOffset = '-03:00'; // Fuso de Brasília
      const baseOffsetHours = parseInt(baseOffset.substring(0, 3));
      const baseOffsetMinutes = parseInt(baseOffset.substring(4, 6)) * (baseOffset.charAt(0) === '-' ? -1 : 1);
      
      // Obter o offset do fuso selecionado
      const targetOffset = timeZone.offset;
      const targetOffsetHours = parseInt(targetOffset.substring(0, 3));
      const targetOffsetMinutes = parseInt(targetOffset.substring(4, 6)) * (targetOffset.charAt(0) === '-' ? -1 : 1);
      
      // Calcular a diferença de offset em minutos
      const offsetDiffMinutes = 
        (targetOffsetHours * 60 + targetOffsetMinutes) - 
        (baseOffsetHours * 60 + baseOffsetMinutes);
      
      // Aplicar a diferença à data base
      const adjustedDate = new Date(baseDate.getTime() + offsetDiffMinutes * 60000);
      
      // Formatar o resultado
      const adjustedHours = adjustedDate.getHours().toString().padStart(2, '0');
      const adjustedMinutes = adjustedDate.getMinutes().toString().padStart(2, '0');
      
      return `${adjustedHours}:${adjustedMinutes}`;
    } catch (error) {
      console.error('Erro ao converter horário para o fuso selecionado:', error);
      return timeStr;
    }
  }, [timeZone]);

  // Função para ajustar uma data completa para o fuso selecionado
  const adjustTime = useCallback((date: Date): Date => {
    try {
      // Obter o offset do fuso base (Brasília/Brasil)
      const baseOffset = '-03:00'; // Fuso de Brasília
      const baseOffsetHours = parseInt(baseOffset.substring(0, 3));
      const baseOffsetMinutes = parseInt(baseOffset.substring(4, 6)) * (baseOffset.charAt(0) === '-' ? -1 : 1);
      
      // Obter o offset do fuso selecionado
      const targetOffset = timeZone.offset;
      const targetOffsetHours = parseInt(targetOffset.substring(0, 3));
      const targetOffsetMinutes = parseInt(targetOffset.substring(4, 6)) * (targetOffset.charAt(0) === '-' ? -1 : 1);
      
      // Calcular a diferença de offset em minutos
      const offsetDiffMinutes = 
        (targetOffsetHours * 60 + targetOffsetMinutes) - 
        (baseOffsetHours * 60 + baseOffsetMinutes);
      
      // Aplicar a diferença à data
      return new Date(date.getTime() + offsetDiffMinutes * 60000);
    } catch (error) {
      console.error('Erro ao ajustar data para o fuso selecionado:', error);
      return date;
    }
  }, [timeZone]);

  // Atualizar o fuso horário no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('timeZone', timeZone.id);
  }, [timeZone]);

  // Atualizar fusos disponíveis quando o idioma mudar
  useEffect(() => {
    setAvailableTimeZones(getTimeZonesForLanguage());
    
    // Verificar se o fuso atual está disponível no novo idioma
    const newTimeZones = getTimeZonesForLanguage();
    const currentTzExists = newTimeZones.some(tz => tz.id === timeZone.id);
    
    // Se não estiver disponível, mudar para o padrão do novo idioma
    if (!currentTzExists) {
      setTimeZone(newTimeZones[0]);
    }
  }, [language]);

  // Verificar horário de verão periodicamente
  useEffect(() => {
    setIsDST(checkIsDST());
    
    // Verificar duas vezes ao dia
    const interval = setInterval(() => {
      setIsDST(checkIsDST());
    }, 12 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const providerValue = useMemo(() => ({
    timeZone,
    setTimeZone,
    availableTimeZones,
    setAvailableTimeZones,
    isDST,
    convertTimeToSelected,
    adjustTime,
    isTimeZoneInDST,
    getTimeZonesForLanguage,
    getDefaultTimeZone
  }), [
    timeZone,
    setTimeZone,
    availableTimeZones,
    setAvailableTimeZones,
    isDST,
    convertTimeToSelected,
    adjustTime,
    isTimeZoneInDST,
    getTimeZonesForLanguage,
    getDefaultTimeZone
  ]);

  return (
    <TimeZoneContext.Provider value={providerValue}>
      {children}
    </TimeZoneContext.Provider>
  );
};

// Hook para usar o contexto
export const useTimeZone = (): TimeZoneContextType => {
  const context = useContext(TimeZoneContext);
  
  if (context === undefined) {
    throw new Error('useTimeZone must be used within a TimeZoneProvider');
  }
  
  return context;
}; 