"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type SyntheticEvent } from "react";

declare global {
  interface Window {
    /** Set by INTRO_SCRIPT before the first paint. */
    __ripIntroOff?: boolean;
  }
}

const STORAGE_KEY = "rip-intro-seen";

/**
 * Runs in <head> while the HTML is parsed, so the decision is made before the
 * first paint: the intro plays once per browser session, never when the visitor
 * asked for reduced motion, and never when storage is unavailable.
 */
export const INTRO_SCRIPT = `(function(){var off=true;try{off=!!sessionStorage.getItem("${STORAGE_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches;if(!off)sessionStorage.setItem("${STORAGE_KEY}","1")}catch(e){}window.__ripIntroOff=off;if(off)document.documentElement.setAttribute("data-intro","off")})()`;

const noSubscription = () => () => {};
const introOff = () => window.__ripIntroOff !== false;

/**
 * Short intro video shown on arrival. It covers the page while the map loads,
 * can be skipped (button, click, Escape) and hides itself even if JavaScript or
 * autoplay fails (CSS animation in globals.css).
 */
export default function IntroSplash() {
  // The server always renders the overlay; the CSS hides it at once when INTRO_SCRIPT said "off".
  const off = useSyncExternalStore(noSubscription, introOff, () => false);
  const [phase, setPhase] = useState<"playing" | "leaving" | "gone">("playing");
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (off || phase !== "playing") return;
    const leave = () => setPhase("leaving");
    // Autoplay refused (e.g. power saving): leave rather than show a frozen frame.
    video.current?.play().catch(leave);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [off, phase]);

  if (off || phase === "gone") return null;

  const leave = () => setPhase("leaving");
  const onFadeEnd = (event: SyntheticEvent) => {
    if (event.target === event.currentTarget) setPhase("gone");
  };

  return (
    <div
      className="intro-splash fixed inset-0 z-[3000] flex items-center justify-center bg-[#11120f]"
      data-leaving={phase === "leaving" || undefined}
      onClick={leave}
      onTransitionEnd={onFadeEnd}
      onAnimationEnd={onFadeEnd}
    >
      <video
        ref={video}
        src="/rip-advisor-loader.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        onEnded={leave}
        onError={leave}
        className="w-full max-w-4xl"
      />
      <button
        type="button"
        onClick={leave}
        className="absolute right-4 bottom-4 rounded-md border border-mist px-4 py-2 text-ash transition-colors hover:bg-vault hover:text-bone"
      >
        Passer l&apos;intro
      </button>
    </div>
  );
}
