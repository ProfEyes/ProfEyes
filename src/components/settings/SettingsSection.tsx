import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ 
  title, 
  description, 
  icon, 
  children, 
  className 
}: SettingsSectionProps) {
  return (
    <Card className={cn("border-none bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full p-1.5 bg-black/20">
            {icon}
          </div>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </div>
        <CardDescription className="text-white/60 mt-1">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
} 