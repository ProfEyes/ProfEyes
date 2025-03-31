import React from 'react';
import { cn } from '@/lib/utils';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const Link = ({ href, children, className, ...props }: LinkProps) => {
  return (
    <a 
      href={href} 
      className={cn("text-sm transition-colors hover:text-white", className)}
      {...props}
    >
      {children}
    </a>
  );
}; 