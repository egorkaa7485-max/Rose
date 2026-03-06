import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@shared/schema";

const REFERRAL_DISCOUNT = 25000; // 250₽ в копейках

interface ProductCardProps {
  product: Product;
  onAction?: () => void;
  actionText?: string;
  usePoints?: boolean;
  hasReferralDiscount?: boolean;
}

export function ProductCard({ product, onAction, actionText = "Add to Cart", usePoints = false, hasReferralDiscount = false }: ProductCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card rounded-[2rem] p-3 flex flex-col group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/40 to-transparent rounded-full -mr-10 -mt-10 blur-xl z-0 transition-transform group-hover:scale-150 duration-700" />
      
      <div className="relative z-10 aspect-square rounded-[1.5rem] overflow-hidden mb-4 shadow-sm bg-muted/50">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <button className="absolute top-3 right-3 w-8 h-8 glass rounded-full flex items-center justify-center text-foreground hover:text-primary transition-colors">
          <Heart className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col relative z-10 px-2">
        <div className="text-xs font-bold uppercase tracking-wider text-primary/80 mb-1">
          {product.category}
        </div>
        <h3 className="font-display font-bold text-lg leading-tight mb-2 text-foreground">
          {product.name}
        </h3>
        
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">Цена</span>
            <span className="font-display font-bold text-xl text-primary">
              {usePoints ? (
                <>
                  <span className="text-amber-500 mr-1">✦</span>
                  {product.pointsPrice}
                </>
              ) : (
                <>
                  {hasReferralDiscount && product.price > REFERRAL_DISCOUNT && (
                    <span className="line-through text-muted-foreground text-sm mr-1">
                      {(product.price / 100).toFixed(0)} ₽
                    </span>
                  )}
                  {(Math.max(0, product.price - (hasReferralDiscount ? REFERRAL_DISCOUNT : 0)) / 100).toFixed(0)} ₽
                </>
              )}
            </span>
          </div>
          
          <button 
            onClick={onAction}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
