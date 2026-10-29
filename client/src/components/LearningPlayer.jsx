import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { useSaveLearningPositionMutation } from "@/features/api/courseProgressApi";
import { useLanguage } from "./languageContext";
import { useStore } from "react-redux";

export default function LearningPlayer({ accountId, courseId, lectureId, initialPosition = 0, onEnded, ...props }) {
  const store = useStore();
  const { language } = useLanguage();
  const [save] = useSaveLearningPositionMutation();
  const [failed, setFailed] = useState(false);
  const [rate, setRate] = useState(1);
  const initial = useRef(initialPosition);
  const restored = useRef(false);
  const player = useRef(null);
  const latest = useRef(null);
  const lastSave = useRef(0);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const persist = useRef(null);
  persist.current = () => {
    if (!latest.current) return;
    const snapshot = latest.current;
    lastSave.current = Date.now();
    queue.current = queue.current.catch(() => {}).then(() => {
      // A pending save from an unmounted player must never use a different account's session.
      if (store.getState().auth.user?._id !== accountId) return;
      return save({ courseId, lectureId, ...snapshot }).unwrap();
    })
      .then(() => { if (mounted.current) setFailed(false); })
      .catch(() => { if (mounted.current) setFailed(true); });
  };
  useEffect(() => {
    mounted.current = true;
    const flush = () => { if (document.visibilityState === "hidden") persist.current(); };
    document.addEventListener("visibilitychange", flush);
    return () => { mounted.current = false; document.removeEventListener("visibilitychange", flush); persist.current(); };
  }, []);
  const restore = () => {
    const media = player.current;
    if (!media || restored.current || !Number.isFinite(media.duration) || media.duration <= 0) return;
    restored.current = true;
    if (initial.current > 0 && initial.current < media.duration - Math.min(2, media.duration * 0.02)) media.currentTime = initial.current;
  };
  const capture = (force = false) => {
    const media = player.current;
    if (!restored.current || !media || !Number.isFinite(media.duration) || media.duration <= 0 || !Number.isFinite(media.currentTime)) return;
    latest.current = { position: Math.min(media.duration, Math.max(0, media.currentTime)), duration: media.duration };
    if (force || Date.now() - lastSave.current >= 15000) persist.current();
  };
  const ar = language === "ar";
  return <div>
    <VideoPlayer {...props} ref={player} playbackRate={rate} onLoadedMetadata={restore} onCanPlay={restore} onDurationChange={restore}
      onTimeUpdate={() => capture()} onPause={() => capture(true)} onSeeked={() => capture(true)}
      onEnded={() => { capture(true); onEnded?.(); }} />
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 text-sm text-muted-foreground">
      <label className="flex items-center gap-2">{ar ? "سرعة التشغيل" : "Playback speed"}
        <select aria-label={ar ? "سرعة التشغيل" : "Playback speed"} value={rate} onChange={event => setRate(Number(event.target.value))} className="rounded-md border border-border bg-background px-2 py-1 text-foreground">
          {[0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
        </select>
      </label>
      <span role={failed ? "status" : undefined}>{failed ? (ar ? "تعذّر حفظ مكانك. أعد المحاولة." : "Could not save your place. Try again.") : (ar ? "مكانك بيتحفظ أثناء المشاهدة" : "Your place saves as you watch")}</span>
      {failed && <button onClick={() => capture(true)} className="font-semibold text-primary underline">{ar ? "إعادة المحاولة" : "Retry"}</button>}
    </div>
  </div>;
}
