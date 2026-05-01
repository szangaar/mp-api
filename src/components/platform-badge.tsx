import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  WB: "bg-wb/15 text-wb border-wb/30",
  OZON: "bg-ozon/15 text-ozon border-ozon/30",
  KASPI: "bg-kaspi/15 text-kaspi border-kaspi/30",
  FLIP: "bg-flip/15 text-flip border-flip/30",
};

const LABELS: Record<string, string> = {
  WB: "Wildberries",
  OZON: "Ozon",
  KASPI: "Kaspi.kz",
  FLIP: "Flip.kz",
};

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        COLORS[platform] ?? "bg-surface text-muted border-border",
      )}
    >
      {LABELS[platform] ?? platform}
    </span>
  );
}
