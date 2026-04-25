import { INITIAL_Z_INDEX, WINDOW_CONFIG } from "#constants/index.js";
import createStore from "#store/createStore";

const cloneWindows = () =>
  Object.fromEntries(
    Object.entries(WINDOW_CONFIG).map(([key, value]) => [
      key,
      {
        ...value,
        isMinimized: value.isMinimized ?? false,
        isMaximized: value.isMaximized ?? false,
      },
    ]),
  );

const useWindowStore = createStore((set) => ({
  windows: cloneWindows(),
  nextZIndex: INITIAL_Z_INDEX + 1,

  openWindow: (windowKey, data = null) =>
    set((state) => {
      const win = state.windows[windowKey];

      if (!win) return state;

      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: true,
            isMinimized: false,
            data: data ?? win.data,
            zIndex: state.nextZIndex,
          },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  closeWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];

      if (!win) return state;

      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: false,
            isMinimized: false,
            isMaximized: false,
            data: null,
            zIndex: INITIAL_Z_INDEX,
          },
        },
      };
    }),

  minimizeWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];

      if (!win) return state;

      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: true,
            isMinimized: true,
            isMaximized: false,
          },
        },
      };
    }),

  maximizeWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];

      if (!win) return state;

      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            isOpen: true,
            isMinimized: false,
            isMaximized: !win.isMaximized,
            zIndex: state.nextZIndex,
          },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),

  focusWindow: (windowKey) =>
    set((state) => {
      const win = state.windows[windowKey];

      if (!win) return state;

      return {
        windows: {
          ...state.windows,
          [windowKey]: {
            ...win,
            zIndex: state.nextZIndex,
          },
        },
        nextZIndex: state.nextZIndex + 1,
      };
    }),
}));

export default useWindowStore;
