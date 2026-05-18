"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  className?: string;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function shouldDisable3DOnDevice() {
  if (typeof window === "undefined") return true;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrow = window.matchMedia?.("(max-width: 1023px)")?.matches ?? false;
  return coarse || narrow;
}

export function Hero3DScene({ className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (prefersReducedMotion()) return;
    if (shouldDisable3DOnDevice()) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0, 0.2, 7.4);

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xa7f3d0, 1.15);
    key.position.set(2.8, 2.2, 3.0);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x0f766e, 0.85);
    fill.position.set(-3.1, 0.8, 2.2);
    scene.add(fill);

    const rim = new THREE.PointLight(0x22c55e, 1.1, 18, 2);
    rim.position.set(0, 1.4, 5.2);
    scene.add(rim);

    // Twisted hero object (no balls): glass torus knot + subtle wireframe.
    const knotGeo = new THREE.TorusKnotGeometry(1.35, 0.42, 150, 12, 2, 3);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x22c55e),
      roughness: 0.12,
      metalness: 0.08,
      transmission: 1,
      thickness: 1.05,
      ior: 1.28,
      transparent: true,
      opacity: 0.72,
      specularIntensity: 0.95,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.set(0, 0.05, 0);
    root.add(knot);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.22, wireframe: true });
    const wire = new THREE.Mesh(knotGeo, wireMat);
    wire.position.copy(knot.position);
    root.add(wire);

    const plateGeo = new THREE.PlaneGeometry(18, 10, 1, 1);
    const plateMat = new THREE.MeshBasicMaterial({
      color: 0x0b0f14,
      transparent: true,
      opacity: 0.0
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0, -6);
    root.add(plate);

    let pointerX = 0;
    let pointerY = 0;
    const onMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
      pointerX = (x - 0.5) * 2;
      pointerY = (y - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    host.appendChild(renderer.domElement);

    let isVisible = true;
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries.some((en) => en.isIntersecting);
      },
      { threshold: 0.05 }
    );
    io.observe(host);

    const onVis = () => {
      isVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // FPS cap ~ 40 for luxury smoothness without burning CPU.
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const frameMs = 1000 / 40;

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      if (!isVisible) return;
      if (now - last < frameMs) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // Subtle camera drift + pointer parallax.
      camera.position.x += (pointerX * 0.28 - camera.position.x) * 0.06;
      camera.position.y += (-pointerY * 0.22 + 0.2 - camera.position.y) * 0.06;
      camera.lookAt(0, 0, 0);

      root.rotation.y = pointerX * 0.08;
      root.rotation.x = -pointerY * 0.05;

      knot.rotation.y += dt * 0.28;
      knot.rotation.x += dt * 0.12;
      wire.rotation.y = knot.rotation.y * 1.02;
      wire.rotation.x = knot.rotation.x * 0.98;
      const pulse = 1 + Math.sin(t * 0.7) * 0.015;
      knot.scale.setScalar(pulse);
      wire.scale.setScalar(pulse * 1.002);

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("mousemove", onMove);
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      knotGeo.dispose();
      plateGeo.dispose();
      (plate.material as any).dispose?.();
      (knot.material as any).dispose?.();
      (wire.material as any).dispose?.();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={className ?? "pointer-events-none absolute inset-0 -z-10"}
      style={{
        maskImage: "radial-gradient(closest-side, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
        WebkitMaskImage: "radial-gradient(closest-side, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)"
      }}
    />
  );
}

