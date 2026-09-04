"use client";

import { useMotionValue, useSpring } from "framer-motion";
import type { MouseEvent } from "react";

const MAX_TILT = 6; // degrees — subtle, not gimmicky

export function useTilt() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(rawX, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rawY, { stiffness: 200, damping: 20 });

  function onMouseMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawY.set((px - 0.5) * MAX_TILT * 2);
    rawX.set((0.5 - py) * MAX_TILT * 2);
  }

  function onMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return { rotateX, rotateY, onMouseMove, onMouseLeave };
}