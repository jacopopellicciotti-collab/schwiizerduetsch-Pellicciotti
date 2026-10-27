// Grammatica zurighese: esempi presi dalle carte (dati.js), quiz e coniugatore.
const PER_CH = new Map(CARTE.map(c => [c.ch, c]));
const esc = s => String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const mescola = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const salva = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const leggi = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

// evidenzia nel tedesco le parole indicate in data-hl ("wohne|in der")
function evidenzia(testo, hl) {
  testo = esc(testo);
  if (!hl) return testo;
  const alt = hl.split("|").map(p => p.replace(/[.*+?^${}()[\]\\]/g, "\\$&")).join("|");
  return testo.replace(new RegExp(`(^|[^\\p{L}])(${alt})(?![\\p{L}])`, "gu"), "$1<b>$2</b>");
}

// riga di esempio: svizzero (con le parti in grassetto dell'HTML) | Hochdeutsch, poi pronuncia e italiano
function riga(el, c, chHtml) {
  el.innerHTML = `<div class="ch">${chHtml}</div><div class="de">${evidenzia(c.de, el.dataset.hl)}</div>` +
                 (c.pr ? `<div class="pr">[${esc(c.pr)}]</div>` : "") + `<div class="it">${esc(c.it)}</div>`;
  el.addEventListener("click", () => el.classList.toggle("aperto"));
}
const mancanti = [];
document.querySelectorAll("main .es").forEach(el => {
  const testo = el.textContent.trim();
  let c = PER_CH.get(testo);
  if (!c) {
    c = { ch: testo, de: el.dataset.de || "", it: el.dataset.it || "", pr: el.dataset.pr || "" };
    if (!el.classList.contains("extra")) mancanti.push(testo);
  }
  riga(el, c, el.innerHTML.trim());
});
if (mancanti.length) console.warn("Esempi che non corrispondono a nessuna carta:", mancanti);

// coppie Hochdeutsch|svizzero nelle tabelle di confronto
document.querySelectorAll("i.p").forEach(el => {
  const [de, ch] = el.textContent.split("|");
  el.outerHTML = `<span class="coppia"><span class="de">${esc(de)}</span><span class="freccia">→</span><span class="ch">${esc(ch)}</span></span> `;
});

// interruttori Hochdeutsch / pronuncia / italiano
const INTERRUTTORI = { "t-de": ["nascondi-de", true], "t-pr": ["mostra-pr", false], "t-it": ["mostra-it", false] };
for (const [id, [classe, inverso]] of Object.entries(INTERRUTTORI)) {
  const b = document.getElementById(id);
  const imposta = acceso => {
    b.setAttribute("aria-pressed", acceso);
    document.body.classList.toggle(classe, inverso ? !acceso : acceso);
    salva(id, acceso ? "1" : "0");
  };
  const memoria = leggi(id);
  imposta(memoria === null ? b.getAttribute("aria-pressed") === "true" : memoria === "1");
  b.addEventListener("click", () => imposta(b.getAttribute("aria-pressed") !== "true"));
}

// schede
const pulsanti = document.querySelectorAll("nav button");
function apri(sez) {
  if (!document.getElementById(sez)) sez = "fonologia";
  document.querySelectorAll("main section").forEach(s => s.classList.toggle("attivo", s.id === sez));
  pulsanti.forEach(b => b.classList.toggle("attivo", b.dataset.sez === sez));
  salva("sezione", sez);
}
pulsanti.forEach(b => b.addEventListener("click", () => { apri(b.dataset.sez); history.replaceState(null, "", "#" + b.dataset.sez); window.scrollTo(0, 0); }));
apri(location.hash.slice(1) || leggi("sezione") || "fonologia");

// quiz a scelta multipla generico
function quiz(id, domande, mostra) {
  const box = document.getElementById(id);
  const dom = box.querySelector(".domanda"), scelte = box.querySelector(".scelte"), esito = box.querySelector(".esito"), punti = box.querySelector(".punti");
  let giuste = 0, fatte = 0, coda = [];
  function prossima() {
    if (!coda.length) coda = mescola(domande);
    const q = coda.pop();
    dom.innerHTML = mostra(q);
    esito.textContent = "";
    scelte.innerHTML = "";
    let risposto = false;
    mescola([q.giusta, ...q.altre]).forEach(s => {
      const b = document.createElement("button");
      b.textContent = s;
      b.className = "ch";
      b.addEventListener("click", () => {
        if (risposto) return;
        risposto = true; fatte++;
        if (s === q.giusta) { giuste++; b.classList.add("giusta"); esito.innerHTML = q.perche ? esc(q.perche) : "Giusto!"; }
        else {
          b.classList.add("sbagliata");
          [...scelte.children].find(x => x.textContent === q.giusta).classList.add("giusta");
          esito.innerHTML = q.perche ? esc(q.perche) : "";
        }
        punti.textContent = `${giuste} / ${fatte}`;
        setTimeout(prossima, 1800);
      });
      scelte.appendChild(b);
    });
  }
  prossima();
}

quiz("quiz-fono", [
  { de: "Wein", giusta: "Wii", altre: ["Wäi", "Wein"], perche: "ei antico î → ii" },
  { de: "zwei", giusta: "zwäi", altre: ["zwii", "zwai"], perche: "ei antico ei → äi" },
  { de: "gut", giusta: "guet", altre: ["guut", "güet"], perche: "u lunga tedesca ← dittongo ue" },
  { de: "aus", giusta: "us", altre: ["äus", "aas"], perche: "au → u" },
  { de: "deutsch", giusta: "dütsch", altre: ["döitsch", "deitsch"], perche: "eu antico iu → ü" },
  { de: "kann", giusta: "cha", altre: ["ka", "chan"], perche: "k- → ch-, e la -n cade" },
  { de: "Straße", giusta: "Strass", altre: ["Straasse", "Strasse"], perche: "la -e finale cade" },
  { de: "Wetter", giusta: "Wätter", altre: ["Wetter", "Wäter"], perche: "e breve → ä; tt resta lunga" },
  { de: "essen", giusta: "ässe", altre: ["esse", "ässen"], perche: "e → ä, -en → -e" },
  { de: "nein", giusta: "näi", altre: ["nii", "nai"], perche: "ei antico ei → äi" },
  { de: "Schweiz", giusta: "Schwiiz", altre: ["Schwäiz", "Schweiz"], perche: "ei antico î → ii" },
  { de: "Lösung", giusta: "Lösig", altre: ["Lösung", "Lösige"], perche: "-ung → -ig" },
  { de: "gesagt", giusta: "gsäit", altre: ["gsagt", "gesäit"], perche: "ge- → g-" },
  { de: "Freizeit", giusta: "Fräiziit", altre: ["Friiziit", "Fräizäit"], perche: "frei → fräi, Zeit → Ziit" },
  { de: "leider", giusta: "läider", altre: ["liider", "leider"], perche: "ei antico ei → äi" },
  { de: "Kätzchen", giusta: "Chätzli", altre: ["Kätzli", "Chätzche"], perche: "k- → ch-, -chen → -li" },
  { de: "ist", giusta: "isch", altre: ["ischt", "is"], perche: "-st finale → -sch" },
  { de: "trinken", giusta: "trinke", altre: ["trinken", "tringge"], perche: "-en → -e" },
], q => esc(q.de));

const NOMI = [["Velo", "s"], ["Coiffeur", "de"], ["Poulet", "s"], ["Spital", "s"], ["Kondukteur", "de"], ["Dessert", "de"],
  ["Saison", "d'"], ["Gipfeli", "s"], ["Brötli", "s"], ["Chätzli", "s"], ["Name", "de"], ["Wätter", "s"], ["Schwiiz", "d'"],
  ["Charte", "d'"], ["Wii", "de"], ["Bier", "s"], ["Märtgass", "d'"], ["Bahnhofstrass", "d'"], ["Suppe", "d'"], ["Salaat", "de"],
  ["Glas", "s"], ["Lösig", "d'"], ["Problem", "s"], ["Ussicht", "d'"], ["Balkon", "de"], ["Chuchichäschtli", "s"],
  ["Gschiir", "s"], ["Fräiziit", "d'"], ["Lieblingsmusig", "d'"], ["Tagesmenü", "s"], ["Mineralwasser", "s"]];
quiz("quiz-articoli", NOMI.map(([n, a]) => ({ n, giusta: a, altre: ["de", "d'", "s"].filter(x => x !== a),
  perche: a === "s" && /li$/.test(n) ? "-li: il diminutivo è sempre neutro" : `${a === "d'" ? "d'" + n : a + " " + n}` })),
  q => `<span class="ch">… ${esc(q.n)}</span>`);

// rimetti in ordine
(function () {
  const FRASI = ["Ich wone i de Märtgass zwäi.", "Das isch gäbig, wänn mer schnäll öppis wott erledige.", "Sorry, ich verstaa Si nöd.",
    "Ich wett gärn en Kafi trinke.", "Wo woned Si?", "Chönd Si bitte widerhole, was Si gsäit händ?", "S gfallt mir i de Schwiiz.",
    "Wie lang sind Si scho da?", "Fröit mich, Si känne z'lärne.", "Schaffed Si gärn z'Basel?", "Si chönd du zu mir säge.",
    "Mir händ e gäbigi Ussicht vom Balkon us."].filter(f => PER_CH.has(f));
  const box = document.getElementById("quiz-ordine");
  const dom = box.querySelector(".domanda"), esito = box.querySelector(".esito"), punti = box.querySelector(".punti");
  const risp = document.getElementById("ordine-risposta"), pool = document.getElementById("ordine-parole");
  let giuste = 0, fatte = 0, coda = [];
  const parole = f => f.replace(/[.,?!]/g, "").split(" ");
  function prossima() {
    if (!coda.length) coda = mescola(FRASI);
    const f = coda.pop(), c = PER_CH.get(f), giusto = parole(f);
    dom.textContent = c.de;
    risp.innerHTML = ""; pool.innerHTML = ""; esito.textContent = "";
    let scelte = [];
    mescola(giusto).forEach(p => {
      const b = document.createElement("button");
      b.textContent = p;
      b.addEventListener("click", () => {
        if (b.parentNode === pool) { risp.appendChild(b); scelte.push(b); }
        else { pool.appendChild(b); scelte = scelte.filter(x => x !== b); }
        if (scelte.length === giusto.length) {
          fatte++;
          const ok = scelte.map(x => x.textContent).join(" ") === giusto.join(" ");
          if (ok) giuste++;
          esito.innerHTML = (ok ? "Giusto! " : "Era: ") + `<span class="ch">${esc(f)}</span>`;
          punti.textContent = `${giuste} / ${fatte}`;
          setTimeout(prossima, ok ? 1800 : 3500);
        }
      });
      pool.appendChild(b);
    });
  }
  prossima();
})();

// coniugatore
const PERSONE = [["ich", "ich"], ["du", "du"], ["er, si, es", "er, sie, es"], ["mir", "wir"], ["ir", "ihr"], ["si, Si", "sie, Sie"]];
const VERBI = [
  ["sii", "sein", "bi bisch isch sind sind sind", "bin bist ist sind seid sind", "gsi", "gewesen"],
  ["haa", "haben", "ha häsch hät händ händ händ", "habe hast hat haben habt haben", "ghaa", "gehabt"],
  ["gaa", "gehen", "gaa gaasch gaat gönd gönd gönd", "gehe gehst geht gehen geht gehen", "gange", "gegangen"],
  ["choo", "kommen", "chume chunnsch chunnt chömed chömed chömed", "komme kommst kommt kommen kommt kommen", "cho", "gekommen"],
  ["chöne", "können", "cha chasch cha chönd chönd chönd", "kann kannst kann können könnt können", "chöne", "gekonnt"],
  ["wele", "wollen", "wott wottsch wott wänd wänd wänd", "will willst will wollen wollt wollen", "wele", "gewollt"],
  ["verstaa", "verstehen", "verstaa verstaasch verstaat verstönd verstönd verstönd", "verstehe verstehst versteht verstehen versteht verstehen", "verstande", "verstanden"],
  ["wone", "wohnen", "wone wonsch wont woned woned woned", "wohne wohnst wohnt wohnen wohnt wohnen", "gwont", "gewohnt"],
  ["schaffe", "arbeiten", "schaffe schaffsch schafft schaffed schaffed schaffed", "arbeite arbeitest arbeitet arbeiten arbeitet arbeiten", "gschafft", "gearbeitet"],
  ["säge", "sagen", "säge säisch säit säged säged säged", "sage sagst sagt sagen sagt sagen", "gsäit", "gesagt"],
  ["häisse", "heißen", "häisse häissisch häisst häissed häissed häissed", "heiße heißt heißt heißen heißt heißen", "ghäisse", "geheißen"],
  ["mache", "machen", "mache machsch macht mached mached mached", "mache machst macht machen macht machen", "gmacht", "gemacht"],
  ["tue", "tun", "tue tuesch tuet tüend tüend tüend", "tue tust tut tun tut tun", "taa", "getan"],
].map(([inf, de, ch, dep, p, pde]) => ({ inf, de, ch: ch.split(" "), dep: dep.split(" "), p, pde }));

const sel = document.getElementById("verbo"), tab = document.getElementById("paradigma");
const bProva = document.getElementById("prova-coniuga"), bControlla = document.getElementById("controlla"), esitoC = document.getElementById("esito-coniuga");
VERBI.forEach((v, i) => sel.add(new Option(`${v.inf} (${v.de})`, i)));
function disegna(prova) {
  const v = VERBI[sel.value];
  const cella = (f, k) => prova ? `<td class="ch"><input data-k="${k}" autocomplete="off" autocapitalize="off" spellcheck="false"></td>` : `<td class="ch">${esc(f)}</td>`;
  tab.innerHTML = `<tr><th></th><th>Schwiizerdütsch</th><th></th><th>Hochdeutsch</th></tr>` +
    PERSONE.map(([pc, pd], k) => `<tr><th>${pc}</th>${cella(v.ch[k], k)}<th>${pd}</th><td class="de">${esc(v.dep[k])}</td></tr>`).join("") +
    `<tr><th>participio</th>${cella(v.p, 6)}<th></th><td class="de">${esc(v.pde)}</td></tr>`;
  bControlla.hidden = !prova;
  bProva.textContent = prova ? "Mostra le forme" : "Mettiti alla prova";
  esitoC.textContent = "";
}
let inProva = false;
sel.addEventListener("change", () => disegna(inProva));
bProva.addEventListener("click", () => { inProva = !inProva; disegna(inProva); });
bControlla.addEventListener("click", () => {
  const v = VERBI[sel.value], giuste = [...v.ch, v.p];
  let ok = 0;
  tab.querySelectorAll("input").forEach(inp => {
    const g = inp.value.trim().toLowerCase() === giuste[inp.dataset.k].toLowerCase();
    inp.parentNode.classList.toggle("giusta", g); inp.parentNode.classList.toggle("sbagliata", !g);
    if (g) ok++; else inp.placeholder = giuste[inp.dataset.k];
    if (!g) inp.value = "";
  });
  esitoC.textContent = `${ok} su 7 giuste` + (ok < 7 ? " (le forme giuste sono scritte in grigio)" : "!");
});
disegna(false);

