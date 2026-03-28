import { create } from 'zustand';
import { getCart, getNavbarCounts } from '@/lib/actions/marketplace';

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
      const { orders, total } = await getCart();
      
      // Calculate total item count (quantity)
      const count = orders.reduce((sum, order) => {
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
    try {
      const counts = await getNavbarCounts();
      set({ 
        cartCount: counts.cartCount, 
        chatCount: counts.chatCount 
      });
    } catch (err) {
      console.error("[CartStore] refreshCounts failed:", err);
    }
  },

  setCartData: (orders, total) => {
    const count = orders.reduce((sum, order) => {
      return sum + (order.order_items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) ?? 0);
    }, 0);

    set({ orders, total, cartCount: count });
  },

  clearCart: () => {
    set({ orders: [], total: 0, cartCount: 0 });
  }
}));
