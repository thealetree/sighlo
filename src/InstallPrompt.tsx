import { useEffect, useState } from "react";

const DISMISS_KEY = "sighlo:install-dismissed:v1";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true;

const isIosSafari = () => {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua); // non-Safari iOS browsers can't add to home screen
  return iOS && !otherBrowser;
};

// Share glyph matching the one iOS shows in Safari's toolbar.
const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "true") return;

    // Android / desktop Chrome: capture the native prompt so we can trigger it on tap.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari never fires that event, so show manual instructions after a beat.
    let timer: number | undefined;
    if (isIosSafari()) timer = window.setTimeout(() => setVisible(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="install-prompt" role="dialog" aria-modal="false" aria-labelledby="install-prompt-title">
      <div className="install-head">
        <span aria-hidden="true">🗞️</span>
        <h3 id="install-prompt-title">Make Sighlo feel at home</h3>
      </div>
      {deferred ? (
        <>
          <p>Install Sighlo for a cleaner, full-screen read that opens straight from your home screen.</p>
          <div className="install-actions">
            <button type="button" className="install-primary" onClick={() => void install()}>Install</button>
            <button type="button" className="install-dismiss" onClick={dismiss}>Not now</button>
          </div>
        </>
      ) : (
        <>
          <p>Save Sighlo to your home screen for a cleaner, full-screen read (no browser bars). Takes two taps:</p>
          <ol className="install-steps">
            <li><span className="install-step">1</span><span>Tap the <span className="install-share"><ShareIcon /></span> Share button</span></li>
            <li><span className="install-step">2</span><span>Scroll and tap <strong>“Add to Home Screen”</strong></span></li>
          </ol>
          <button type="button" className="install-dismiss install-dismiss-wide" onClick={dismiss}>Got it</button>
        </>
      )}
    </div>
  );
}
