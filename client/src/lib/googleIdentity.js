let scriptPromise;

export function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      scriptPromise = undefined;
      reject(new Error("Google Identity Services unavailable"));
    };
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else fail();
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
