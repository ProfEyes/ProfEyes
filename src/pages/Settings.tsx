
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Settings = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e notificações
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Ativar notificações push</Label>
                <Switch id="notifications" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Notificações por email</Label>
                <Switch id="email-notifications" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferências de Trading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="stop-loss">Stop Loss padrão (%)</Label>
                <Input id="stop-loss" type="number" placeholder="2" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="take-profit">Take Profit padrão (%)</Label>
                <Input id="take-profit" type="number" placeholder="6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Modo escuro</Label>
                <Switch id="dark-mode" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>Salvar Configurações</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
