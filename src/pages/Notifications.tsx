import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { NotificationList } from "@/components/notification/NotificationList";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Check, Filter, Zap, Trash, Info, AlertTriangle, MessageSquare, BellRing } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useNavigate } from "react-router-dom";

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    testNotification, 
    addNotification 
  } = useNotifications();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Tipo de filtro e estado inicial
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Atualiza o filtro com base nos parâmetros da URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const filterParam = searchParams.get("filter");
    
    if (filterParam === "unread") {
      setFilter("unread");
    } else if (filterParam === "read") {
      setFilter("read");
    } else {
      setFilter("all");
    }
  }, [location.search]);
  
  // Atualiza a URL quando o filtro muda
  useEffect(() => {
    if (filter === "all") {
      navigate("/notifications", { replace: true });
    } else {
      navigate(`/notifications?filter=${filter}`, { replace: true });
    }
  }, [filter, navigate]);
  
  const filteredNotifications = notifications.filter(notif => {
    // Filtragem por lidos/não lidos
    if (filter === "unread" && notif.read) return false;
    if (filter === "read" && !notif.read) return false;
    
    // Filtragem por tipo
    if (typeFilter !== "all" && notif.type !== typeFilter) return false;
    
    return true;
  });
  
  // Contadores para o resumo
  const readCount = notifications.filter(n => n.read).length;
  
  // Quantidade de cada tipo de notificação
  const typeCounts = {
    signals: notifications.filter(n => n.type === "signals").length,
    news: notifications.filter(n => n.type === "news").length,
    alerts: notifications.filter(n => n.type === "alerts").length,
    portfolio: notifications.filter(n => n.type === "portfolio").length,
    test: notifications.filter(n => n.type === "test").length,
  };
  
  // Gerador de notificações de teste de diferentes tipos para fins de demonstração
  const generateExampleNotification = (type: string) => {
    const notificationTypes: Record<string, { title: string; message: string; priority: "high" | "medium" | "low" }> = {
      signals: {
        title: "Novo sinal de trading detectado",
        message: "Um sinal de compra foi gerado para BTC/USDT. O preço atingiu o nível de suporte chave.",
        priority: "high"
      },
      news: {
        title: "Notícia de mercado importante",
        message: "Uma nova regulamentação para criptomoedas foi anunciada. Isso pode afetar o mercado nos próximos dias.",
        priority: "medium"
      },
      alerts: {
        title: "Alerta de preço atingido",
        message: "ETH/USDT atingiu o preço alvo de $3,500 que você definiu em seu alerta.",
        priority: "high"
      },
      portfolio: {
        title: "Atualização do portfólio",
        message: "Seu portfólio valorizou 5.2% nas últimas 24 horas. Confira os ativos com melhor desempenho.",
        priority: "low"
      }
    };
    
    if (type in notificationTypes) {
      const notifTemplate = notificationTypes[type];
      addNotification({
        title: notifTemplate.title,
        message: notifTemplate.message,
        type: type,
        priority: notifTemplate.priority,
        icon: "/logo.png"
      });
    }
  };
  
  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6 relative z-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Bell className="h-8 w-8 text-white/80" />
              </motion.div>
              Centro de Notificações
            </h1>
            <p className="text-white/60">
              Gerencie suas notificações e fique por dentro das atualizações
            </p>
          </motion.div>
          
          <div className="flex flex-wrap gap-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-1 flex">
              <Button 
                variant={filter === "all" ? "default" : "ghost"}
                size="sm"
                className={`h-9 rounded-md ${filter === "all" ? "bg-white/10" : "hover:bg-white/5"}`}
                onClick={() => setFilter("all")}
              >
                <Bell className="h-4 w-4 mr-2" />
                Todas
              </Button>
              <Button 
                variant={filter === "unread" ? "default" : "ghost"}
                size="sm"
                className={`h-9 rounded-md ${filter === "unread" ? "bg-blue-500/20" : "hover:bg-white/5"}`}
                onClick={() => setFilter("unread")}
              >
                <BellRing className="h-4 w-4 mr-2" />
                Não lidas
                {unreadCount > 0 && (
                  <Badge className="ml-1 bg-blue-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant={filter === "read" ? "default" : "ghost"}
                size="sm"
                className={`h-9 rounded-md ${filter === "read" ? "bg-green-500/20" : "hover:bg-white/5"}`}
                onClick={() => setFilter("read")}
              >
                <Check className="h-4 w-4 mr-2" />
                Lidas
                {readCount > 0 && (
                  <Badge className="ml-1 bg-green-500/80 text-white">
                    {readCount}
                  </Badge>
                )}
              </Button>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-auto h-9 bg-white/5 border-white/10 focus:ring-0">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="signals">Sinais de Trading</SelectItem>
                <SelectItem value="news">Notícias</SelectItem>
                <SelectItem value="alerts">Alertas de Preço</SelectItem>
                <SelectItem value="portfolio">Portfólio</SelectItem>
                <SelectItem value="test">Testes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <NotificationList maxHeight="700px" viewFilter={filter} />
          </div>
          
          <div className="space-y-6">
            <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white/90">Resumo</CardTitle>
                <CardDescription className="text-white/60">
                  Visão geral das suas notificações
                </CardDescription>
              </CardHeader>
              
              <Separator className="bg-white/5" />
              
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Total de notificações</span>
                    <Badge variant="outline" className="bg-white/5">
                      {notifications.length}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Não lidas</span>
                    <Badge className={unreadCount > 0 ? "bg-blue-500" : "bg-white/10"}>
                      {unreadCount}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Lidas</span>
                    <Badge className={readCount > 0 ? "bg-green-500/80" : "bg-white/10"}>
                      {readCount}
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/5" />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white/80">Por tipo</h4>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center px-2 py-1.5 rounded-md bg-white/5">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-white/70">Sinais de Trading</span>
                        </div>
                        <Badge variant="outline" className="bg-black/30">
                          {typeCounts.signals}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center px-2 py-1.5 rounded-md bg-white/5">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-400" />
                          <span className="text-sm text-white/70">Notícias</span>
                        </div>
                        <Badge variant="outline" className="bg-black/30">
                          {typeCounts.news}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center px-2 py-1.5 rounded-md bg-white/5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <span className="text-sm text-white/70">Alertas de Preço</span>
                        </div>
                        <Badge variant="outline" className="bg-black/30">
                          {typeCounts.alerts}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center px-2 py-1.5 rounded-md bg-white/5">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-purple-400" />
                          <span className="text-sm text-white/70">Portfólio</span>
                        </div>
                        <Badge variant="outline" className="bg-black/30">
                          {typeCounts.portfolio}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-white/5 bg-gradient-to-br from-black/40 via-black/30 to-black/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white/90">
                  Criar notificação de teste
                </CardTitle>
                <CardDescription className="text-white/60">
                  Simule diferentes tipos de notificações
                </CardDescription>
              </CardHeader>
              
              <Separator className="bg-white/5" />
              
              <CardContent className="pt-4">
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-blue-900/20 justify-start"
                    onClick={() => generateExampleNotification("signals")}
                  >
                    <Zap className="h-4 w-4 mr-2 text-blue-400" />
                    Sinal de Trading
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-amber-900/20 justify-start"
                    onClick={() => generateExampleNotification("news")}
                  >
                    <Info className="h-4 w-4 mr-2 text-amber-400" />
                    Notícia Importante
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-red-900/20 justify-start"
                    onClick={() => generateExampleNotification("alerts")}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                    Alerta de Preço
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-purple-900/20 justify-start"
                    onClick={() => generateExampleNotification("portfolio")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 text-purple-400" />
                    Atualização Portfólio
                  </Button>
                  
                  <Separator className="bg-white/5 my-2" />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                    onClick={testNotification}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notificação genérica
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default NotificationsPage; 