import { useState } from 'react';
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { fetchPortfolio, type Portfolio } from "@/services/marketData";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown, ChevronUp, Percent, TrendingDown, TrendingUp, DollarSign, Briefcase, GaugeCircle, Coins, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

const Portfolio = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [formData, setFormData] = useState({
    riskLevel: 'MÉDIO',
    initialAmount: 10000
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await fetchPortfolio({
        riskLevel: formData.riskLevel as 'ALTO' | 'MÉDIO' | 'BAIXO',
        initialAmount: Number(formData.initialAmount)
      });
      setPortfolio(result);
      setShowAllAssets(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar a carteira recomendada.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const displayedAssets = portfolio ? 
    (showAllAssets ? portfolio.assets : portfolio.assets.slice(0, 5)) : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'AÇÃO':
        return <BarChart className="h-4 w-4 text-blue-500" />;
      case 'CRIPTO':
        return <Coins className="h-4 w-4 text-purple-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-green-500" />;
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getRiskDescription = (risk: string) => {
    switch (risk) {
      case 'BAIXO':
        return "Prioriza preservação do capital com menor volatilidade";
      case 'MÉDIO':
        return "Busca equilíbrio entre segurança e rentabilidade";
      case 'ALTO':
        return "Aceita maior volatilidade visando maiores retornos";
      default:
        return "";
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carteira Personalizada</h1>
          <p className="text-muted-foreground">
            Análise profissional baseada em múltiplos indicadores técnicos e fundamentalistas
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Definir Perfil de Investimento</CardTitle>
              <CardDescription>
                Configure os parâmetros para gerar sua carteira otimizada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label>Perfil de Risco</Label>
                  <RadioGroup
                    value={formData.riskLevel}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, riskLevel: value }))}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {[
                      { value: 'BAIXO', label: 'Conservador', description: 'Menor risco, retornos mais estáveis' },
                      { value: 'MÉDIO', label: 'Moderado', description: 'Equilíbrio entre risco e retorno' },
                      { value: 'ALTO', label: 'Arrojado', description: 'Maior risco, potencial de maiores retornos' }
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex flex-col p-4 border rounded-lg cursor-pointer transition-colors",
                          formData.riskLevel === option.value
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        )}
                        onClick={() => setFormData(prev => ({ ...prev, riskLevel: option.value }))}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`risk-${option.value}`} />
                          <Label htmlFor={`risk-${option.value}`}>{option.label}</Label>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-4">
                  <Label>Valor para Investir (R$)</Label>
                  <Input
                    type="number"
                    value={formData.initialAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialAmount: Number(e.target.value) }))}
                    min="1000"
                    step="1000"
                    className="text-lg"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Analisando mercado..." : "Gerar Carteira Otimizada"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {portfolio && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-6 w-6" />
                  {portfolio.name}
                </CardTitle>
                <CardDescription>
                  {getRiskDescription(portfolio.riskLevel)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Retorno Esperado</p>
                          </div>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold mt-2">{(portfolio.expectedReturn * 100).toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GaugeCircle className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Nível de Risco</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold mt-2">{portfolio.riskLevel}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Total Investido</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold mt-2">{formatCurrency(portfolio.initialAmount)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Alocação de Ativos</h3>
                    </div>
                    {displayedAssets.map((asset) => (
                      <div key={asset.symbol} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            {getAssetTypeIcon(asset.type)}
                            <p className="font-medium">{asset.name} ({asset.symbol})</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">{asset.type}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{asset.allocation.toFixed(1)}% da carteira</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(asset.value)}</p>
                          <div className="flex items-center justify-end gap-1">
                            {getChangeIcon(asset.changePercent)}
                            <p className={cn("text-sm", getChangeColor(asset.changePercent))}>
                              {asset.changePercent > 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {portfolio.assets.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAllAssets(!showAllAssets)}
                    >
                      {showAllAssets ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Mostrar Menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Ver Todos os Ativos
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Portfolio;

