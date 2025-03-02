import { supabase } from "@/integrations/supabase/client";
import { Howl } from 'howler';

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
} 