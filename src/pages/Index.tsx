
import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardCard from "@/components/dashboard/DashboardCard";
import SignalsCard from "@/components/dashboard/SignalsCard";
import NewsCard from "@/components/dashboard/NewsCard";
import { fetchMarketData } from "@/services/marketData";
import { toast } from "sonner";

const Index = () => {
  const { data: marketData, isLoading, error, refetch } = useQuery({
    queryKey: ['marketData'],
    queryFn: fetchMarketData,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    meta: {
      onError: () => {
        toast.error("Erro ao carregar dados do mercado");
      }
    }
  });

  useEffect(() => {
    // Busca dados iniciais
    refetch();
  }, [refetch]);

  return (
    <Layout>
      <div className="fade-in space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o mercado em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              {isLoading ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="border-white/10 bg-white/5 hover:bg-white/10"
            >
              <BellRing className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {marketData?.map((item, index) => (
            <DashboardCard
              key={index}
              title={item.symbol}
              value={item.price}
              trend={parseFloat(item.change) >= 0 ? "up" : "down"}
              trendValue={`${item.change} (${item.changePercent})`}
            />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SignalsCard />
          <NewsCard />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
