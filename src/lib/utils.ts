import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function platformLabel(p: string): string {
  return (
    {
      WB: "Wildberries",
      OZON: "Ozon",
      KASPI: "Kaspi.kz",
      FLIP: "Flip.kz",
    } as Record<string, string>
  )[p] ?? p;
}

export function platformColor(p: string): string {
  return (
    {
      WB: "text-wb",
      OZON: "text-ozon",
      KASPI: "text-kaspi",
      FLIP: "text-flip",
    } as Record<string, string>
  )[p] ?? "text-text";
}
