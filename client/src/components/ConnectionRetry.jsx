import { useShellText } from "./useShellText";

export default function ConnectionRetry({ onRetry }) {
  const text = useShellText();
  return <section role="alert" className="flex min-h-[45vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
    <h1 className="text-xl font-semibold text-foreground">{text("Could not check your connection.")}</h1>
    <p className="max-w-md text-sm leading-7 text-muted-foreground">{text("Your connection may be slow or temporarily unavailable. Try again to continue.")}</p>
    <button type="button" onClick={onRetry} className="min-h-11 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">{text("Try again")}</button>
  </section>;
}
