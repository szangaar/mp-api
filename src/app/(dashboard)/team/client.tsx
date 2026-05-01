"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
};

export function TeamClient({
  teamName,
  members,
  currentRole,
  currentUserId,
}: {
  teamName: string;
  members: Member[];
  currentRole: "OWNER" | "ADMIN" | "MEMBER";
  currentUserId: string;
}) {
  const router = useRouter();
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="card p-5 mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted">Команда</div>
          <div className="text-lg font-semibold">{teamName}</div>
          <div className="text-xs text-muted mt-1">
            Участников: {members.length} / 10
          </div>
        </div>
        {canManage && members.length < 10 && (
          <button onClick={() => setOpen(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Пригласить
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Роль</th>
              <th>Добавлен</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.email}</td>
                <td>{m.name ?? "—"}</td>
                <td>{m.role}</td>
                <td className="text-muted">{formatDate(m.createdAt)}</td>
                <td className="text-right">
                  {canManage && m.userId !== currentUserId && m.role !== "OWNER" && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Удалить ${m.email}?`)) return;
                        const res = await fetch(`/api/team/members/${m.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) router.refresh();
                        else alert("Не удалось удалить участника");
                      }}
                      className="btn-danger px-2 py-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <InviteModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          const res = await fetch("/api/team/members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, password }),
          });
          setBusy(false);
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setErr(j.error ?? "Ошибка");
            return;
          }
          router.refresh();
          onClose();
        }}
        className="card p-6 w-full max-w-md space-y-3"
      >
        <div className="text-lg font-semibold">Добавить участника</div>
        <div className="text-xs text-muted">
          Создаст учётную запись и привяжет к команде. Пароль передайте сотруднику лично.
        </div>
        <div>
          <label className="text-xs text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Имя</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Временный пароль (мин. 8)</label>
          <input
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
          />
        </div>
        {err && <div className="text-sm text-bad">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Отмена
          </button>
          <button disabled={busy} className="btn-primary">
            {busy ? "Добавляем…" : "Добавить"}
          </button>
        </div>
      </form>
    </div>
  );
}
