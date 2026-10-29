import { lazy, Suspense } from "react";
import BrandedLoader from "./BrandedLoader";

const Player = lazy(() => import("react-player"));

export default function VideoPlayer(props) {
  return <Suspense fallback={<div className="flex aspect-video items-center justify-center"><BrandedLoader variant="inline" /></div>}>
    <Player preload="none" {...props} />
  </Suspense>;
}
