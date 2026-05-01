"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  KeyRound,
  Package,
  ShoppingCart,
  RefreshCw,
  Users,
  LogOut,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stocks", label: "Остатки", icon: Package },
  { href: "/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/credentials", label: "API-ключи", icon: KeyRound },
  { href: "/sync", label: "Синхронизация", icon: RefreshCw },
  { href: "/team", label: "Команда", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  return (
    <aside className="w-64 shrink-0 bg-surface border-r border-border min-h-screen flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent/15 grid place-items-center">
          <Box className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="font-semibold leading-tight">MP Stocks</div>
          <div className="text-[11px] text-muted">учёт маркетплейсов</div>
        </div>
      </div>
      <nav className="p-3 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-accent/15 text-text"
                  : "text-muted hover:bg-card hover:text-text",
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 text-xs text-muted truncate">
          {data?.user?.email}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-card hover:text-text"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
