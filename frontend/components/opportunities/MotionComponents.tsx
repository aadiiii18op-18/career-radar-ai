"use client";

import { useRef, useEffect } from "react";
import { motion, useInView, animate, useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({ value, duration = 1.2, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Direct render if reduced motion is enabled or element not in view
    if (shouldReduceMotion || !isInView) {
      node.textContent = `${prefix}${value.toLocaleString()}${suffix}`;
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1] as const, // Premium easeOutExpo ease curve
      onUpdate(currentVal) {
        node.textContent = `${prefix}${Math.round(currentVal).toLocaleString()}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [value, duration, prefix, suffix, isInView, shouldReduceMotion]);

  return <span ref={nodeRef}>{prefix}0{suffix}</span>;
}

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
}

export function ScrollReveal({ children, delay = 0 }: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay }}
    >
      {children}
    </motion.div>
  );
}
