import { useLayoutEffect, useRef } from "react";
export function PageTransitionFocusManager({
  pageKey,
  title,
  headingId,
}: {
  pageKey: string;
  title: string;
  headingId: string;
}) {
  const previous = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    document.title = `${title} | ABCs`;
    if (previous.current === pageKey) return;
    previous.current = pageKey;
    document.getElementById(headingId)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document
      .getElementById("main-content")
      ?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  }, [pageKey, title, headingId]);
  return null;
}
