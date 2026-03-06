import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Loader2, Flower2, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

export default function MockLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Авто-логин через Telegram WebApp, если приложение запущено внутри Телеграма
  useEffect(() => {
    const anyWindow = window as any;
    const tg = anyWindow.Telegram?.WebApp;
    const initData: string | undefined = tg?.initData;

    // Not inside Telegram
    if (!tg || !initData) return;

    setIsLoading(true);
    setError(null);

    try {
      tg.ready?.();
      tg.expand?.();
    } catch {
      // ignore
    }

    fetch(api.telegram.login.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData,
      }),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || "Telegram login failed");
        }
        const user = await res.json();
        queryClient.setQueryData([api.user.me.path], user);
        sessionStorage.setItem("welcome_shown", "0");
        setLocation("/");
      })
      .catch((e) => {
        setError(e?.message || "Не удалось получить данные Telegram");
        setIsLoading(false);
      });
  }, [queryClient, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-3xl liquid-shape" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-accent/20 rounded-full blur-3xl liquid-shape-fast" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-[2.5rem] p-8 w-full max-w-md relative z-10 text-center shadow-2xl shadow-primary/10"
      >
        <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-primary to-accent rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30 rotate-12">
          <Flower2 className="w-10 h-10 -rotate-12" />
        </div>
        
        <h1 className="font-display font-bold text-3xl mb-2 text-foreground">
          Bloom & Bliss
        </h1>
        <p className="text-muted-foreground mb-8">
          Добро пожаловать в наш атмосферный цветочный бутик. Войдите, чтобы окунуться в магию.
        </p>

        {error && (
          <div className="mb-4 text-sm text-destructive bg-destructive/10 rounded-xl p-3">
            {error}
          </div>
        )}

        <div className="glass-card rounded-2xl p-4 text-left text-sm text-muted-foreground">
          <div className="font-medium text-foreground mb-1">Вход через Telegram</div>
          <div>
            Откройте мини‑апп из Telegram через команду <code>/start</code> и кнопку «Открыть мини‑апп».
          </div>
          <div className="mt-3 flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Получаем данные Telegram…</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Ожидание запуска из Telegram</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
