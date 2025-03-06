import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <div style={{ 
        fontFamily: 'Mollen',
        fontSize: '24px',
        color: 'white',
        fontWeight: 'bold'
      }}>
        ProfEyes
      </div>
    </div>
  );
} 