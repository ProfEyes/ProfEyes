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
      whileHover={{ 
        scale: 1.01,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(31, 41, 55, 0.2)"
      }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-300 group",
        className
      )}
    >
      <Card className="border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] backdrop-blur-lg shadow-xl h-full">
        <div className="relative z-10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 shadow-md group-hover:from-white/15 group-hover:to-white/10 transition-all duration-300">
                {icon}
              </div>
              <div>
                <CardTitle className="text-[17px] font-medium tracking-wide text-white/90 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/95 to-white/90 group-hover:from-white group-hover:to-white/95 transition-all duration-300">
                  {title}
                </CardTitle>
                <CardDescription className="text-white/50 text-xs mt-1">
                  {description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-white/[0.07]" />
          <CardContent className="pt-5 relative">
            {/* Efeito sutil de gradiente ao passar o mouse */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-700 rounded-xl opacity-0 group-hover:opacity-100">
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