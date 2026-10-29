import { useCallback, useEffect, useRef, useState } from "react";
import { useGetGoogleAuthConfigQuery, useGoogleSignInMutation, useStartGoogleSignInMutation } from "@/features/api/authApi";
import { loadGoogleIdentity } from "@/lib/googleIdentity";
import { useLanguage } from "./languageContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import BrandedLoader from "./BrandedLoader";

const errorKeys = {
  GOOGLE_EXPIRED: "googleExpired", GOOGLE_LINK_PASSWORD_INVALID: "googleWrongPassword",
  GOOGLE_ACCOUNT_CONFLICT: "googleAccountConflict", ACCOUNT_SUSPENDED: "googleSuspended",
  GOOGLE_UNAVAILABLE: "googleUnavailable",
};

export default function GoogleSignIn({ onSuccess, onVerification, disabled = false, onBusyChange }) {
  const { t, language } = useLanguage();
  const { data: config, isLoading: configLoading, isError: configError, refetch } = useGetGoogleAuthConfigQuery();
  const [start] = useStartGoogleSignInMutation();
  const [signIn] = useGoogleSignInMutation();
  const container = useRef(null);
  const attempt = useRef(null);
  const credential = useRef("");
  const handler = useRef(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [sdk, setSdk] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkRequired, setLinkRequired] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; credential.current = ""; }; }, []);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);

  const finish = useCallback(async (token, linkPassword) => {
    if (inFlight.current || disabled || !attempt.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await signIn({ credential: token, nonce: attempt.current.nonce, ...(linkPassword ? { password: linkPassword } : {}) }).unwrap();
      if (!mounted.current) return;
      credential.current = "";
      setPassword("");
      if (data.requiresEmailVerification) onVerification(data);
      else onSuccess();
    } catch (failure) {
      if (!mounted.current) return;
      const code = failure?.data?.code;
      if (code === "GOOGLE_LINK_REQUIRED") {
        credential.current = token;
        setLinkRequired(true);
      } else if (code === "GOOGLE_VERIFY_EMAIL") {
        credential.current = "";
        onVerification({ email: failure.data.email });
      } else {
        setError(errorKeys[code] || "googleFailed");
        if (code !== "GOOGLE_LINK_PASSWORD_INVALID") {
          credential.current = "";
          setLinkRequired(false);
          setPassword("");
        }
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [disabled, onSuccess, onVerification, signIn]);

  useEffect(() => { handler.current = (response) => { if (response?.credential) finish(response.credential); }; }, [finish]);

  useEffect(() => {
    if (!config?.enabled) return;
    let cancelled = false;
    setSdk(null);
    setError("");
    const prepare = async () => {
      try {
        const google = await loadGoogleIdentity();
        if (cancelled) return;
        const challenge = await start().unwrap();
        if (cancelled) return;
        attempt.current = challenge;
        google.initialize({ client_id: challenge.clientId, nonce: challenge.nonce,
          callback: (response) => handler.current?.(response), auto_select: false,
          ux_mode: "popup", button_auto_select: false });
        setSdk(google);
      } catch { if (!cancelled) setError("googleUnavailable"); }
    };
    prepare();
    return () => { cancelled = true; attempt.current = null; };
  }, [config?.enabled, generation, start]);

  useEffect(() => {
    if (!sdk || !container.current || linkRequired) return;
    const target = container.current;
    let lastWidth = -1;
    const render = () => {
      const width = Math.min(360, Math.floor(target.clientWidth || 280));
      if (width === lastWidth) return;
      lastWidth = width;
      target.replaceChildren();
      sdk.renderButton(target, { type: "standard", theme: "outline", size: "large", text: "continue_with",
        shape: "pill", locale: language || "en", width });
    };
    render();
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(render) : null;
    resize?.observe(target);
    return () => { resize?.disconnect(); target.replaceChildren(); };
  }, [sdk, language, linkRequired]);

  const retry = () => {
    credential.current = "";
    setPassword("");
    setLinkRequired(false);
    setError("");
    if (configError) refetch();
    else setGeneration((value) => value + 1);
  };

  if (!configLoading && !configError && !config?.enabled) return null;

  return (
    <div className="space-y-4 px-1 pt-4 text-[#163638] dark:text-[#edf7f1]">
      {linkRequired ? (
        <form onSubmit={(event) => { event.preventDefault(); if (password) finish(credential.current, password); }} className="space-y-3 rounded-2xl border border-[#c8ddd3] bg-white p-4 dark:border-[#2a5552] dark:bg-[#102c2f]">
          <p className="text-sm leading-6">{t("googleLinkRequired")}</p>
          <Label htmlFor="google-link-password">{t("googleExistingPassword")}</Label>
          <Input id="google-link-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy || disabled} maxLength={1024} required className="border-[#c8ddd3] bg-[#f4f8f5] dark:border-[#2a5552] dark:bg-[#15383a]" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!password || busy || disabled} className="bg-[#126252] text-white hover:bg-[#0b2528] dark:bg-teal-200 dark:text-[#12383a]">{busy ? t("pleaseWait") : t("googleLinkConfirm")}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={retry}>{t("googleCancel")}</Button>
          </div>
        </form>
      ) : (
        <div aria-busy={busy}>
          <div className="relative h-11">
            <div ref={container} className={`mx-auto flex h-full w-full max-w-[360px] items-center justify-center overflow-hidden ${busy || disabled ? "pointer-events-none opacity-50" : ""}`} inert={busy || disabled ? true : undefined} />
            {!sdk && !error && !configError && <BrandedLoader variant="inline" className="pointer-events-none absolute inset-0" />}
          </div>
          {busy && <p role="status" className="mt-2 text-center text-sm">{t("pleaseWait")}</p>}
        </div>
      )}
      {(error || configError) && <div role="alert" className="text-center text-sm leading-6"><p>{t(error || "googleUnavailable")}</p>{error !== "googleWrongPassword" && <button type="button" onClick={retry} disabled={busy} className="font-semibold text-[#126252] underline underline-offset-4 dark:text-teal-200">{t("retry")}</button>}</div>}
      <div className="flex items-center gap-3 text-xs text-[#526d65] dark:text-[#a8c6bc]"><span className="h-px flex-1 bg-[#c8ddd3] dark:bg-[#2a5552]" /><span>{t("googleOrEmail")}</span><span className="h-px flex-1 bg-[#c8ddd3] dark:bg-[#2a5552]" /></div>
    </div>
  );
}
