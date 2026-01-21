import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center -ml-2">
        <img 
          src="/profeyes-logo-removebg-preview.png" 
          alt="Logo" 
          className="h-8 w-auto"
          style={{ 
            filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.15))"
          }}
        />
      </div>
    </div>
  );
} 