const recoveryKey = "msime:module-recovery";
let recovery: Promise<boolean> | undefined;

function appScript(document: Document) {
  return [...document.querySelectorAll<HTMLScriptElement>("script[src]")]
    .map(script => script.getAttribute("src"))
    .find(src => src && /\/assets\/app-[\w-]+\.js$/.test(src));
}

// Run only after a failed navigation or bootstrap, never for hover prefetches.
export function recoverUpdatedPage(error: unknown): Promise<boolean> {
  if (!(error instanceof Error) || !/dynamically imported module|importing a module script|loading chunk|module script failed|preload css/i.test(error.message)) return Promise.resolve(false);
  if (recovery) return recovery;
  recovery = (async () => {
    try {
      const previous = Number(sessionStorage.getItem(recoveryKey));
      if (previous && Date.now() - previous < 60_000) return false;
      const current = appScript(document);
      if (!current) return false;
      const response = await fetch(window.location.href, { cache: "no-store", headers: { Accept: "text/html" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return false;
      const next = appScript(new DOMParser().parseFromString(await response.text(), "text/html"));
      if (!next || next === current) return false;
      sessionStorage.setItem(recoveryKey, String(Date.now()));
      window.location.reload();
      return true;
    } catch { return false; }
  })().finally(() => { recovery = undefined; });
  return recovery;
}

