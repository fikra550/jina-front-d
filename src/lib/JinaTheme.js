// lib/jinaTheme.js
// "Le Contrat": the whole site is built like the printed Jina Business rental contract.
// Paper sheets, red/black section pills, dotted fill-in lines, handwritten values,
// signature boxes, fuel gauges and the red/blue double stripe.
// Import once per page/component:  import "../lib/jinaTheme";

const css = `
:root{
  --ink:#0a0a0a; --red:#e5202e; --red-d:#b8121e; --blue:#1b9ce5; --blue-d:#1279b3;
  --paper:#ffffff; --desk:#e6e9ee; --text:#0a0a0a; --muted:#5a5a64;
  --rule:#b9bdc6; --edge:#d3d6dd; --field:#ffffff; --pen:#1279b3;
  --f-disp:'Archivo','Cairo',system-ui,sans-serif; --f-hand:'Caveat','Cairo',cursive;
}
@media (prefers-color-scheme: dark){
  :root{ --paper:#121214; --desk:#050506; --text:#f4f4f5; --muted:#a1a1aa; --rule:#43434b; --edge:#26262c; --field:#0b0b0d; --pen:#4cb8f5; }
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--desk);color:var(--text);font-family:'Archivo','Cairo',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,p,ul,figure{margin:0}
a{color:inherit}

.j-wrap{max-width:1200px;margin:0 auto;padding:0 1.25rem}
@media(min-width:768px){.j-wrap{padding:0 2rem}}
.j-section{padding:4.5rem 0}
@media(min-width:768px){.j-section{padding:6.5rem 0}}

.j-disp{font-family:var(--f-disp);font-stretch:115%;font-weight:800;letter-spacing:-.02em;line-height:1.02;text-wrap:balance}
.j-hand{font-family:var(--f-hand);font-weight:700;color:var(--pen);font-size:1.45em;line-height:1}
.j-muted{color:var(--muted)}
.j-red{color:var(--red)} .j-blue{color:var(--blue)}

/* Section tag: the red / black rounded pill used for LOCATAIRE, INFORMATION SUR VEHICULE... */
.j-tag{display:inline-flex;align-items:center;gap:.5rem;padding:.4rem 1.5rem .4rem 1rem;border-radius:999px;background:var(--red);color:#fff;font:800 .95rem var(--f-disp);font-stretch:112%}
.j-tag.ink{background:#0a0a0a;border:1px solid #2b2b2b}

.j-stripe{height:7px;width:7.5rem;background:linear-gradient(to bottom,var(--red) 0 3px,transparent 3px 4px,var(--blue) 4px 7px)}
.j-stripe.full{width:100%}

/* Paper sheet */
.j-sheet{position:relative;background:var(--paper);border:1px solid var(--edge);border-radius:4px;
  box-shadow:8px 8px 0 -1px var(--paper),8px 8px 0 0 var(--edge),0 30px 50px -32px rgba(0,0,0,.45)}

/* Dotted fill-in line: label ........ handwritten value */
.j-line{display:flex;align-items:flex-end;gap:.6rem;padding:.5rem 0;min-width:0}
.j-line>b{font-weight:800;font-stretch:108%;white-space:nowrap}
.j-fill{flex:1;min-width:1.25rem;min-height:1.9rem;border-bottom:2px dotted var(--rule);padding:0 .4rem;display:flex;align-items:flex-end;overflow-wrap:anywhere}

.j-btn{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;height:3rem;padding:0 1.6rem;border-radius:999px;
  border:2px solid transparent;font:800 .95rem var(--f-disp);font-stretch:108%;text-decoration:none;cursor:pointer;transition:transform .15s,background .2s,color .2s;white-space:nowrap}
.j-btn:hover:not(:disabled){transform:translateY(-2px)}
.j-btn:disabled{opacity:.55;cursor:not-allowed}
.j-btn:focus-visible,.j-input:focus-visible,a:focus-visible,button:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
.j-btn.red{background:var(--red);color:#fff}.j-btn.red:hover:not(:disabled){background:var(--red-d)}
.j-btn.ink{background:#0a0a0a;color:#fff;border-color:#2b2b2b}.j-btn.ink:hover:not(:disabled){background:#1b1b1b}
.j-btn.line{border-color:var(--blue);color:inherit;background:transparent}.j-btn.line:hover{background:var(--blue);color:#fff}
.j-btn svg{width:1.1rem;height:1.1rem}

.j-stamp{display:inline-block;font:700 1.7rem/1 var(--f-hand);color:var(--red);border:3px solid var(--red);border-radius:.55rem;padding:.2rem .8rem;transform:rotate(-7deg);animation:j-thud .5s .9s cubic-bezier(.2,1.6,.4,1) both}
@keyframes j-thud{from{opacity:0;transform:rotate(-7deg) scale(1.9)}to{opacity:.95;transform:rotate(-7deg) scale(1)}}
@keyframes j-write{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.j-write{animation:j-write .8s steps(18) both}

/* Black business-card panel */
.j-card{background:#0a0a0a;color:#fff;border-radius:1.25rem;position:relative;overflow:hidden}
.j-card .j-stripe.full{position:absolute;left:0;right:0;bottom:0;width:auto}

/* Inputs: lines on a form */
.j-field{display:flex;flex-direction:column;gap:.2rem}
.j-label{font:700 .85rem var(--f-disp);font-stretch:108%}
.j-input{width:100%;border:0;border-bottom:2px dotted var(--rule);background:transparent;color:var(--text);
  font:700 1.25rem var(--f-hand);padding:.4rem .1rem;border-radius:0;transition:border-color .2s}
textarea.j-input{resize:vertical;min-height:5rem}
.j-input:focus{outline:none;border-bottom:2px solid var(--blue)}
.j-grid-2{display:grid;grid-template-columns:1fr;gap:1.1rem}
@media(min-width:640px){.j-grid-2{grid-template-columns:1fr 1fr}}

/* Status */
.j-status{position:absolute;top:.75rem;inset-inline-start:.75rem;z-index:2;padding:.25rem .8rem;border-radius:999px;font:800 .72rem var(--f-disp);color:#fff;background:#16a34a}
.j-status.off{background:var(--red)}

@media (prefers-reduced-motion: reduce){
  .j-stamp,.j-write{animation:none}
  .j-btn:hover:not(:disabled){transform:none}
}

/* ---- Bridge: restyles legacy class names still used by Cars.jsx ---- */
body .car-card{background:var(--paper);border:1.5px solid var(--text);border-radius:4px;box-shadow:6px 6px 0 var(--red)}
body .car-card:hover{transform:translate(-2px,-2px);box-shadow:9px 9px 0 var(--blue);border-color:var(--text)}
body .car-card-brand-overlay,body .carousel-brand{color:var(--blue)}
body .section-title,body .cars-title,body .page-title{font-family:var(--f-disp);font-stretch:115%;font-weight:800;letter-spacing:-.02em}
body .section-badge{color:var(--red);text-transform:none;letter-spacing:0}
body .modal-container{border-radius:4px;border-top:8px solid var(--red)}
body .book-link,body .text-accent{color:var(--red)}
body .bg-primary{background:var(--red)!important}
body input:focus,body textarea:focus,body select:focus{border-color:var(--blue)!important;box-shadow:0 0 0 3px rgba(27,156,229,.25)!important}
`;

if (typeof document !== "undefined") {
  if (!document.getElementById("jina-fonts")) {
    const l = document.createElement("link");
    l.id = "jina-fonts";
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Caveat:wght@500;700&family=Cairo:wght@500;700;800&display=swap";
    document.head.appendChild(l);
  }
  if (!document.getElementById("jina-theme")) {
    const s = document.createElement("style");
    s.id = "jina-theme";
    s.textContent = css;
    document.head.appendChild(s);
  }
}

export default css;