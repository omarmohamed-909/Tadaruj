import { useEffect, useRef, useState } from "react";

// Native lazy loading may fetch images several screens away. These noncritical
// avatars and footer marks can wait until they are close to the viewport.
export default function DeferredImage({ src, alt = "", ...props }) {
  const image = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    if (image.current) observer.observe(image.current);
    return () => observer.disconnect();
  }, []);
  return <img {...props} ref={image} src={visible ? src : undefined} alt={alt} loading="lazy" decoding="async" />;
}
