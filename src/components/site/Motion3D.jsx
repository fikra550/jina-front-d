// components/site/Motion3D.jsx
import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

// Motion is kept calm: a short rise on reveal, no scroll-driven 3D tilt on content.
// All exports keep the same names so existing imports (Cars, Contact, About) still work.

export function ParallaxSection({ children, className = "" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, y = 18 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Cards lift like a sheet of paper (no 3D rotation).
export function TiltCard({ children, className = "" }) {
  return (
    <div className={className} style={{ transition: "transform .2s ease" }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
      {children}
    </div>
  );
}