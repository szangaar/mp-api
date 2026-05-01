"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncRunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/sync/run", { method: "POST" });
        setBusy(false);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          alert("Ошибка: " + (j.error ?? res.statusText));
          return;
        }
        const j = await res.json();
        alert(
          `Готово. Магазинов: ${j.total}, успешно: ${j.success}, с ошибками: ${j.errors}`,
        );
        router.refresh();
      }}
      disabled={busy}
      className="btn-primary"
    >
      <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Синхронизация…" : "Запустить сейчас"}
    </button>
  );
}
