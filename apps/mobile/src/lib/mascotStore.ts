import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const VISIBILITY_STORAGE_KEY = '@campusflow/mascot-visible';

interface MascotState {
  visible: boolean;
  isHydrated: boolean;
  initialize: () => void;
  setVisible: (visible: boolean) => Promise<void>;
}

export const useMascotStore = create<MascotState>((set, get) => ({
  visible: true,
  isHydrated: false,
  initialize: () => {
    if (get().isHydrated) return;
    void AsyncStorage.getItem(VISIBILITY_STORAGE_KEY)
      .then((value) => set({ visible: value !== 'false', isHydrated: true }))
      .catch(() => set({ isHydrated: true }));
  },
  setVisible: async (visible) => {
    set({ visible });
    await AsyncStorage.setItem(VISIBILITY_STORAGE_KEY, String(visible));
  },
}));
