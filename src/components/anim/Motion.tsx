"use client";
import { motion, useAnimationControls, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

// One easing for the whole site: a quick start that settles softly, like the gradients themselves.
const EASE = [0.22, 1, 0.36, 1] as const;

const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

/** The hero copy: badge, headline word by word, then the line and the buttons. */
export function HeroCopy({ badge, words, sub, actions }: { badge: ReactNode; words: ReactNode[]; sub: ReactNode; actions: ReactNode }) {
  const still = useReducedMotion();
  return (
    <motion.div variants={group} initial={still ? false : "hidden"} animate="show" className="flex flex-col items-center">
      <motion.p variants={rise} className="mb-6 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur">{badge}</motion.p>
      <h1 className="max-w-5xl text-5xl leading-[1.05] tracking-tight sm:text-7xl lg:text-[5.5rem]">
        {words.map((w, i) => (
          <span key={i}>
            <motion.span variants={rise} className="inline-block">{w}</motion.span>{" "}
          </span>
        ))}
      </h1>
      <motion.p variants={rise} className="mt-6 max-w-2xl text-lg text-white/75">{sub}</motion.p>
      <motion.div variants={rise} className="mt-10 flex flex-wrap justify-center gap-3">{actions}</motion.div>
    </motion.div>
  );
}

/**
 * Fades and lifts its content in the first time it scrolls into view. The server renders it visible, so the content is
 * there for crawlers and if scripts fail; only blocks still below the fold are hidden once the page is running.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const still = useReducedMotion();
  const seen = useInView(ref, { once: true, margin: "-80px" });
  const waiting = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (still || !el || el.getBoundingClientRect().top < innerHeight) return;
    waiting.current = true;
    controls.set({ opacity: 0, y: 36 });
  }, [controls, still]);
  useEffect(() => {
    if (seen && waiting.current) controls.start({ opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE, delay } });
  }, [seen, controls, delay]);
  return (
    <motion.div ref={ref} className={className} animate={controls}>
      {children}
    </motion.div>
  );
}

/** An endless, slow strip of words (the layer names). Holds still for reduced motion. */
export function Marquee({ items }: { items: string[] }) {
  const still = useReducedMotion();
  const row = (hidden?: boolean) => (
    <div aria-hidden={hidden} className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((t) => (
        <span key={t} className="flex items-center gap-10 whitespace-nowrap text-2xl tracking-tight text-white/40">
          {t}
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/25" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <motion.div className="flex w-max" animate={still ? undefined : { x: ["0%", "-50%"] }} transition={{ duration: 60, ease: "linear", repeat: Infinity }}>
        {row()}
        {row(true)}
      </motion.div>
    </div>
  );
}
