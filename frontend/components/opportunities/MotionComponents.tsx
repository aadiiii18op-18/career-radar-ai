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

export function ShimmerSkeletonCard() {
  return (
    <div className="shimmer-sweep w-[310px] shrink-0 sm:w-[340px] rounded-2xl border border-white/5 bg-white/[0.01] p-6 space-y-5">
      {/* Category badge skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-20 rounded bg-white/5" />
        <div className="h-4 w-12 rounded bg-white/5" />
      </div>
      
      {/* Title skeleton */}
      <div className="space-y-2 pt-2">
        <div className="h-5 w-4/5 rounded bg-white/5" />
        <div className="h-4 w-1/3 rounded bg-white/5" />
      </div>
      
      {/* Description skeleton */}
      <div className="space-y-2 pt-1">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
        <div className="h-3 w-2/3 rounded bg-white/5" />
      </div>

      {/* Action / footer skeleton */}
      <div className="flex items-center justify-between pt-5 border-t border-white/5">
        <div className="h-4 w-24 rounded bg-white/5" />
        <div className="h-7 w-16 rounded-full bg-white/5" />
      </div>
    </div>
  );
}

export function FloatingBlob() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Blob 1 */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 left-1/12 w-72 h-72 rounded-full bg-indigo-500/4 blur-[100px]"
      />
      {/* Blob 2 */}
      <motion.div
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.92, 1.08, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-1/4 right-1/12 w-80 h-80 rounded-full bg-cyan-500/4 blur-[100px]"
      />
    </div>
  );
}

interface AnimatedMatchScoreProps {
  value: number;
  duration?: number;
}

export function AnimatedMatchScore({ value, duration = 1.0 }: AnimatedMatchScoreProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-20px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (shouldReduceMotion || !isInView) {
      node.textContent = `${value}`;
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1] as const,
      onUpdate(currentVal) {
        node.textContent = `${Math.round(currentVal)}`;
      },
    });

    return () => controls.stop();
  }, [value, duration, isInView, shouldReduceMotion]);

  return <span ref={nodeRef}>0</span>;
}

