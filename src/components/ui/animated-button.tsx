import * as React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  status?: "idle" | "loading" | "success" | "error" | "saving" | "saved";
  loadingText?: string;
  successText?: string;
  errorText?: string;
  icon?: React.ReactNode;
  successIcon?: React.ReactNode;
  errorIcon?: React.ReactNode;
  loadingIcon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient";
  fullWidth?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  colorScheme?: "indigo" | "rose" | "blue" | "amber" | "green" | "purple" | "teal";
}

export function AnimatedButton({
  children,
  status = "idle",
  loadingText = "Carregando...",
  successText = "Concluído!",
  errorText = "Erro",
  icon,
  successIcon,
  errorIcon,
  loadingIcon = <Loader2 className="h-4 w-4 animate-spin" />,
  variant = "default",
  fullWidth = false,
  size = "default",
  colorScheme = "indigo",
  className,
  ...props
}: AnimatedButtonProps) {
  // Definir classes de cores com base no colorScheme
  const colorClasses = {
    indigo: "bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white",
    rose: "bg-gradient-to-r from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white",
    blue: "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white",
    amber: "bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white",
    green: "bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white",
    purple: "bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white",
    teal: "bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 text-white",
  };

  // Determinar o texto e ícone com base no status
  const buttonText = status === "idle" 
    ? children 
    : status === "loading" || status === "saving" 
      ? loadingText 
      : status === "success" || status === "saved" 
        ? successText 
        : errorText;

  const buttonIcon = status === "idle" 
    ? icon 
    : status === "loading" || status === "saving" 
      ? loadingIcon 
      : status === "success" || status === "saved" 
        ? successIcon 
        : errorIcon;

  // Verificar se o botão está em estado de carregamento
  const isLoading = status === "loading" || status === "saving";

  return (
    <Button
      variant={variant === "gradient" ? "default" : variant}
      disabled={isLoading}
      className={cn(
        "relative overflow-hidden group",
        variant === "gradient" && colorClasses[colorScheme],
        fullWidth && "w-full",
        className
      )}
      size={size}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2 justify-center">
        {buttonIcon && (
          <motion.span
            animate={isLoading ? { rotate: 360 } : { scale: [0.9, 1.1, 1] }}
            transition={
              isLoading 
                ? { repeat: Infinity, duration: 1, ease: "linear" } 
                : { duration: 0.3 }
            }
          >
            {buttonIcon}
          </motion.span>
        )}
        <span>{buttonText}</span>
      </span>
      
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:animate-shine"></div>
    </Button>
  );
} 