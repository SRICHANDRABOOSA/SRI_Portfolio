import { useSyncExternalStore } from "react";

const identity = (state) => state;

const createStore = (initializer) => {
  let state;
  const listeners = new Set();

  const getState = () => state;

  const setState = (updater) => {
    const nextState =
      typeof updater === "function" ? updater(state) : updater;

    if (nextState == null || Object.is(nextState, state)) return;

    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = initializer(setState, getState);

  const useStore = (selector = identity) =>
    useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state),
    );

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
};

export default createStore;
