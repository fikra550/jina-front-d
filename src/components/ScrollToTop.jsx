// src/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // "instant" avoids the weird animated scroll on route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search]); // also fires when ?filter=notifications changes

  return null;
}