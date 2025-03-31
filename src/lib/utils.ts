import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomId(): string {
  return `id_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
}
