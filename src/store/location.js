import createStore from "#store/createStore";
import { desktopLocation } from "#store/fileSystem";

const DEFAULT_LOCATION = desktopLocation;
const useLocationStore = createStore((set) => ({
  activeLocation: DEFAULT_LOCATION,

  setActiveLocation: (location) => {
    if (location === undefined) return;

    set(() => ({
      activeLocation: location,
    }));
  },

  resetActiveLocation: () =>
    set(() => ({
      activeLocation: DEFAULT_LOCATION,
    })),
}));

export default useLocationStore;
