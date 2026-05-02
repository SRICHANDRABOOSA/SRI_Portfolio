import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import {
  askPuterAI,
  getPuterAccount,
  getPuterErrorMessage,
  listPuterDirectory,
  readPuterTextFile,
  signInToPuter,
  signOutFromPuter,
  writePuterFile,
} from "../lib/puterClient";
import {
  Bot,
  Cloud,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  RefreshCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const CLOUD_NOTE_PATH = "portfolio/quick-note.txt";
const CLOUD_DIRECTORY = "portfolio";

const PuterCloud = () => {
  const [account, setAccount] = useState({ signedIn: false, user: null });
  const [status, setStatus] = useState("Connecting to Puter...");
  const [activeTask, setActiveTask] = useState("init");
  const [note, setNote] = useState("Project ideas, notes, or todos.");
  const [prompt, setPrompt] = useState(
    "Suggest one playful feature for this macOS portfolio.",
  );
  const [aiAnswer, setAiAnswer] = useState("");
  const [cloudFiles, setCloudFiles] = useState([]);

  const displayName = useMemo(() => {
    const user = account.user;

    return user?.username ?? user?.email ?? user?.name ?? "Puter account";
  }, [account.user]);

  const refreshAccount = async () => {
    setActiveTask("account");

    try {
      const nextAccount = await getPuterAccount();

      setAccount(nextAccount);
      setStatus(nextAccount.signedIn ? "Signed in." : "Ready.");
    } catch (error) {
      setStatus(getPuterErrorMessage(error));
    } finally {
      setActiveTask(null);
    }
  };

  const refreshFiles = async () => {
    setActiveTask("files");

    try {
      const files = await listPuterDirectory(CLOUD_DIRECTORY);

      setCloudFiles(files);
      setStatus("Cloud files refreshed.");
    } catch {
      setCloudFiles([]);
      setStatus("No cloud files yet.");
    } finally {
      setActiveTask(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const nextAccount = await getPuterAccount();

        if (!isMounted) return;

        setAccount(nextAccount);
        setStatus(nextAccount.signedIn ? "Signed in." : "Ready.");
      } catch (error) {
        if (isMounted) setStatus(getPuterErrorMessage(error));
      } finally {
        if (isMounted) setActiveTask(null);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignIn = async () => {
    setActiveTask("signin");

    try {
      setAccount(await signInToPuter());
      setStatus("Signed in.");
    } catch (error) {
      setStatus(getPuterErrorMessage(error));
    } finally {
      setActiveTask(null);
    }
  };

  const handleSignOut = async () => {
    setActiveTask("signout");

    try {
      setAccount(await signOutFromPuter());
      setStatus("Signed out.");
    } catch (error) {
      setStatus(getPuterErrorMessage(error));
    } finally {
      setActiveTask(null);
    }
  };

  const handleSaveNote = async () => {
    setActiveTask("save");

    try {
      const file = await writePuterFile(CLOUD_NOTE_PATH, note);

      setStatus(`Saved ${file?.name ?? "quick-note.txt"}.`);
      await refreshFiles();
    } catch (error) {
      setStatus(getPuterErrorMessage(error));
      setActiveTask(null);
    }
  };

  const handleLoadNote = async () => {
    setActiveTask("load");

    try {
      setNote(await readPuterTextFile(CLOUD_NOTE_PATH));
      setStatus("Loaded quick-note.txt.");
    } catch (error) {
      setStatus(getPuterErrorMessage(error));
    } finally {
      setActiveTask(null);
    }
  };

  const handleAskAI = async () => {
    if (!prompt.trim()) return;

    setActiveTask("ai");

    try {
      setAiAnswer(await askPuterAI(prompt.trim()));
      setStatus("AI response ready.");
    } catch (error) {
      setStatus(getPuterErrorMessage(error));
    } finally {
      setActiveTask(null);
    }
  };

  const isBusy = Boolean(activeTask);

  return (
    <>
      <div id="window-header">
        <WindowControls target="puter" />
        <h2 className="window-drag-handle">Puter Cloud</h2>
      </div>

      <div className="puter-shell">
        <aside className="puter-sidebar">
          <div className="puter-account">
            <Cloud className="size-5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="label">Account</p>
              <p className="value">{account.signedIn ? displayName : "Guest"}</p>
            </div>
          </div>

          <div className="puter-actions">
            {account.signedIn ? (
              <button type="button" disabled={isBusy} onClick={handleSignOut}>
                {activeTask === "signout" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="size-4" aria-hidden="true" />
                )}
                <span>Sign Out</span>
              </button>
            ) : (
              <button type="button" disabled={isBusy} onClick={handleSignIn}>
                {activeTask === "signin" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="size-4" aria-hidden="true" />
                )}
                <span>Sign In</span>
              </button>
            )}

            <button type="button" disabled={isBusy} onClick={refreshAccount}>
              {activeTask === "account" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCcw className="size-4" aria-hidden="true" />
              )}
              <span>Refresh</span>
            </button>
          </div>

          <div className="puter-status">
            <p className="label">Status</p>
            <p>{status}</p>
          </div>
        </aside>

        <section className="puter-workspace">
          <div className="puter-panel cloud-note">
            <div className="panel-heading">
              <FileText className="size-4" aria-hidden="true" />
              <h3>Cloud Note</h3>
            </div>
            <textarea
              aria-label="Cloud note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="button-row">
              <button type="button" disabled={isBusy} onClick={handleSaveNote}>
                {activeTask === "save" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                <span>Save</span>
              </button>
              <button type="button" disabled={isBusy} onClick={handleLoadNote}>
                {activeTask === "load" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCcw className="size-4" aria-hidden="true" />
                )}
                <span>Load</span>
              </button>
            </div>
          </div>

          <div className="puter-panel ai-panel">
            <div className="panel-heading">
              <Bot className="size-4" aria-hidden="true" />
              <h3>Puter AI</h3>
            </div>
            <textarea
              aria-label="Puter AI prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button type="button" disabled={isBusy} onClick={handleAskAI}>
              {activeTask === "ai" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              <span>Ask</span>
            </button>
            {aiAnswer ? <p className="ai-answer">{aiAnswer}</p> : null}
          </div>

          <div className="puter-panel files-panel">
            <div className="panel-heading">
              <Cloud className="size-4" aria-hidden="true" />
              <h3>Files</h3>
              <button
                type="button"
                aria-label="Refresh cloud files"
                disabled={isBusy}
                onClick={refreshFiles}
              >
                {activeTask === "files" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCcw className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <ul>
              {cloudFiles.length ? (
                cloudFiles.slice(0, 5).map((item) => (
                  <li key={item.uid ?? item.path ?? item.name}>
                    <FileText className="size-4" aria-hidden="true" />
                    <span>{item.name ?? item.path}</span>
                  </li>
                ))
              ) : (
                <li className="empty">
                  <FileText className="size-4" aria-hidden="true" />
                  <span>No files</span>
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
};

const PuterCloudWindow = WindowWrapper(PuterCloud, "puter");

export default PuterCloudWindow;
