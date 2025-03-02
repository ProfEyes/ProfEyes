
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Analysis = () => {
  // Dados de exemplo para o gráfico
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Fev', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Abr', value: 800 },
    { name: 'Mai', value: 700 },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análises Técnicas</h1>
          <p className="text-muted-foreground">
            Análises detalhadas dos principais ativos
          </p>
        </div>

        <Tabs defaultValue="technical" className="space-y-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="technical">Análise Técnica</TabsTrigger>
            <TabsTrigger value="fundamental">Análise Fundamental</TabsTrigger>
            <TabsTrigger value="sentiment">Análise de Sentimento</TabsTrigger>
          </TabsList>

          <TabsContent value="technical">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gráfico de Preços</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fundamental">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Indicadores Fundamentalistas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Em desenvolvimento...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sentiment">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Sentimento do Mercado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Em desenvolvimento...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Analysis;
