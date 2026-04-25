import { locations } from "#constants";
import createStore from "#store/createStore";

const DEFAULT_LOCATION = locations.work;
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
