import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/notificationStore";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function NotificationButton() {
  const { hasNotifications, toggleNotifications } = useNotificationStore();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    toggleNotifications();
    // Reset animation after completion
    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative transition-transform duration-200",
        hasNotifications && "animate-pulse",
        isAnimating && "scale-95"
      )}
      onClick={handleClick}
    >
      <Bell className={cn(
        "h-5 w-5",
        isAnimating && "transform rotate-12 transition-transform"
      )} />
      {hasNotifications && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600 animate-pulse" />
      )}
    </Button>
  );
} 