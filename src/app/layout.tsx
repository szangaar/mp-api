import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MP Stocks — учёт остатков на маркетплейсах",
  description: "Wildberries, Ozon, Kaspi.kz, Flip.kz в одном кабинете",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
