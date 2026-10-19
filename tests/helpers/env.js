import { vi } from "vitest";

// Môi trường giả cho test: Firestore trong bộ nhớ, DOM tối thiểu, bắt sự kiện click/input/change.
export function setup({ search = "", path = "/", host = "rr.pikeco.app", user = null, data = {}, pin = false } = {}) {
  // pin: vào bằng PIN trọng tài chung (dữ liệu kiểu cũ ở gốc)
  if (pin) { user = { uid: "anon", isAnonymous: true }; data = { "editors/anon": { pin: "x" }, ...data }; }
  const store = new Map(Object.entries(data));
  const subs = [];
  const notify = () => subs.forEach(f => f());
  let idc = 5000;
  const clone = d => JSON.parse(JSON.stringify(d));
  const children = r => [...store]
    .filter(([k, v]) => k.startsWith(r.path + "/") && k.split("/").length === r.path.split("/").length + 1 && (!r.flt || v[r.flt.f] === r.flt.v))
    .map(([k, v]) => ({ id: k.split("/").pop(), data: () => v }));
  const snap = r => ({ id: r.id, exists: () => store.has(r.path), data: () => store.get(r.path), metadata: { fromCache: false } });
  const env = { store, user, authCb: null, url: null, href: null, reloaded: 0 };
  const FB = {
    fs: {}, auth: {},
    doc: (a, b) => (a && a.isCol ? (id => ({ id, path: a.path + "/" + id }))("x" + ++idc) : { id: b.split("/").pop(), path: b }),
    collection: (fs, path) => ({ path, isCol: true }),
    setDoc: async (r, d) => { store.set(r.path, clone(d)); notify(); },
    updateDoc: async (r, d) => { store.set(r.path, { ...store.get(r.path), ...clone(d) }); notify(); },
    deleteDoc: async r => { store.delete(r.path); notify(); },
    getDoc: async r => snap(r),
    writeBatch: () => {
      const ops = [];
      return {
        set: (r, d) => ops.push(["s", r, d]),
        update: (r, d) => ops.push(["u", r, d]),
        delete: r => ops.push(["d", r]),
        commit: async () => {
          for (const [t, r, d] of ops) {
            if (t === "s") store.set(r.path, clone(d));
            else if (t === "u") store.set(r.path, { ...store.get(r.path), ...clone(d) });
            else store.delete(r.path);
          }
          notify();
        }
      };
    },
    query: (c, w) => ({ isCol: true, path: c.path, flt: w }),
    where: (f, op, v) => ({ f, v }),
    getDocs: async r => ({ docs: children(r) }),
    onSnapshot: (r, o, n) => {
      const f = () => (r.isCol ? n({ docs: children(r), metadata: { fromCache: false } }) : n(snap(r)));
      subs.push(f); f();
      return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); };
    },
    runTransaction: async (fs, fn) => fn({ get: FB.getDoc, set: (r, d) => FB.setDoc(r, d), update: (r, d) => FB.updateDoc(r, d) }),
    signInAnonymously: async () => ({ user: { uid: "anon", isAnonymous: true } }),
    signOut: async () => {},
    onAuthStateChanged: (a, f) => { env.authCb = f; f(env.user); },
    GoogleAuthProvider: function () {},
    signInWithPopup: async () => ({ user: env.user }),
    signInWithRedirect: async () => {},
    getRedirectResult: async () => null,
    signInWithCustomToken: async (a, t) => { env.user = { uid: "zalo_" + t, isAnonymous: false }; env.authCb && env.authCb(env.user); return { user: env.user }; }
  };
  const els = {};
  const mk = id => els[id] || (els[id] = { id, innerHTML: "", textContent: "", hidden: false, value: "", setAttribute() {}, focus() {}, select() {}, classList: { add() {}, remove() {}, toggle() {} }, offsetWidth: 0, style: {} });
  const H = {};
  globalThis.document = { querySelector: s => mk(s), querySelectorAll: () => [], getElementById: () => null, addEventListener: (t, f) => (H[t] = f), activeElement: null, hidden: false, title: "", body: { prepend() {} } };
  globalThis.localStorage = { getItem: () => "san", setItem() {} };
  globalThis.window = { FB };
  globalThis.FB = FB;
  const loc = { search, hostname: host, origin: "https://" + host, pathname: path, reload: () => env.reloaded++ };
  Object.defineProperty(loc, "href", { set: v => (env.href = v), get: () => loc.origin + loc.pathname + loc.search });
  globalThis.location = loc;
  globalThis.history = { pushState: (a, b, u) => (env.url = u), replaceState: (a, b, u) => (env.replaced = u) };
  globalThis.addEventListener = () => {};
  globalThis.scrollTo = () => {};

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tick = () => wait(10);
  return Object.assign(env, {
    FB, mk, H, wait, tick,
    // chờ tới khi điều kiện đúng (máy CI chậm hơn máy thường)
    async until(fn, ms = 4000) { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error("Hết thời gian chờ: " + fn); await wait(20); } },
    async boot() { vi.resetModules(); await import("virtual:app"); await wait(120); },
    V: () => mk("#view").innerHTML,
    T: () => mk("#view").innerHTML.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " "),
    async click(act, ds = {}) { await H.click({ target: { closest: s => (s === "[data-act]" ? { dataset: { act, ...ds } } : null) } }); await tick(); },
    async nav(go, ds = {}) { await H.click({ target: { closest: s => (s === "[data-go]" ? { dataset: { go, ...ds } } : null) }, preventDefault() {} }); await tick(); },
    async tab(t) { await H.click({ target: { closest: s => (s === "[data-tab]" ? { dataset: { tab: t } } : null) } }); await tick(); },
    input(k, v) { H.input({ target: { dataset: { draft: k }, value: v } }); },
    async cfg(k, v) { H.change({ target: { dataset: { save: "cfg", key: k }, value: String(v) } }); await tick(); },
    docs(prefix, fn = () => true) { return [...store].filter(([k, v]) => k.startsWith(prefix) && fn(v)).map(([k, v]) => [k.split("/").pop(), v]); },
    pid(name) { return [...store].find(([k, v]) => k.startsWith("players/") && v.name === name)[0].split("/").pop(); }
  });
}
