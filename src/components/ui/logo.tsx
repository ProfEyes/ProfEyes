import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <div style={{ 
        fontFamily: 'Inter, sans-serif',
        fontSize: '18px',
        fontWeight: 600,
        letterSpacing: '-0.03em'
      }}
      className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
        NP Exclusive Signals
      </div>
    </div>
  );
} 