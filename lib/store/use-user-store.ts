import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { type DashboardRole } from '@/components/dashboard/sidebar';

interface UserState {
  activeRoles: DashboardRole[];
  isLoading: boolean;
  error: string | null;

  fetchRoles: () => Promise<void>;
  addRole: (role: DashboardRole) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  activeRoles: ['buyer'],
  isLoading: false,
  error: null,

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    const supabase = createClient();
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) {
        set({ activeRoles: ['buyer'], isLoading: false });
        return;
      } else {
        if (error) {
          console.error("[UserStore] fetchRoles auth error:", error);
          set({ error: error.message, isLoading: false });
          return;
        }
      }

      const { data: rolesData, error: rError } = await supabase.rpc('get_user_roles', { lookup_user_id: user.id });

      if (!rError && Array.isArray(rolesData)) {
        set({ activeRoles: rolesData as DashboardRole[], isLoading: false });
      } else {
        set({ activeRoles: ['buyer'], isLoading: false });
      }
    } catch (err: any) {
      console.error("[UserStore] fetchRoles failed:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  addRole: (role: DashboardRole) => {
    const roles = get().activeRoles;
    if (!roles.includes(role)) {
      set({ activeRoles: [...roles, role] });
    }
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),
}));
