import { ArrowUpRight, ArrowDownRight, Clock, Award, BarChart2, DollarSign, TrendingUp, Calendar, Activity, SquareCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

interface DashboardCardProps { 
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  symbol?: string;
  statCard?: boolean;
}

const DashboardCard = ({ title, value, trend, trendValue, statCard = false }: DashboardCardProps) => {
  const valueRef = useRef<HTMLDivElement>(null);

  // Função para obter o ícone de acordo com o título da estatística
  const getStatIcon = (title: string) => {
    switch (title) {
      case 'Total de Sinais':
        return <BarChart2 className="h-5 w-5 mr-1 text-primary" />;
      case 'Taxa de Acerto':
        return <SquareCheck className="h-5 w-5 mr-1 text-green-500" />;
      case 'Ganho Mensal':
        return <TrendingUp className="h-5 w-5 mr-1 text-green-500" />;
      case 'Perda Mensal':
        return <TrendingUp className="h-5 w-5 mr-1 text-red-500" />;
      case 'Lucro Total':
        return <DollarSign className="h-5 w-5 mr-1 text-green-500" />;
      case 'Operações Hoje':
        return <Activity className="h-5 w-5 mr-1 text-blue-500" />;
      case 'Tempo Online':
        return <Clock className="h-5 w-5 mr-1 text-amber-500" />;
      case 'Dias Ativos':
        return <Calendar className="h-5 w-5 mr-1 text-purple-500" />;
      default:
        return <Activity className="h-5 w-5 mr-1" />;
    }
  };

  // Função para obter a cor do texto
  const getTrendColor = (trend: string) => {
    if (statCard) return "text-foreground";
    
    switch (trend) {
      case "up":
        return "text-market-up";
      case "down":
        return "text-market-down";
      default:
        return "text-market-neutral";
    }
  };

  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const StatIcon = getStatIcon(title);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          {statCard && StatIcon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={valueRef}
          className="text-2xl font-bold"
        >
          {value}
        </div>
        {trendValue && (
          <div className={`flex items-center mt-2 ${getTrendColor(trend)}`}>
            {!statCard && <TrendIcon className="h-4 w-4 mr-1" />}
            <span className="text-sm">{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
