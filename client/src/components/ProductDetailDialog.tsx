import type { Product } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const REFERRAL_DISCOUNT = 25000;

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: () => void;
  usePoints?: boolean;
  hasReferralDiscount?: boolean;
};

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  onAddToCart,
  usePoints = false,
  hasReferralDiscount = false,
}: Props) {
  if (!product) return null;

  const priceRub = product.price / 100;
  const priceWithDiscount = hasReferralDiscount && product.price > REFERRAL_DISCOUNT
    ? (product.price - REFERRAL_DISCOUNT) / 100
    : priceRub;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 gap-0">
        <div className="aspect-square w-full max-h-[50vh] overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6 space-y-4">
          <DialogHeader>
            <span className="text-xs font-bold uppercase tracking-wider text-primary/80">
              {product.category}
            </span>
            <DialogTitle className="font-display text-xl text-left">
              {product.name}
            </DialogTitle>
          </DialogHeader>
          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs text-muted-foreground">Цена</span>
              <div className="font-display font-bold text-xl text-primary">
                {usePoints ? (
                  <><span className="text-amber-500 mr-1">✦</span>{product.pointsPrice} баллов</>
                ) : (
                  <>
                    {hasReferralDiscount && product.price > REFERRAL_DISCOUNT && (
                      <span className="line-through text-muted-foreground text-sm mr-1">
                        {priceRub.toFixed(0)} ₽
                      </span>
                    )}
                    {priceWithDiscount.toFixed(0)} ₽
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={() => {
                onAddToCart();
                onOpenChange(false);
              }}
              className="rounded-full gap-2"
            >
              <Plus className="w-5 h-5" />
              В корзину
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
