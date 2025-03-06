import { supabase } from "@/integrations/supabase/client";
import { getBinancePrice } from "./binanceApi";

export interface Portfolio {
  id: string;
  user_id: string;
  assets: PortfolioAsset[];
  total_value: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioAsset {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  total_value: number;
  profit_loss: number;
  profit_loss_percent: number;
}

export async function fetchPortfolio(userId: string): Promise<Portfolio | null> {
  try {
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!portfolio) return null;

    // Atualizar preços atuais
    const updatedAssets = await Promise.all(portfolio.assets.map(async (asset) => {
      try {
        const priceData = await getBinancePrice(asset.symbol);
        const currentPrice = parseFloat(priceData.price);

        const totalValue = asset.quantity * currentPrice;
        const profitLoss = totalValue - (asset.quantity * asset.average_price);
        const profitLossPercent = (profitLoss / (asset.quantity * asset.average_price)) * 100;

        return {
          ...asset,
          current_price: currentPrice,
          total_value: totalValue,
          profit_loss: profitLoss,
          profit_loss_percent: profitLossPercent
        };
      } catch (error) {
        console.error(`Erro ao atualizar preço para ${asset.symbol}:`, error);
        return asset;
      }
    }));

    const totalValue = updatedAssets.reduce((sum, asset) => sum + asset.total_value, 0);

    return {
      ...portfolio,
      assets: updatedAssets,
      total_value: totalValue
    };
  } catch (error) {
    console.error('Erro ao buscar portfólio:', error);
    return null;
  }
}

export async function updatePortfolio(
  userId: string,
  assets: { symbol: string; quantity: number; average_price: number }[]
): Promise<Portfolio | null> {
  try {
    // Calcular valores atuais
    const portfolioAssets = await Promise.all(assets.map(async (asset) => {
      try {
        const priceData = await getBinancePrice(asset.symbol);
        const currentPrice = parseFloat(priceData.price);

        const totalValue = asset.quantity * currentPrice;
        const profitLoss = totalValue - (asset.quantity * asset.average_price);
        const profitLossPercent = (profitLoss / (asset.quantity * asset.average_price)) * 100;

        return {
          ...asset,
          current_price: currentPrice,
          total_value: totalValue,
          profit_loss: profitLoss,
          profit_loss_percent: profitLossPercent
        };
      } catch (error) {
        console.error(`Erro ao atualizar preço para ${asset.symbol}:`, error);
        return {
          ...asset,
          current_price: 0,
          total_value: 0,
          profit_loss: 0,
          profit_loss_percent: 0
        };
      }
    }));

    const totalValue = portfolioAssets.reduce((sum, asset) => sum + asset.total_value, 0);

    // Atualizar no Supabase
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .upsert({
        user_id: userId,
        assets: portfolioAssets,
        total_value: totalValue,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return portfolio;
  } catch (error) {
    console.error('Erro ao atualizar portfólio:', error);
    return null;
  }
} 