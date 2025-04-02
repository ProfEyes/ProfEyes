import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, icon, children, className }: SettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      whileHover={{ 
        scale: 1.01,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.07)"
      }}
      className={cn(
        "rounded-xl overflow-hidden group",
        className
      )}
    >
      <Card className="border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl shadow-[0_0_25px_rgba(0,0,0,0.05)] h-full">
        <div className="relative">
          {/* Decorative gradient blur */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-400/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute -bottom-20 -right-10 w-60 h-60 bg-amber-400/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ rotate: [0, -10, 0, 10, 0], scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="p-3 rounded-xl bg-gradient-to-br from-white/8 to-transparent backdrop-blur-md border border-white/10 shadow-sm group-hover:from-white/12 group-hover:border-white/15 transition-all duration-300"
              >
                {icon}
              </motion.div>
              <div>
                <CardTitle className="text-[17px] font-light tracking-wide text-white/80 group-hover:text-white/95 transition-all duration-300">
                  {title}
                </CardTitle>
                <CardDescription className="text-white/40 text-xs mt-1 group-hover:text-white/50 transition-all duration-300">
                  {description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-white/[0.03]" />
          <CardContent className="pt-5 relative z-10">
            {/* Efeito de brilho sutil em hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-amber-500/0 to-rose-500/0 group-hover:from-rose-500/3 group-hover:via-amber-500/3 group-hover:to-rose-500/3 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-xl">
            </div>
            
            <div className="relative z-10">
              {children}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
} 