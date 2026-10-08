"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";

const ROTATE_MS = 3000;

let keyboardIntent = false;
let intentUsers = 0;
let detachIntent: (() => void) | null = null;

function retainKeyboardIntent() {
  intentUsers += 1;
  if (!detachIntent) {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Tab" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key.startsWith("Arrow")
      ) {
        keyboardIntent = true;
      }
    };
    const onPointerDown = () => {
      keyboardIntent = false;
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    detachIntent = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      detachIntent = null;
    };
  }
  return () => {
    intentUsers -= 1;
    if (intentUsers <= 0) {
      intentUsers = 0;
      detachIntent?.();
    }
  };
}

/**
 * One interval per hook instance. Starts after mount so server and client
 * markup match. Hover (mouse) and keyboard focus pause; pointer clicks do not.
 */
export function useHomeAutoCycle(length: number) {
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => retainKeyboardIntent(), []);

  const paused = hoverPaused || focusPaused;

  useEffect(() => {
    if (paused || length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, length, epoch]);

  const select = useCallback(
    (next: number) => {
      if (length < 1) return;
      const normalized = ((next % length) + length) % length;
      setIndex(normalized);
      setEpoch((value) => value + 1);
    },
    [length],
  );

  const onPointerEnter = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setHoverPaused(true);
  }, []);

  const onPointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setHoverPaused(false);
  }, []);

  const onFocusCapture = useCallback(() => {
    if (keyboardIntent) setFocusPaused(true);
  }, []);

  const onPointerDown = useCallback(() => {
    setFocusPaused(false);
  }, []);

  const onBlurCapture = useCallback((event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setFocusPaused(false);
    }
  }, []);

  return {
    index,
    select,
    interaction: {
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onFocusCapture,
      onBlurCapture,
    },
  };
}
