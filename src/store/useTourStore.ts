import { create } from 'zustand';
import type { HotspotData } from '../types/hotspot';

interface JoystickVector {
  x: number; // -1 (trái) đến 1 (phải)
  y: number; // -1 (lùi) đến 1 (tiến)
}

interface TourState {
  sceneReady: boolean;
  activeHotspot: HotspotData | null;
  nearbyHotspot: HotspotData | null;
  dismissedHotspotId: string | null;
  joystick: JoystickVector;
  cameraDelta: { x: number; y: number };

  setSceneReady: (ready: boolean) => void;
  setActiveHotspot: (hotspot: HotspotData | null) => void;
  setNearbyHotspot: (hotspot: HotspotData | null) => void;
  closePanel: () => void;
  setJoystick: (x: number, y: number) => void;
  addCameraDelta: (dx: number, dy: number) => void;
  consumeCameraDelta: () => { x: number; y: number };
}

export const useTourStore = create<TourState>((set, get) => ({
  sceneReady: false,
  activeHotspot: null,
  nearbyHotspot: null,
  dismissedHotspotId: null,
  joystick: { x: 0, y: 0 },
  cameraDelta: { x: 0, y: 0 },

  setSceneReady: (ready) => set({ sceneReady: ready }),

  setActiveHotspot: (hotspot) =>
    set({
      activeHotspot: hotspot,
      dismissedHotspotId: null,
    }),

  setNearbyHotspot: (hotspot) =>
    set((state) => {
      if (!hotspot) {
        return { nearbyHotspot: null, dismissedHotspotId: null };
      }
      const shouldAutoOpen =
        state.activeHotspot === null && state.dismissedHotspotId !== hotspot.id;
      return {
        nearbyHotspot: hotspot,
        activeHotspot: shouldAutoOpen ? hotspot : state.activeHotspot,
      };
    }),

  closePanel: () =>
    set((state) => ({
      activeHotspot: null,
      dismissedHotspotId: state.nearbyHotspot?.id ?? null,
    })),

  setJoystick: (x, y) => set({ joystick: { x, y } }),

  addCameraDelta: (dx, dy) =>
    set((state) => ({
      cameraDelta: {
        x: state.cameraDelta.x + dx,
        y: state.cameraDelta.y + dy,
      },
    })),

  consumeCameraDelta: () => {
    const current = get().cameraDelta;
    if (current.x !== 0 || current.y !== 0) {
      set({ cameraDelta: { x: 0, y: 0 } });
    }
    return current;
  },
}));
