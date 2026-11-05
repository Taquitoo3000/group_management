import "./styles.css";
import { auth, db, provider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, collection, getDoc, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, arrayUnion, arrayRemove } from "firebase/firestore";
import { createIcons, House, ListChecks, Gift, CalendarDays, TreePine, Cake, Trash2, Check, Shuffle, Utensils, PartyPopper, Stethoscope, Pin, LogOut, Pencil, Camera, ArrowLeft, ChevronRight } from "lucide";
const icons = { House, ListChecks, Gift, CalendarDays, TreePine, Cake, Trash2, Check, Shuffle, Utensils, PartyPopper, Stethoscope, Pin, LogOut, Pencil, Camera, ArrowLeft, ChevronRight };
const ic = (name, cls = "ic") => `<i data-lucide="${name}" class="${cls}"></i>`;

const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const S = { members: {}, wishes: {}, tasks: [], taken: {}, cfg: { round: 1 }, draw: null, tab: "home", who: null, flt: "todas", claims: {}, events: [] };
let me, admin = false, pend = false, unsubs = [], claimUnsub = null, claimOwner = null;

const n = id => S.members[id]?.name || "Alguien";
const mine = () => S.members[me.uid] || {};
const av = (id, big) => {
  const p = S.members[id]?.photo, cls = "av" + (big ? " lg" : "");
  if (p && p.startsWith("data:image/")) return `<img class="${cls}" src="${p}" alt="">`;
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `<span class="${cls}" style="--h:${h}">${esc((n(id)[0] || "?").toUpperCase())}</span>`;
};
const resizePhoto = file => new Promise((res, rej) => {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const m = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 128, 128);
    URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.8));
  };
  img.onerror = rej; img.src = url;
});
const myDraw = () => (S.draw && S.draw.round === S.cfg.round ? S.draw.to : null);
const toast = t => {
  const m = $("#msg");
  m.textContent = t;
  m.style.display = "block";
  setTimeout(() => (m.style.display = "none"), 3000);
};
const fail = () => toast("No se pudo guardar");
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TIPOS = { comida: "utensils", posada: "party-popper", cita: "stethoscope", otro: "pin" };
const TIPOS_L = { comida: "Comida", posada: "Posada", cita: "Cita", otro: "Otro" };
const fmtBd = b => {
  const [, mo, d] = b.split("-").map(Number);
  return `${d} de ${MESES[mo - 1]}`;
};
const days = m => {
  if (!m?.bd) return null;
  const [, mo, d] = m.bd.split("-").map(Number);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let t = new Date(now.getFullYear(), mo - 1, d);
  if (t < now) t = new Date(now.getFullYear() + 1, mo - 1, d);
  return Math.round((t - now) / 864e5);
};
const opts = (sel, skip) => Object.keys(S.members).filter(i => i !== skip)
  .map(i => `<option value="${esc(i)}"${i === sel ? " selected" : ""}>${esc(n(i))}</option>`).join("");

const V = {
    home() {
      const m = mine(), h = new Date().getHours();
      const hola = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
      const first = (m.name || me.displayName || "").split(" ")[0];
      const today = iso(new Date());
      const pn = S.tasks.filter(t => !t.done && (t.a === me.uid || t.a === "all")).length;
      const evs = S.events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
      const bds = Object.keys(S.members).map(i => [i, days(S.members[i])]).filter(x => x[1] !== null).sort((a, b) => a[1] - b[1]);
      const exTxt = !m.ex ? "No participas" : myDraw() ? "Ya sacaste" : "Falta sacar";
      return `<div class="cd hero">${av(me.uid, true)}<div class="sp"><div class="mu">${hola}</div><h1>${esc(first)}</h1></div>
          <button data-act="goTab" data-id="profile">${ic("pencil")} Mi perfil</button></div>
        <div class="tiles">
          <button class="tile" data-act="goTab" data-id="tasks"><span class="num">${pn}</span><span class="lbl">${pn === 1 ? "pendiente" : "pendientes"}</span></button>
          <button class="tile" data-act="goTab" data-id="agenda"><b>${evs[0] ? esc(evs[0].t) : "Sin eventos"}</b><span class="lbl">${evs[0] ? fmtBd(evs[0].date) : "Agrega uno"}</span></button>
          <button class="tile" data-act="goTab" data-id="wish"><b>${bds[0] ? esc(n(bds[0][0])) : "Sin fechas"}</b><span class="lbl">${bds[0] ? (bds[0][1] === 0 ? "cumple hoy" : "cumple en " + bds[0][1] + " días") : "Faltan cumpleaños"}</span></button>
          <button class="tile" data-act="goTab" data-id="ex"><b>Intercambio</b><span class="lbl">${exTxt}</span></button>
        </div>
        <h2>Cumpleaños cercanos</h2>
        ${bds.slice(0, 3).map(([i, d]) => `<div class="cd r bd">${av(i)}<span class="sp"><b>${esc(n(i))}</b><br><span class="mu">${fmtBd(S.members[i].bd)}</span></span><span class="when">${d === 0 ? "¡Hoy!" : "en " + d + " días"}</span><button data-act="goWish" data-id="${esc(i)}" aria-label="Ver wishlist">${ic("gift")}</button></div>`).join("") || '<p class="mu">Nadie ha puesto su cumpleaños. Hazlo desde tu perfil.</p>'}
        <h2>Próximos eventos</h2>
        ${evs.slice(0, 3).map(e => `<div class="cd r"><span class="sp"><b>${ic(TIPOS[e.k] || "pin")} ${esc(e.t)}</b><br><span class="mu">${fmtBd(e.date)}${e.time ? " · " + esc(e.time) : ""}</span></span></div>`).join("") || '<p class="mu">No hay eventos próximos.</p>'}`;
    },
    profile() {
      const m = mine();
      return `<div class="r"><button data-act="goTab" data-id="home">${ic("arrow-left")} Inicio</button></div>
        <div class="center" style="margin:18px 0">${av(me.uid, true)}
          <div class="r"><label class="filebtn">${ic("camera")} Cambiar foto<input type="file" id="ph" accept="image/*" hidden></label>
          ${m.photo ? `<button data-act="noPhoto">Quitar foto</button>` : ""}</div></div>
        <div class="cd">
          <label class="field"><span>Nombre</span><input data-f="name" value="${esc(m.name || "")}" maxlength="30"></label>
          <label class="field"><span>Cumpleaños</span><input type="date" data-f="bd" value="${esc(m.bd || "")}"></label>
          <label class="field"><span>Pareja (no te toca en el intercambio)</span><select data-f="partner"><option value="">Ninguna</option>${opts(m.partner, me.uid)}</select></label>
          <label class="r"><input type="checkbox" data-f="ex" ${m.ex ? "checked" : ""}> Participo en el intercambio navideño</label>
        </div>
        ${admin ? `<h2>Administrar familia</h2><div class="cd r"><input id="ne" placeholder="correo@gmail.com"><button data-act="allow">Permitir</button></div>` : ""}
        <div class="r" style="margin-top:18px"><button data-act="logout">${ic("log-out")} Cerrar sesión</button></div>`;
    },
  tasks() {
    const L = S.tasks.filter(t => S.flt === "todas" || (S.flt === "mias" && (t.a === me.uid || t.a === "all")) || (S.flt === "hechas" && t.done)).sort((a, b) => a.done - b.done);
    return `
      <h2>Pendientes</h2>
      <div class="cd">
        <div class="r">
          <input id="tt" placeholder="¿Qué hay que hacer?">
          <select id="tc"><option>Casa</option><option>Compras</option><option>Escuela</option><option>Eventos</option><option>Otro</option></select>
        </div>
        <div class="r" style="margin-top:8px">
          <select id="ta">
            <option value="all">Para todos</option>${opts("", null)}
          </select>
          <button class="p" data-act="addTask">Agregar</button>
        </div>
      </div>
      <div class="r">
        ${["todas", "mias", "hechas"].map(f => `<button class="chip ${S.flt === f ? "on" : ""}" data-act="flt" data-id="${f}">${{ todas: "Todas", mias: "Mías", hechas: "Hechas" }[f]}</button>`).join("")}
      </div>
      ${L.map(t => `<div class="cd r"><input type="checkbox" data-tog="${esc(t.id)}" ${t.done ? "checked" : ""}><span class="sp ${t.done ? "done" : ""}">${esc(t.t)}<br><span class="mu">${esc(t.c)} · ${t.a === "all" ? "Todos" : esc(n(t.a))}</span></span>${t.a === "all" ? "" : av(t.a)}<button class="x" data-act="delT" data-id="${esc(t.id)}" aria-label="Borrar">${ic("trash-2")}</button></div>`).join("") || '<p class="mu">Nada por aquí.</p>'}
      `;
  },
  wish() {
    const w = S.who || me.uid, it = S.wishes[w]?.items || [], own = w === me.uid;
    return `
      <h2>Wishlists</h2>
      <div class="r">
        ${Object.keys(S.members).map(i => `<button class="chip ${i === w ? "on" : ""}" data-act="goWish" data-id="${esc(i)}">${i === me.uid ? "Yo" : esc(n(i))}${av(i)}</button>`).join("")}
      </div>
      ${S.members[w]?.bd ? `<p class="mu">${ic("cake")} ${fmtBd(S.members[w].bd)}</p>` : ""}
      ${own ? `<div class="cd"><div class="r"><input id="wt" placeholder="Me gustaría…"><input id="wu" placeholder="Link (opcional)"><button class="p" data-act="addW">Agregar</button></div></div>` : ""}
      ${it.map((x, k) => {
        const c = x.id ? S.claims[x.id] : null;
        const btn = own || !x.id ? "" : c
          ? (c.by === me.uid ? `<button data-act="unclaim" data-id="${esc(x.id)}">Cancelar</button>` : `<span class="mu">${ic("check")} Lo compra ${esc(n(c.by))}</span>`)
          : `<button class="p" data-act="claim" data-id="${esc(x.id)}">Yo lo compro</button>`;
        const link = /^https?:\/\//.test(x.u || "") ? ` · <a href="${esc(x.u)}" target="_blank" rel="noopener">ver</a>` : "";
        return `<div class="cd r"><span class="sp">${esc(x.t)}${link}</span>${own ? `<button class="x" data-act="delW" data-id="${k}" aria-label="Borrar">${ic("trash-2")}</button>` : btn}</div>`;
      }).join("") || '<p class="mu">Lista vacía.</p>'}
      `;
  },
  agenda() {
    const today = iso(new Date());
    const items = S.events.filter(e => e.date >= today).map(e => ({ ...e, kind: "ev" }));
    Object.keys(S.members).forEach(i => {
      const d = days(S.members[i]);
      if (d !== null) { const x = new Date(); x.setDate(x.getDate() + d); items.push({ kind: "bd", date: iso(x), who: i }); }
    });
    items.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
    return `
      <h2>Agenda familiar</h2>
      <div class="cd">
        <div class="r">
          <input id="et" placeholder="Título (ej. Posada en casa de la abuela)">
        </div>
      <div class="r" style="margin-top:8px">
        <input type="date" id="ed">
        <input type="time" id="eh">
        <div class="r" id="ek">
          ${Object.keys(TIPOS).map(k => `<button type="button" class="chip ${(S.ek || "comida") === k ? "on" : ""}" data-act="ek" data-id="${k}">${ic(TIPOS[k])} ${TIPOS_L[k]}</button>`).join("")}
        </div>
      </div>
      <div class="r" style="margin-top:8px">
        <input id="el" placeholder="Lugar (opcional)">
        <button class="p" data-act="addEv">Agregar</button>
      </div>
      </div>
      ${items.map(x => {
        if (x.kind === "bd") return `<div class="cd"><b>${ic("cake")} Cumpleaños de ${esc(n(x.who))}</b><br><span class="mu">${fmtBd(x.date)}</span></div>`;
        const g = x.going || [], voy = g.includes(me.uid);
        return `
          <div class="cd">
            <div class="r">
              <b class="sp">${ic(TIPOS[x.k] || "pin")} ${esc(x.t)}</b>
              ${x.by === me.uid || admin ? `<button class="x" data-act="delEv" data-id="${esc(x.id)}" aria-label="Borrar">${ic("trash-2")}</button>` : ""}
            </div>
          <span class="mu">${fmtBd(x.date)}${x.time ? " · " + esc(x.time) : ""}${x.l ? " · " + esc(x.l) : ""}</span><br>
          <span class="mu">Van: ${g.map(i => esc(n(i))).join(", ") || "nadie todavía"}</span>
          <div style="margin-top:6px">
            <button class="${voy ? "" : "p"}" data-act="go" data-id="${esc(x.id)}">${voy ? "Ya no voy" : "Voy"}</button>
          </div>
          </div>
          `;
      }).join("") || '<p class="mu">No hay eventos próximos.</p>'}`;
  },
  ex() {
    const ps = Object.keys(S.members).filter(i => S.members[i].ex), to = myDraw(), c = S.cfg;
    return `
      <h2>${ic("tree-pine")} Intercambio navideño</h2>
      <p class="mu">${c.date ? "Fecha: " + esc(c.date) + " · " : ""}${c.budget ? "Presupuesto: $" + esc(c.budget) : "Sin presupuesto definido"}</p>
      <div class="cd">
        <b>Participantes (${ps.length}):</b>
        ${ps.map(i => esc(n(i))).join(", ") || "ninguno todavía"}
        ${mine().ex ? "" : '<br><button class="p" data-act="join" style="margin-top:8px">Quiero participar</button>'}
      </div>
      ${mine().ex ? (to ? `<div class="cd reveal">Te tocó regalarle a<div class="big">${esc(n(to))}</div><button data-act="goWish" data-id="${esc(to)}">Ver su wishlist ${ic("gift")}</button></div>` : `<div class="cd"><p>Cada quien saca su amigo secreto; nadie más lo ve.</p><button class="p" data-act="pick">${ic("shuffle")} Sacar mi amigo secreto</button></div>`) : ""}
      <p class="mu">Ya sacaron: ${Object.values(S.taken).filter(t => t.round === c.round).length} de ${ps.length}</p>
      ${admin ? `<h2>Organizador</h2><div class="cd"><div class="r"><input id="cb" placeholder="Presupuesto" value="${esc(c.budget || "")}"><input id="cd" placeholder="Fecha" value="${esc(c.date || "")}"></div>
      <div class="r" style="margin-top:8px"><button data-act="saveCfg">Guardar</button><button data-act="reset">Reiniciar sorteo</button></div></div>` : ""}`;
  },
};

function watchClaims() {
  const w = S.tab === "wish" ? (S.who || me.uid) : null;
  const target = w && w !== me.uid ? w : null;   // en tu propia lista no se suscribe
  if (target === claimOwner) return;
  if (claimUnsub) claimUnsub();
  claimUnsub = null; claimOwner = target; S.claims = {};
  if (target) claimUnsub = onSnapshot(collection(db, "claims", target, "items"),
    s => { S.claims = {}; s.docs.forEach(d => (S.claims[d.id] = d.data())); draw(); }, () => {});
}

function draw() {
  watchClaims();
  const a = document.activeElement;
  if (a && /INPUT|SELECT/.test(a.tagName) && a.type !== "checkbox") { pend = true; return; }
  $("#hi").textContent = "Hola, " + (mine().name || me.displayName || "familia");
  $("#view").innerHTML = V[S.tab]();
  createIcons({ icons });
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
}

const act = {
  flt: f => { S.flt = f; draw(); },
  goWish: i => { S.who = i; S.tab = "wish"; draw(); },
  logout: () => signOut(auth),
  allow: async () => { const e = $("#ne").value.trim().toLowerCase(); if (e) { await setDoc(doc(db, "allowed", e), { admin: false }); $("#ne").value = ""; toast("Permitido"); } },
  addTask: async () => { const t = $("#tt").value.trim(); if (!t) return; await addDoc(collection(db, "tasks"), { t, c: $("#tc").value, a: $("#ta").value, done: false, by: me.uid, at: Date.now() }); $("#tt").value = ""; },
  delT: id => deleteDoc(doc(db, "tasks", id)),
  addW: async () => { const t = $("#wt").value.trim(); if (!t) return; await setDoc(doc(db, "wishes", me.uid), { items: [...(S.wishes[me.uid]?.items || []), { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t, u: $("#wu").value.trim() }] }); },
  delW: async k => { const it = [...(S.wishes[me.uid]?.items || [])]; it.splice(+k, 1); await setDoc(doc(db, "wishes", me.uid), { items: it }); },
  join: () => updateDoc(doc(db, "members", me.uid), { ex: true }),
  saveCfg: async () => { await setDoc(doc(db, "cfg", "ex"), { round: S.cfg.round || 1, budget: $("#cb").value.trim(), date: $("#cd").value.trim() }); toast("Guardado"); },
  reset: async () => {
    if (!confirm("¿Reiniciar el sorteo? Todos tendrán que sacar de nuevo.")) return;
    await Promise.all(Object.keys(S.taken).map(i => deleteDoc(doc(db, "taken", i))));
    await setDoc(doc(db, "cfg", "ex"), { ...S.cfg, round: (S.cfg.round || 1) + 1 });
  },
  pick: async () => {
    const m = mine();
    for (let i = 0; i < 4; i++) {
      const pool = Object.keys(S.members).filter(k => S.members[k].ex && k !== me.uid && k !== m.partner && S.members[k].partner !== me.uid && !(S.taken[k]?.round === S.cfg.round));
      if (!pool.length) return toast("No quedan opciones. Pide al organizador reiniciar.");
      const r = pool[Math.floor(Math.random() * pool.length)], nonce = Math.random().toString(36).slice(2);
      await setDoc(doc(db, "taken", r), { round: S.cfg.round, nonce });
      if ((await getDoc(doc(db, "taken", r))).data()?.nonce === nonce) {
        await setDoc(doc(db, "users", me.uid, "private", "draw"), { round: S.cfg.round, to: r });
        return;
      }
    }
    toast("Intenta de nuevo");
  },
  claim: id => setDoc(doc(db, "claims", S.who, "items", id), { by: me.uid }),
  unclaim: id => deleteDoc(doc(db, "claims", S.who, "items", id)),
    addEv: async () => {
    const t = $("#et").value.trim(), d = $("#ed").value;
    if (!t || !d) return toast("Falta el título o la fecha");
    await addDoc(collection(db, "events"), { t, date: d, time: $("#eh").value, k: S.ek || "comida", l: $("#el").value.trim(), by: me.uid, going: [me.uid], at: Date.now() });
    $("#et").value = ""; $("#el").value = "";
  },
  go: id => { const e = S.events.find(x => x.id === id); return updateDoc(doc(db, "events", id), { going: (e.going || []).includes(me.uid) ? arrayRemove(me.uid) : arrayUnion(me.uid) }); },
  delEv: id => deleteDoc(doc(db, "events", id)),
  ek: k => { S.ek = k; document.querySelectorAll("#ek .chip").forEach(b => b.classList.toggle("on", b.dataset.id === k)); },
  goTab: t => { S.tab = t; draw(); window.scrollTo(0, 0); },
  noPhoto: () => updateDoc(doc(db, "members", me.uid), { photo: "" }),
};

document.addEventListener("click", e => {
  const t = e.target.closest("nav button");
  if (t) { S.tab = t.dataset.tab; draw(); return; }
  const b = e.target.closest("[data-act]");
  if (b) Promise.resolve(act[b.dataset.act](b.dataset.id)).catch(fail);
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "ph") { const f = el.files[0]; if (f) resizePhoto(f).then(d => updateDoc(doc(db, "members", me.uid), { photo: d })).catch(fail); return; }
  if (el.dataset.tog) { const t = S.tasks.find(x => x.id === el.dataset.tog); updateDoc(doc(db, "tasks", t.id), { done: !t.done }).catch(fail); return; }
  if (el.dataset.f) updateDoc(doc(db, "members", me.uid), { [el.dataset.f]: el.type === "checkbox" ? el.checked : el.value }).catch(fail);
});
document.addEventListener("focusout", () => { if (pend) { pend = false; setTimeout(draw, 60); } });

function login(msg = "") {
  $("#nav").hidden = true;
  $("#view").innerHTML = `<p class="mu">${msg}</p><button class="p" id="go">Entrar con Google</button>`;
  $("#go").onclick = () => signInWithPopup(auth, provider).catch(fail);
}

async function boot(user) {
  me = user;
  const allowed = await getDoc(doc(db, "allowed", user.email.toLowerCase())).catch(() => null);
  if (!allowed?.exists()) { await signOut(auth); return login("Tu correo no está en la lista de la familia. Pídele al admin que te agregue."); }
  admin = allowed.data().admin === true;
  const ref = doc(db, "members", user.uid);
  if (!(await getDoc(ref)).exists()) await setDoc(ref, { name: user.displayName || user.email, joined: Date.now(), ex: false });
  $("#nav").hidden = false;
  const sub = (q, f) => unsubs.push(onSnapshot(q, s => { f(s); draw(); }, () => { }));
  sub(collection(db, "members"), s => { S.members = {}; s.docs.forEach(d => (S.members[d.id] = d.data())); });
  sub(collection(db, "wishes"), s => { S.wishes = {}; s.docs.forEach(d => (S.wishes[d.id] = d.data())); });
  sub(collection(db, "tasks"), s => { S.tasks = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.at || 0) - (b.at || 0)); });
  sub(collection(db, "taken"), s => { S.taken = {}; s.docs.forEach(d => (S.taken[d.id] = d.data())); });
  sub(collection(db, "events"), s => { S.events = s.docs.map(d => ({ id: d.id, ...d.data() })); });
  sub(doc(db, "cfg", "ex"), s => { S.cfg = { round: 1, ...(s.data() || {}) }; });
  sub(doc(db, "users", user.uid, "private", "draw"), s => { S.draw = s.data() || null; });
}

onAuthStateChanged(auth, u => {
  unsubs.forEach(f => f());
  if (claimUnsub) claimUnsub();
  claimUnsub = null;
  claimOwner = null;
  unsubs = [];
  u ? boot(u) : login();
});
