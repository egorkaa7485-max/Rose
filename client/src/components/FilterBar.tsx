import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FilterBarProps = {
  search: string;
  onSearchChange: (v: string) => void;
  priceFrom: string;
  onPriceFromChange: (v: string) => void;
  priceTo: string;
  onPriceToChange: (v: string) => void;
};

export function FilterBar({
  search,
  onSearchChange,
  priceFrom,
  onPriceFromChange,
  priceTo,
  onPriceToChange,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const hasFilters = search || priceFrom || priceTo;

  return (
    <div className="mb-6">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          {hasFilters ? "Фильтр (активен)" : "Фильтр"}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
      {open && (
        <div className="mt-3 space-y-3 p-4 glass rounded-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Цена:</span>
            <Input
              type="number"
              placeholder="от (₽)"
              value={priceFrom}
              onChange={(e) => onPriceFromChange(e.target.value)}
              className="w-24 bg-background"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="number"
              placeholder="до (₽)"
              value={priceTo}
              onChange={(e) => onPriceToChange(e.target.value)}
              className="w-24 bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
