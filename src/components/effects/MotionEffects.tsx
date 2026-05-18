"use client";

import { useEffect } from "react";

export function MotionEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const item = entry.target as HTMLElement;
          const delay = Number(item.dataset.stagger || "0");
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
          item.style.filter = "none";
          item.style.transitionDelay = `${delay}ms`;
          item.style.transition = reduced
            ? "opacity 180ms linear"
            : "opacity 520ms cubic-bezier(0.22, 1, 0.36, 1), transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
          obs.unobserve(item);
        });
      },
      { threshold: 0.12 }
    );
    revealItems.forEach((item) => {
      item.style.opacity = "0";
      item.style.transform = reduced ? "none" : "translateY(22px)";
      item.style.filter = "none";
      revealObserver.observe(item);
    });

    const parallaxItems = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let ticking = false;
    const onScroll = () => {
      if (reduced || mobile) return;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        parallaxItems.forEach((item) => {
          const speed = Number(item.dataset.parallax || 0.2);
          item.style.transform = `translate3d(0, ${Math.round(y * speed * -0.2)}px, 0)`;
        });
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const floatItems = Array.from(document.querySelectorAll<HTMLElement>("[data-float]"));
    floatItems.forEach((item) => {
      if (reduced || mobile) return;
      item.style.animation = "taj-float 6s ease-in-out infinite";
      item.style.animationDelay = `${Number(item.dataset.float || "0")}ms`;
    });

    const magneticItems = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const magneticCleanups: Array<() => void> = [];
    magneticItems.forEach((item) => {
      if (reduced || mobile) return;
      item.style.transition = "transform 180ms ease-out";
      const onMove = (e: MouseEvent) => {
        const rect = item.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        item.style.transform = `translate3d(${Math.round(px * 4)}px, ${Math.round(py * 3)}px, 0)`;
      };
      const onLeave = () => {
        item.style.transform = "translate3d(0, 0, 0)";
      };
      item.addEventListener("mousemove", onMove);
      item.addEventListener("mouseleave", onLeave);
      magneticCleanups.push(() => {
        item.removeEventListener("mousemove", onMove);
        item.removeEventListener("mouseleave", onLeave);
      });
    });

    const tiltItems = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"));
    const tiltCleanups: Array<() => void> = [];
    parallaxItems.forEach((item) => {
      item.style.willChange = "transform";
    });
    tiltItems.forEach((item) => {
      if (reduced || mobile) return;
      item.style.transformStyle = "preserve-3d";
      item.style.transition = "transform 240ms ease-out";
      const onMove = (e: MouseEvent) => {
        const rect = item.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        item.style.transform = `perspective(800px) rotateY(${px * 7}deg) rotateX(${py * -7}deg)`;
      };
      const onLeave = () => {
        item.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
      };
      item.addEventListener("mousemove", onMove);
      item.addEventListener("mouseleave", onLeave);
      tiltCleanups.push(() => {
        item.removeEventListener("mousemove", onMove);
        item.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      tiltCleanups.forEach((cleanup) => cleanup());
      magneticCleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
