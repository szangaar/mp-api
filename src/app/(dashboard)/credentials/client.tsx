"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformBadge } from "@/components/platform-badge";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, RefreshCw, CheckCircle2, Upload } from "lucide-react";

type Cred = {
  id: string;
  platform: "WB" | "OZON" | "KASPI" | "FLIP";
  label: string;
  clientId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
};

const PLATFORM_HELP: Record<Cred["platform"], { needsClientId: boolean; tip: string }> = {
  WB: {
    needsClientId: false,
    tip: "Получите токен в кабинете продавца WB → Настройки → Доступ к API. Для остатков нужен токен с категориями Statistics и Marketplace.",
  },
  OZON: {
    needsClientId: true,
    tip: "Скопируйте Client-Id и Api-Key из seller.ozon.ru → Настройки → API.",
  },
  KASPI: {
    needsClientId: true,
    tip: "В кабинете Kaspi Магазин → API. Client-Id — UID мерчанта, Api-Key — токен X-Auth-Token.",
  },
  FLIP: {
    needsClientId: false,
    tip: "У Flip.kz нет публичного API. Загрузите CSV с колонками: sku, name, quantity, price, warehouse.",
  },
};

export function CredentialsClient({ initial }: { initial: Cred[] }) {
  const router = useRouter();
  const [creds, setCreds] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Удалить ключ?")) return;
    setBusy(id);
    await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    setCreds((s) => s.filter((c) => c.id !== id));
    setBusy(null);
  }

  async function syncOne(id: string) {
    setBusy(id);
    const res = await fetch(`/api/credentials/${id}/sync`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Ошибка: ${j.error ?? res.statusText}`);
    } else {
      await refresh();
    }
  }

  async function pingOne(id: string) {
    setBusy(id);
    const res = await fetch(`/api/credentials/${id}/ping`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok) alert("Подключение успешно");
    else alert(`Ошибка: ${j.error ?? res.statusText}`);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Добавить ключ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {creds.length === 0 && (
          <div className="card p-6 text-sm text-muted col-span-2">
            Пока нет ключей. Нажмите «Добавить ключ», чтобы подключить первую площадку.
          </div>
        )}
        {creds.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <PlatformBadge platform={c.platform} />
                <div>
                  <div className="font-medium">{c.label}</div>
                  {c.clientId && (
                    <div className="text-xs text-muted">Client-Id: {c.clientId}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {c.platform !== "FLIP" && (
                  <>
                    <button
                      onClick={() => pingOne(c.id)}
                      disabled={busy === c.id}
                      title="Проверить подключение"
                      className="btn-ghost px-2 py-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => syncOne(c.id)}
                      disabled={busy === c.id}
                      title="Синхронизировать сейчас"
                      className="btn-ghost px-2 py-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                )}
                {c.platform === "FLIP" && (
                  <FlipUploadButton credentialId={c.id} onDone={refresh} />
                )}
                <button
                  onClick={() => remove(c.id)}
                  disabled={busy === c.id}
                  title="Удалить"
                  className="btn-danger px-2 py-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted space-y-1">
              <div>
                Последняя синхр.:{" "}
                <span className="text-text">{formatDate(c.lastSyncAt)}</span>
              </div>
              {c.lastError && (
                <div className="text-bad">Ошибка: {c.lastError}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <AddCredentialModal
          onClose={() => setOpen(false)}
          onCreated={(c) => {
            setCreds((s) => [...s, c]);
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function FlipUploadButton({
  credentialId,
  onDone,
}: {
  credentialId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="btn-ghost px-2 py-2 cursor-pointer" title="Загрузить CSV">
      <Upload className="w-4 h-4" />
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const csv = await file.text();
          const res = await fetch(`/api/credentials/${credentialId}/flip-import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csv }),
          });
          setBusy(false);
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(`Ошибка: ${j.error ?? res.statusText}`);
          } else {
            const j = await res.json();
            alert(`Импортировано позиций: ${j.imported}`);
            onDone();
          }
          e.target.value = "";
        }}
      />
    </label>
  );
}

function AddCredentialModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Cred) => void;
}) {
  const [platform, setPlatform] = useState<Cred["platform"]>("WB");
  const [label, setLabel] = useState("");
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const help = PLATFORM_HELP[platform];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        label: label || `${platform} магазин`,
        clientId: help.needsClientId ? clientId : null,
        apiKey: platform === "FLIP" ? "flip-csv" : apiKey,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Ошибка");
      return;
    }
    const cred = await res.json();
    onCreated(cred);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-lg space-y-4"
      >
        <div>
          <div className="text-lg font-semibold">Новый ключ</div>
          <div className="text-sm text-muted">Подключите площадку к кабинету</div>
        </div>
        <div>
          <label className="text-xs text-muted">Площадка</label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {(["WB", "OZON", "KASPI", "FLIP"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`btn ${platform === p ? "bg-accent text-white" : "bg-surface border border-border"}`}
              >
                {p === "WB" ? "WB" : p === "OZON" ? "Ozon" : p === "KASPI" ? "Kaspi" : "Flip"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted">Название</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Например: Спорттовары WB"
            className="input mt-1"
          />
        </div>
        {help.needsClientId && (
          <div>
            <label className="text-xs text-muted">
              Client-Id {platform === "KASPI" ? "(UID мерчанта)" : ""}
            </label>
            <input
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input mt-1"
            />
          </div>
        )}
        {platform !== "FLIP" && (
          <div>
            <label className="text-xs text-muted">API-ключ / токен</label>
            <textarea
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              rows={3}
              className="input mt-1 font-mono text-xs"
              placeholder="вставьте токен"
            />
          </div>
        )}
        <div className="text-xs text-muted bg-surface border border-border rounded-lg p-3">
          {help.tip}
        </div>
        {error && <div className="text-sm text-bad">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Отмена
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
