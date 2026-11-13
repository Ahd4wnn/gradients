"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

/**
 * Scroll-linked effects for the landing page, driven by GSAP ScrollTrigger. Elements opt in with data-fx attributes,
 * so the page itself stays a server component. Everything is skipped when the visitor prefers reduced motion.
 */
export function ScrollFx() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const hero = { trigger: "[data-fx=hero]", start: "top top", end: "bottom top", scrub: true };
      // depth: the gradient sinks and grows slower than the page, while the copy lifts away faster
      gsap.to("[data-fx=hero-bg]", { yPercent: 16, scale: 1.08, ease: "none", scrollTrigger: hero });
      gsap.to("[data-fx=hero-copy]", { yPercent: -35, opacity: 0, ease: "none", scrollTrigger: hero });

      // gallery cards rise in small waves as each row arrives
      gsap.set("[data-fx=card]", { opacity: 0, y: 48 });
      ScrollTrigger.batch("[data-fx=card]", {
        start: "top 92%",
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", overwrite: true }),
      });

      // the large artwork panels drift a little against the scroll
      gsap.utils.toArray<HTMLElement>("[data-fx=drift]").forEach((el) =>
        gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
      );
    });
    return () => mm.revert();
  }, []);
  return null;
}
