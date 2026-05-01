"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Box } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      router.push(params.get("callbackUrl") || "/dashboard");
      router.refresh();
    } else {
      setError("Неверный email или пароль");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
        <label className="text-xs text-muted">Пароль</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mt-1"
          placeholder="••••••••"
        />
      </div>
      {error && <div className="text-sm text-bad">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
        {loading ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="card p-7">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-lg bg-accent/15 grid place-items-center">
          <Box className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-lg font-semibold leading-tight">MP Stocks</div>
          <div className="text-xs text-muted">войти в кабинет</div>
        </div>
      </div>
      <Suspense fallback={<div className="text-sm text-muted">Загрузка…</div>}>
        <LoginForm />
      </Suspense>
      <div className="text-center text-sm text-muted mt-5">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}
