// Esercizi su misura: Gemini (Google AI Studio) genera dialogo ed esercizi in JSON, qui diventano interattivi.
// La chiave sta solo nel localStorage di chi la inserisce.
const API = "https://generativelanguage.googleapis.com/v1beta";
const MODELLO_BASE = "gemini-4-argon";
const $ = id => document.getElementById(id);

const ISTRUZIONI = `Sei un insegnante di svizzero tedesco di Zurigo. Lo studente è italiano, principiante (A1-A2), e conosce bene il tedesco standard.
Regole da rispettare sempre:
- Svizzero tedesco zurighese in grafia Dieth, come lo Zürichdeutsches Wörterbuch: schwa finale -e (Name, säge, ässe), dittonghi ie/ue/üe (wie, guet, Grüezi), äi (zwäi, häisse, Näi, käi, gsäit), vocali lunghe doppie (Wii, Schwiiz, Jaar), Si per il Lei, articoli de/d'/s e en/e/es, st/sp a inizio radice (verstaa, spöter) ma scht dentro parola (Röschti), nöd, käi, öppis, gärn, z'Bärn, i de Schwiiz, vo Basel.
- Verbi: plurale unico in -ed (mir/ir/si woned, Si mached), niente preterito (solo perfetto: s isch guet gsi), congiuntivo di cortesia wett, hätt, chönt (Chönted Si, Chöntisch), törft.
- I sostantivi isolati hanno sempre l'articolo, in svizzero, tedesco e italiano (s Velo, das Fahrrad, la bicicletta).
- Hochdeutsch corretto con ß (heißen, Straße). Italiano naturale; dove serve indica (Lei) o (tu).
- Usa soprattutto il lessico delle carte dello studente (sotto). Parole nuove: al massimo 10, elencate in parole_nuove.
- Spiegazioni in italiano, brevi (una o due frasi), con il confronto con lo Hochdeutsch quando aiuta.
- Esercizi "lacuna" e "scelta": il campo frase contiene esattamente un ___ e la soluzione è solo la parte mancante; per "scelta" dai 3 o 4 opzioni, una giusta uguale alla soluzione.
- Esercizi "traduzione": frase italiana in campo it, soluzione in svizzero. Esercizi "ordine": soluzione è la frase svizzera intera (massimo 9 parole).
- In accettate metti altre risposte corrette equivalenti, se ce ne sono.

Carte dello studente (svizzero = italiano):
${CARTE.map(c => `${c.ch} = ${c.it}`).join("\n")}`;

const S = t => ({ type: t });
const SCHEMA = {
  type: "OBJECT",
  properties: {
    titolo: S("STRING"),
    introduzione: S("STRING"),
    parole_nuove: { type: "ARRAY", items: { type: "OBJECT", properties: { ch: S("STRING"), de: S("STRING"), it: S("STRING") }, required: ["ch", "de", "it"] } },
    dialogo: { type: "ARRAY", items: { type: "OBJECT", properties: { chi: S("STRING"), ch: S("STRING"), de: S("STRING"), it: S("STRING") }, required: ["chi", "ch", "de", "it"] } },
    esercizi: { type: "ARRAY", items: { type: "OBJECT", properties: {
      tipo: { type: "STRING", enum: ["lacuna", "scelta", "traduzione", "ordine"] },
      consegna: S("STRING"), frase: S("STRING"), soluzione: S("STRING"),
      accettate: { type: "ARRAY", items: S("STRING") }, opzioni: { type: "ARRAY", items: S("STRING") },
      de: S("STRING"), it: S("STRING"), spiegazione: S("STRING"),
    }, required: ["tipo", "consegna", "soluzione", "de", "it", "spiegazione"] } },
  },
  required: ["titolo", "esercizi"],
};

async function gemini(testo, schema) {
  const chiave = leggi("gemini-chiave");
  if (!chiave) throw new Error("Prima inserisci e salva la chiave API.");
  const modello = ($("modello").value.trim() || MODELLO_BASE).replace(/^models\//, "");
  const corpo = { systemInstruction: { parts: [{ text: ISTRUZIONI }] }, contents: [{ role: "user", parts: [{ text: testo }] }],
                  generationConfig: { temperature: 0.8, ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}) } };
  const r = await fetch(`${API}/models/${encodeURIComponent(modello)}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": chiave }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `Errore ${r.status}`);
  const out = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  if (!out) throw new Error("Risposta vuota (" + (j.candidates?.[0]?.finishReason || j.promptFeedback?.blockReason || "?") + ")");
  return schema ? JSON.parse(out) : out;
}

// chiave e modello
async function caricaModelli() {
  const chiave = leggi("gemini-chiave");
  if (!chiave) return;
  try {
    const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": chiave } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    $("modelli").innerHTML = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/.test(m.name))
      .map(m => `<option value="${esc(m.name.replace(/^models\//, ""))}">`).join("");
    $("stato-chiave").textContent = "Chiave valida, salvata solo in questo browser.";
  } catch (e) { $("stato-chiave").textContent = "La chiave non funziona: " + e.message; }
}
$("modello").value = leggi("gemini-modello") || MODELLO_BASE;
$("modello").addEventListener("change", () => salva("gemini-modello", $("modello").value.trim()));
if (leggi("gemini-chiave")) $("chiave").placeholder = "Chiave salvata (incollane un'altra per cambiarla)";
$("salva-chiave").addEventListener("click", () => {
  const k = $("chiave").value.trim();
  if (!k) return;
  salva("gemini-chiave", k); $("chiave").value = ""; $("chiave").placeholder = "Chiave salvata (incollane un'altra per cambiarla)";
  caricaModelli();
});
$("cancella-chiave").addEventListener("click", () => {
  try { localStorage.removeItem("gemini-chiave"); } catch (e) {}
  $("chiave").placeholder = "Incolla qui la chiave"; $("stato-chiave").textContent = "Chiave cancellata da questo browser.";
});
caricaModelli();

// richiesta
const spuntate = id => [...document.querySelectorAll(`#${id} input:checked`)].map(i => i.value);
$("genera").addEventListener("click", async () => {
  const tipi = spuntate("r-tipi");
  const richiesta = {
    tema: $("r-tema").value.trim(), verbi: $("r-verbi").value.trim(), forme: spuntate("r-forme"),
    tipi, quanti: $("r-quanti").value, note: $("r-note").value.trim(),
  };
  const testo = [
    `Prepara una scheda di esercizi.`,
    richiesta.tema && `Tema lessicale: ${richiesta.tema}.`,
    richiesta.verbi && `Verbi su cui insistere (in tutte le persone utili): ${richiesta.verbi}.`,
    richiesta.forme.length && `Forme grammaticali da allenare: ${richiesta.forme.join("; ")}.`,
    tipi.includes("dialogo") ? `Comincia con un dialogo di 8-12 battute sul tema, che usi verbi e forme richieste.` : `Non serve il dialogo (lascialo vuoto).`,
    `Poi ${richiesta.quanti} esercizi, distribuiti tra questi tipi: ${tipi.filter(t => t !== "dialogo").join(", ") || "lacuna, scelta, traduzione, ordine"}. Se c'è il dialogo, molti esercizi riprendono le sue frasi.`,
    richiesta.note && `Altre richieste dello studente: ${richiesta.note}`,
  ].filter(Boolean).join("\n");
  $("genera").disabled = true; $("stato").textContent = "Gemini sta preparando gli esercizi…";
  try {
    const scheda = await gemini(testo, SCHEMA);
    memorizza(richiesta, scheda);
    mostra(scheda);
    $("stato").textContent = "";
  } catch (e) { $("stato").textContent = "Non ci sono riuscito: " + e.message; }
  $("genera").disabled = false;
});

// storico
function storico() { try { return JSON.parse(localStorage.getItem("gemini-schede") || "[]"); } catch (e) { return []; } }
function memorizza(richiesta, scheda) {
  const s = storico(); s.unshift({ data: new Date().toLocaleString("it-CH"), richiesta, scheda });
  salva("gemini-schede", JSON.stringify(s.slice(0, 20))); disegnaStorico();
}
function disegnaStorico() {
  const s = storico(), box = $("storico");
  box.innerHTML = s.length ? "" : `<p class="sotto">Ancora nessuna scheda.</p>`;
  s.forEach((v, i) => {
    const d = document.createElement("div"); d.className = "voce-storico";
    d.innerHTML = `<button class="apri">${esc(v.scheda.titolo || "Scheda")} <span class="sotto">· ${esc(v.data)}</span></button><button class="via" title="Elimina">✕</button>`;
    d.querySelector(".apri").addEventListener("click", () => { mostra(v.scheda); $("risultato").scrollIntoView({ behavior: "smooth" }); });
    d.querySelector(".via").addEventListener("click", () => { const t = storico(); t.splice(i, 1); salva("gemini-schede", JSON.stringify(t)); disegnaStorico(); });
    box.appendChild(d);
  });
}
disegnaStorico();

// resa della scheda
const norm = s => String(s).toLowerCase().replace(/[’`´]/g, "'").replace(/[.,!?;:«»"()]/g, "").replace(/\s+/g, " ").trim();
function mostra(sc) {
  const out = $("risultato"); out.innerHTML = "";
  const box = (classe, html) => { const d = document.createElement("div"); d.className = "box " + classe; d.innerHTML = html; out.appendChild(d); return d; };
  box("regola", `<h3>${esc(sc.titolo || "")}</h3>${sc.introduzione ? `<p>${esc(sc.introduzione)}</p>` : ""}`);
  if (sc.parole_nuove?.length) {
    box("confronto", `<div class="etichetta">Parole nuove</div><div class="tab"><table>` +
      sc.parole_nuove.map(p => `<tr><td class="ch">${esc(p.ch)}</td><td class="de">${esc(p.de)}</td><td>${esc(p.it)}</td></tr>`).join("") + `</table></div>`);
  }
  if (sc.dialogo?.length) {
    const d = box("confronto", `<div class="etichetta">Dialogo · tocca una battuta per l'italiano</div>`);
    sc.dialogo.forEach(b => {
      const el = document.createElement("div"); el.className = "es";
      riga(el, { de: b.de, it: b.it, pr: "" }, `<span class="sotto">${esc(b.chi)}:</span> ${esc(b.ch)}`);
      d.appendChild(el);
    });
  }
  const punti = box("prova", `<div class="etichetta">Esercizi <span class="punti"></span></div>`);
  let giuste = 0, fatte = 0;
  const segna = (el, ok) => {
    if (el.classList.contains("fatto")) return;
    el.classList.add("fatto", ok ? "giusto" : "sbagliato"); fatte++; if (ok) giuste++;
    punti.querySelector(".punti").textContent = `${giuste} / ${fatte}`;
  };
  (sc.esercizi || []).forEach((e, n) => {
    const el = document.createElement("div"); el.className = "box esercizio";
    const giuste_ = [e.soluzione, ...(e.accettate || [])].map(norm);
    const spiega = `<div class="spiega"><span class="ch">${esc(e.tipo === "lacuna" || e.tipo === "scelta" ? (e.frase || "").replace("___", e.soluzione) : e.soluzione)}</span><br><span class="de">${esc(e.de)}</span><br><span class="sotto">${esc(e.it)}</span><br>${esc(e.spiegazione)}</div>`;
    const testa = `<div class="consegna">${n + 1}. ${esc(e.consegna)}</div>`;
    if (e.tipo === "lacuna") {
      const [a, b] = (e.frase || "___").split("___");
      el.innerHTML = `${testa}<div class="frase ch">${esc(a)}<input autocomplete="off" autocapitalize="off" spellcheck="false">${esc(b || "")}</div><div class="sotto">${esc(e.it)}</div><button class="pulsante">Controlla</button>${spiega}`;
      const inp = el.querySelector("input");
      const prova = () => segna(el, giuste_.includes(norm(inp.value)));
      el.querySelector("button").addEventListener("click", prova);
      inp.addEventListener("keydown", ev => { if (ev.key === "Enter") prova(); });
    } else if (e.tipo === "scelta") {
      el.innerHTML = `${testa}<div class="frase ch">${esc(e.frase || "")}</div><div class="sotto">${esc(e.it)}</div><div class="scelte"></div>${spiega}`;
      const sc_ = el.querySelector(".scelte");
      mescola(e.opzioni?.length ? e.opzioni : [e.soluzione]).forEach(o => {
        const b = document.createElement("button"); b.textContent = o; b.className = "ch";
        b.addEventListener("click", () => {
          if (el.classList.contains("fatto")) return;
          const ok = giuste_.includes(norm(o));
          b.classList.add(ok ? "giusta" : "sbagliata");
          if (!ok) [...sc_.children].filter(x => giuste_.includes(norm(x.textContent))).forEach(x => x.classList.add("giusta"));
          segna(el, ok);
        });
        sc_.appendChild(b);
      });
    } else if (e.tipo === "ordine") {
      el.innerHTML = `${testa}<div class="sotto">${esc(e.it)}</div><div class="risposta parole"></div><div class="parole"></div>${spiega}`;
      const risp = el.querySelector(".risposta"), pool = el.querySelectorAll(".parole")[1];
      const parole = e.soluzione.replace(/[.,?!]/g, "").split(/\s+/);
      mescola(parole).forEach(p => {
        const b = document.createElement("button"); b.textContent = p;
        b.addEventListener("click", () => {
          if (el.classList.contains("fatto")) return;
          (b.parentNode === pool ? risp : pool).appendChild(b);
          if (risp.children.length === parole.length) segna(el, giuste_.includes(norm([...risp.children].map(x => x.textContent).join(" "))));
        });
        pool.appendChild(b);
      });
    } else { // traduzione
      el.innerHTML = `${testa}<div class="frase">${esc(e.it)}</div><textarea rows="2" autocapitalize="off" spellcheck="false"></textarea>
        <p><button class="pulsante controlla">Controlla</button> <button class="pulsante commento" hidden>Commento di Gemini</button></p><div class="sotto risposta-ia"></div>${spiega}`;
      const ta = el.querySelector("textarea"), bc = el.querySelector(".commento");
      el.querySelector(".controlla").addEventListener("click", () => { segna(el, giuste_.includes(norm(ta.value))); bc.hidden = false; });
      bc.addEventListener("click", async () => {
        bc.disabled = true; const r = el.querySelector(".risposta-ia"); r.textContent = "…";
        try {
          r.textContent = await gemini(`Lo studente doveva tradurre in zurighese: «${e.it}». Soluzione attesa: «${e.soluzione}». Ha scritto: «${ta.value}». ` +
            `In 2-3 frasi in italiano: è accettabile? Correggi gli errori (grafia Dieth, forme, ordine) senza ripetere tutta la soluzione se non serve.`);
        } catch (err) { r.textContent = err.message; }
        bc.disabled = false;
      });
    }
    out.appendChild(el);
  });
}
