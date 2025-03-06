import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

interface DashboardCardProps { 
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  symbol?: string;
}

const DashboardCard = ({ title, value, trend, trendValue }: DashboardCardProps) => {
  // Removendo estados e efeitos relacionados à animação
  const valueRef = useRef<HTMLDivElement>(null);

  const getTrendColor = (trend: string) => {
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

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={valueRef}
          className="text-2xl font-bold"
        >
          {value}
        </div>
        <div className={`flex items-center mt-2 ${getTrendColor(trend)}`}>
          <TrendIcon className="h-4 w-4 mr-1" />
          <span className="text-sm">{trendValue}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
