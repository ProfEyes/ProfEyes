import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="flex items-center justify-between p-4">
            <span className="font-semibold">TradingView Pro</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>UV</AvatarFallback>
            </Avatar>
          </SidebarHeader>
          <SidebarContent className="p-4 space-y-4">
            <nav className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
                Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/signals')}>
                Sinais
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/analysis')}>
                Análises
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/news')}>
                Notícias
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/portfolio')}>
                Portfólio
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/settings')}>
                Configurações
              </Button>
            </nav>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
            <header className="h-14 flex items-center px-6">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
            </header>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
