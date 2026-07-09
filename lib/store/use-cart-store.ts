import { create } from 'zustand';
import { getCart, getNavbarCounts } from '@/lib/actions/marketplace';

const COUNTS_COOLDOWN_MS = 30_000;
let lastCountsFetchAt = 0;
let countsFetchInFlight: Promise<void> | null = null;

interface CartState {
  orders: any[];
  total: number;
  cartCount: number;
  chatCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshCart: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  setCartData: (orders: any[], total: number) => void;
  setCartCount: (count: number) => void;
  incrementCartCount: (amount: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  orders: [],
  total: 0,
  cartCount: 0,
  chatCount: 0,
  isLoading: false,
  error: null,

  refreshCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const { items, total } = await getCart();
      const orders = items as any[];

      // Calculate total item count (quantity)
      const count = orders.reduce((sum: number, order: any) => {
        return sum + (order.order_items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) ?? 0);
      }, 0);

      set({ 
        orders, 
        total, 
        cartCount: count,
        isLoading: false 
      });
    } catch (err: any) {
      console.error("[CartStore] refreshCart failed:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  refreshCounts: async () => {
    const now = Date.now();
    if (lastCountsFetchAt > 0 && now - lastCountsFetchAt < COUNTS_COOLDOWN_MS) {
      return;
    }
    if (countsFetchInFlight) {
      return countsFetchInFlight;
    }

    countsFetchInFlight = (async () => {
      try {
        const counts = await getNavbarCounts();
        lastCountsFetchAt = Date.now();
        set({
          cartCount: counts.cartCount,
          chatCount: counts.chatCount,
        });
      } catch (err) {
        console.error("[CartStore] refreshCounts failed:", err);
      } finally {
        countsFetchInFlight = null;
      }
    })();

    return countsFetchInFlight;
  },

    setCartData: (orders, total) => {
    const count = orders.reduce((sum: number, order: any) => {
      return sum + (order.order_items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) ?? 0);
    }, 0);

    set({ orders, total, cartCount: count });
  },

  setCartCount: (count) => {
    set({ cartCount: count });
  },

  incrementCartCount: (amount) => {
    set((state) => ({ cartCount: state.cartCount + amount }));
  },

  clearCart: () => {
    set({ orders: [], total: 0, cartCount: 0 });
  }
}));
