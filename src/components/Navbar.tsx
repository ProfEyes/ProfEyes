import { useNotifications } from "@/contexts/NotificationContext";
import { Bell, Check } from "lucide-react";

const Navbar = () => {
  const { notifications, unreadCount } = useNotifications();
  const readCount = notifications.filter(n => n.read).length;
  
  return (
    <div className="flex items-center gap-2">
      <Link 
        to="/notifications" 
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        title="Ver todas as notificações"
      >
        <Bell className="h-5 w-5 text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Link>
      
      {readCount > 0 && (
        <Link 
          to="/notifications?filter=read" 
          className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Ver notificações lidas"
        >
          <Check className="h-5 w-5 text-white/80" />
          <span className="absolute top-0 right-0 bg-green-500/80 text-white text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center">
            {readCount}
          </span>
        </Link>
      )}
    </div>
  );
};

export default Navbar; 