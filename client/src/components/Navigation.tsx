import { Link, useLocation } from "wouter";
import { Home, Gift, Star, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass px-6 py-4 flex items-center justify-between">
      <h1 className="font-display font-bold text-xl text-foreground tracking-tight">
        Bloom & Rose
      </h1>
    </header>
  );
}

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Каталог" },
    { href: "/points", icon: Star, label: "Бонусы" },
    { href: "/bloggers", icon: Gift, label: "Блогеры" },
    { href: "/profile", icon: UserCircle2, label: "Профиль" },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40">
      <div className="glass rounded-full px-6 py-3 flex items-center justify-between max-w-md mx-auto relative overflow-hidden">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="relative z-10 flex flex-col items-center p-2 rounded-full min-w-[64px]">
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 mb-1 transition-colors duration-300 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium transition-colors duration-300 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
