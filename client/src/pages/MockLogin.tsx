import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Loader2, Flower2 } from "lucide-react";
import { useLocation } from "wouter";

export default function MockLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Авто-логин через Telegram WebApp, если приложение запущено внутри Телеграма
  useEffect(() => {
    const anyWindow = window as any;
    const tg = anyWindow.Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) return;

    const username =
      tgUser.username ||
      `${tgUser.first_name || "user"}_${tgUser.id}`;

    setIsLoading(true);

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Telegram login failed");
        const user = await res.json();
        queryClient.setQueryData([api.user.me.path], user);
        setLocation("/");
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [queryClient, setLocation]);

  const handleBypassAuth = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      // Inject mock user into cache so the UI works
      queryClient.setQueryData([api.user.me.path], {
        id: 1,
        username: "beauty_lover",
        points: 450,
        referralCode: "BEAUTY450"
      });
      setLocation("/");
    }, 1000);
  };

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

        <button 
          onClick={handleBypassAuth}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-bold text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Войти в бутик"}
        </button>
      </motion.div>
    </div>
  );
}
