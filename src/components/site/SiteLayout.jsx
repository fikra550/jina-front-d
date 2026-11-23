// components/site/SiteLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import "../../lib/JinaTheme";

const css = `
.jl{min-height:100vh;display:flex;flex-direction:column;background:var(--desk);color:var(--text)}
.jl-main{flex:1;padding-top:var(--hdr,4.5rem)}
`;

export default function SiteLayout() {
  return (
    <>
      <style>{css}</style>
      <div className="jl">
        <SiteHeader />
        <main className="jl-main">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}