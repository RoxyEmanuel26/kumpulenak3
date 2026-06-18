"use client";

import { useEffect, useState } from "react";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    // Disable custom cursor on mobile touch screens
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setHidden(false);

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
      setHidden(true);
    };

    const handleMouseEnter = () => {
      setHidden(false);
    };

    // Detect hovers on clickable elements to make the ring scale up
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isClickable = 
        target.tagName === "A" || 
        target.tagName === "BUTTON" || 
        target.closest("a") || 
        target.closest("button") || 
        target.closest('[role="button"]') ||
        target.classList.contains("cursor-pointer");
      
      setHovered(!!isClickable);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  // Smooth trail effect
  useEffect(() => {
    if (hidden) return;

    let animFrameId: number;

    const updateTrail = () => {
      setTrail((prev) => {
        const dx = position.x - prev.x;
        const dy = position.y - prev.y;
        return {
          x: prev.x + dx * 0.15,
          y: prev.y + dy * 0.15,
        };
      });
      animFrameId = requestAnimationFrame(updateTrail);
    };

    animFrameId = requestAnimationFrame(updateTrail);

    return () => cancelAnimationFrame(animFrameId);
  }, [position, hidden]);

  if (hidden) return null;

  return (
    <>
      {/* Inner Dot */}
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-primary rounded-full pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -50%) scale(${hovered ? 0.5 : 1})`,
        }}
      />
      {/* Outer Ring */}
      <div
        className="fixed top-0 left-0 w-8 h-8 border border-primary/45 rounded-full pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-out"
        style={{
          left: `${trail.x}px`,
          top: `${trail.y}px`,
          transform: `translate(-50%, -50%) scale(${hovered ? 1.6 : 1})`,
          backgroundColor: hovered ? "rgba(192, 57, 43, 0.05)" : "transparent",
          borderColor: hovered ? "rgba(192, 57, 43, 0.8)" : "rgba(192, 57, 43, 0.35)",
        }}
      />
    </>
  );
}
