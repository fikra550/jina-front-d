// components/site/navlink.jsx
import React, { forwardRef } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";

// Active links become the red contract pill (same look as the header).
const css = `
.nav-link-active{background:var(--red,#e5202e);color:#fff!important;font-weight:800}
`;

if (typeof document !== "undefined" && !document.getElementById("navlink-styles")) {
  const style = document.createElement("style");
  style.id = "navlink-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

export const NavLink = forwardRef(
  ({ className, activeClassName = "nav-link-active", pendingClassName = "", to, ...props }, ref) => (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) => {
        let base = (typeof className === "function" ? className({ isActive, isPending }) : className) || "";
        if (isActive && activeClassName) base += ` ${activeClassName}`;
        if (isPending && pendingClassName) base += ` ${pendingClassName}`;
        return base.trim();
      }}
      {...props}
    />
  )
);

NavLink.displayName = "NavLink";