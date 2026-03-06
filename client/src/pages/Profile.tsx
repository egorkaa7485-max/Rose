import { useState } from "react";
import { TopBar, BottomNav } from "@/components/Navigation";
import { useUser, useApplyReferral } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Gift, KeyRound, Users, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Profile() {
  const { data: user, isLoading, refetch } = useUser();
  const { mutate: applyCode, isPending } = useApplyReferral();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [creatingCode, setCreatingCode] = useState(false);
  const [giftCodeInput, setGiftCodeInput] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast({ title: "Скопировано в буфер обмена!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitReferralCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCodeInput.trim()) return;
    applyCode(referralCodeInput.trim(), {
      onSuccess: (data) => {
        toast({ title: "Готово!", description: data.message });
        setReferralCodeInput("");
      },
      onError: (err) => {
        toast({ title: "Ошибка", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleCreateCode = async () => {
    if (!user) return;
    setCreatingCode(true);
    try {
      const res = await fetch("/api/gift-codes", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Ошибка");
      }
      const data = await res.json();
      toast({
        title: "Код создан!",
        description: `Код ${data.code} отправлен в Telegram. Поделитесь им с друзьями.`,
      });
      refetch();
    } catch (e) {
      toast({
        title: "Ошибка",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCreatingCode(false);
    }
  };

  const handleEnterCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = giftCodeInput.trim().toUpperCase();
    if (!code) return;
    setLocation(`/gift/${encodeURIComponent(code)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pt-24 pb-32 px-4 max-w-lg mx-auto min-h-screen">
      <TopBar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2rem] p-8 text-center mb-8 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/30 rounded-full blur-2xl" />

        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-accent rounded-full p-1 shadow-xl shadow-primary/20 mb-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.tgUsername || user.username}
              className="w-full h-full rounded-full object-cover bg-white"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-display font-bold text-3xl text-primary">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="font-display font-bold text-2xl text-foreground">
          @{user.tgUsername || user.username}
        </h2>

        {(user.firstName || user.lastName) && (
          <p className="text-sm text-muted-foreground mt-1">
            {[user.firstName, user.lastName].filter(Boolean).join(" ")}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-amber-500 bg-amber-500/10 py-2 px-4 rounded-full w-max mx-auto">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-lg">{user.points} баллов</span>
        </div>
      </motion.div>

      <div className="space-y-6">
        <div className="glass-card rounded-[1.5rem] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="font-display font-bold text-lg">Пригласить друзей</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Делитесь своим кодом: когда друг совершит покупку, вы получите 500 баллов (после подтверждения в админке).
          </p>
          <div className="flex items-center bg-background rounded-xl border border-border p-2 pl-4 mb-4">
            <code className="flex-1 font-mono text-primary font-bold tracking-widest text-lg">
              {user.referralCode}
            </code>
            <button
              type="button"
              onClick={handleCopyReferral}
              className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6">
          <h3 className="font-display font-bold text-lg mb-2">Есть пригласительный код?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Введите код друга и получите скидку 250₽ на все товары.
          </p>
          <form onSubmit={handleSubmitReferralCode} className="flex gap-2 mb-6">
            <input
              type="text"
              value={referralCodeInput}
              onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
              placeholder="например, ROSE2024"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary font-mono uppercase"
            />
            <button
              type="submit"
              disabled={isPending || !referralCodeInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Активировать"}
            </button>
          </form>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-6 h-6 text-primary" />
            <h3 className="font-display font-bold text-lg">Код для подарков</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Создайте уникальный код — друзья смогут отправить вам подарок, не зная вашего адреса. Код придёт в Telegram.
          </p>
          <button
            onClick={handleCreateCode}
            disabled={creatingCode}
            className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
            Создать код для подарков
          </button>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6">
          <h3 className="font-display font-bold text-lg mb-2">Ввести код для подарка другу</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Есть код друга? Введите его и выберите подарок — мы доставим адресату.
          </p>
          <form onSubmit={handleEnterCode} className="flex gap-2">
            <input
              type="text"
              value={giftCodeInput}
              onChange={(e) => setGiftCodeInput(e.target.value.toUpperCase())}
              placeholder="например, ROSE2024"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono uppercase"
            />
            <button
              type="submit"
              disabled={!giftCodeInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              Перейти
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
