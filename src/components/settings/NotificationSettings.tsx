import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>
          Configure suas preferências de notificação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="signals">Sinais de Trading</Label>
          <Switch id="signals" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="news">Notícias Importantes</Label>
          <Switch id="news" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="alerts">Alertas de Preço</Label>
          <Switch id="alerts" defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
} 