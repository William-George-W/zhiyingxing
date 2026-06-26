import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      updateUser: (userPatch) =>
        set((state) => ({ user: { ...state.user, ...userPatch } })),
    }),
    {
      name: 'zhiyinxing-auth', // localStorage key
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
