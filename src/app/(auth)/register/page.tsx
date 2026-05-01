"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Box } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("Моя команда");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, teamName }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Ошибка регистрации");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card p-7">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-lg bg-accent/15 grid place-items-center">
          <Box className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-lg font-semibold leading-tight">MP Stocks</div>
          <div className="text-xs text-muted">создать аккаунт</div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted">Имя</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
              placeholder="Иван"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Команда</label>
            <input
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Пароль (мин. 8 символов)</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
            placeholder="••••••••"
          />
        </div>
        {error && <div className="text-sm text-bad">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? "Регистрация…" : "Создать аккаунт"}
        </button>
      </form>
      <div className="text-center text-sm text-muted mt-5">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Войти
        </Link>
      </div>
    </div>
  );
}
