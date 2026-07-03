"use client";

import { useEffect, useState } from "react";

/** Desktop 6 · large desktop 7 · tablet 4 · mobile 2 */
export function useColumnCount(): number {
  const [columns, setColumns] = useState(6);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1536) setColumns(7);
      else if (w >= 1024) setColumns(6);
      else if (w >= 768) setColumns(4);
      else setColumns(2);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}
