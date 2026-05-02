const PUTER_SCRIPT_SRC = "https://js.puter.com/v2/";
const PUTER_TIMEOUT_MS = 10000;

let puterPromise;

const getGlobalPuter = () => globalThis.puter;

const createPuterLoadError = () =>
  new Error("Puter.js is not available. Check your connection and try again.");

export const loadPuter = () => {
  const existingPuter = getGlobalPuter();

  if (existingPuter) return Promise.resolve(existingPuter);

  if (typeof document === "undefined") {
    return Promise.reject(createPuterLoadError());
  }

  if (!puterPromise) {
    puterPromise = new Promise((resolve, reject) => {
      let settled = false;

      const settle = (callback, value) => {
        if (settled) return;

        settled = true;
        window.clearTimeout(timeoutId);
        callback(value);
      };

      const handleLoad = () => {
        const loadedPuter = getGlobalPuter();

        if (loadedPuter) {
          settle(resolve, loadedPuter);
          return;
        }

        settle(reject, createPuterLoadError());
      };

      const handleError = () => settle(reject, createPuterLoadError());

      const timeoutId = window.setTimeout(handleError, PUTER_TIMEOUT_MS);
      const existingScript = document.querySelector(
        `script[src="${PUTER_SCRIPT_SRC}"]`,
      );

      if (existingScript) {
        const waitForGlobal = () => {
          if (getGlobalPuter()) {
            handleLoad();
            return;
          }

          if (!settled) window.setTimeout(waitForGlobal, 50);
        };

        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener("error", handleError, { once: true });
        waitForGlobal();
        return;
      }

      const script = document.createElement("script");
      script.src = PUTER_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      puterPromise = null;
      throw error;
    });
  }

  return puterPromise;
};

export const getPuterAccount = async () => {
  const puter = await loadPuter();
  const signedIn = Boolean(await puter.auth.isSignedIn());

  return {
    signedIn,
    user: signedIn ? await puter.auth.getUser() : null,
  };
};

export const signInToPuter = async () => {
  const puter = await loadPuter();

  await puter.auth.signIn();
  return getPuterAccount();
};

export const signOutFromPuter = async () => {
  const puter = await loadPuter();

  await puter.auth.signOut();
  return { signedIn: false, user: null };
};

export const writePuterFile = async (path, data, options = {}) => {
  const puter = await loadPuter();

  return puter.fs.write(path, data, {
    createMissingParents: true,
    overwrite: true,
    ...options,
  });
};

export const readPuterTextFile = async (path) => {
  const puter = await loadPuter();
  const file = await puter.fs.read(path);

  return file.text();
};

export const readPuterFile = async (path) => {
  const puter = await loadPuter();

  return puter.fs.read(path);
};

export const listPuterDirectory = async (path = "./") => {
  const puter = await loadPuter();

  return puter.fs.readdir(path);
};

export const deletePuterPath = async (path) => {
  const puter = await loadPuter();

  return puter.fs.delete(path);
};

export const askPuterAI = async (prompt) => {
  const puter = await loadPuter();
  const response = await puter.ai.chat(prompt, {
    model: "gpt-5-nano",
    max_tokens: 320,
  });

  return response?.message?.content ?? response?.text ?? String(response ?? "");
};

export const getPuterErrorMessage = (error) =>
  error?.message ?? "Puter request failed. Try again.";
