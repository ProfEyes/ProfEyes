
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps { 
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
}

const DashboardCard = ({ title, value, trend, trendValue }: DashboardCardProps) => {
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
    <Card className="hover-scale glass">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`flex items-center mt-2 ${getTrendColor(trend)}`}>
          <TrendIcon className="h-4 w-4 mr-1" />
          <span className="text-sm">{trendValue}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
