(function () {
  "use strict";
  var KEY = "concurs-antrenament-v1";
  var $ = function (id) { return document.getElementById(id); };
  var data, byChapter = {}, progress = {}, session = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {} }
  function show(id) { ["status", "setup", "run", "done"].forEach(function (k) { $(k).hidden = k !== id; }); window.scrollTo(0, 0); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function chTitle(id) { var t = ""; data.groups.forEach(function (g) { g.chapters.forEach(function (c) { if (c.id === id) t = c.title; }); }); return t; }

  function stats(items) {
    var ok = 0, bad = 0;
    items.forEach(function (it) { var p = progress[it.id]; if (p) { if (p.last === 1) ok++; else bad++; } });
    return { ok: ok, bad: bad, n: items.length };
  }

  function renderSetup() {
    var box = $("groups"); box.textContent = "";
    data.groups.forEach(function (g) {
      var wrap = el("div", "an-group"), head = el("div", "an-group-h"), h = el("h3", "", g.title);
      var tog = el("button", "", "Bifează tot"); tog.type = "button";
      tog.addEventListener("click", function () {
        var boxes = wrap.querySelectorAll("input[type=checkbox]"), all = true;
        boxes.forEach(function (b) { if (!b.checked) all = false; });
        boxes.forEach(function (b) { b.checked = !all; });
        updateTotal();
      });
      head.appendChild(h); head.appendChild(tog); wrap.appendChild(head);
      g.chapters.forEach(function (c) {
        var items = byChapter[c.id] || [], s = stats(items);
        var row = el("div", "an-ch"), cb = el("input"); cb.type = "checkbox"; cb.id = "ch" + c.id; cb.value = c.id;
        cb.addEventListener("change", updateTotal);
        var lb = el("label", "", c.title); lb.setAttribute("for", cb.id);
        var st = el("span", "st"); st.innerHTML = "<b>" + s.ok + "</b> corecte · " + s.bad + " greșite · " + s.n + " itemi";
        row.appendChild(cb); row.appendChild(lb); row.appendChild(st); wrap.appendChild(row);
      });
      box.appendChild(wrap);
    });
    updateTotal();
  }

  function selected() {
    var ids = [];
    document.querySelectorAll("#groups input:checked").forEach(function (b) { ids.push(+b.value); });
    return ids;
  }
  function pool() {
    var ids = selected(), mode = $("mode").value, out = [];
    ids.forEach(function (id) { (byChapter[id] || []).forEach(function (it) { out.push(it); }); });
    if (mode === "wrong") out = out.filter(function (it) { var p = progress[it.id]; return p && p.last === 0; });
    return out;
  }
  function updateTotal() { $("total").textContent = pool().length + " itemi disponibili"; $("start").disabled = pool().length === 0; }

  function pick() {
    var items = pool(), n = +$("count").value, mode = $("mode").value;
    if (mode === "new") {
      var rank = function (it) { var p = progress[it.id]; return !p ? 0 : (p.last === 0 ? 1 : 2); };
      items = shuffle(items).sort(function (a, b) { return rank(a) - rank(b); });
    } else items = shuffle(items);
    return n > 0 ? items.slice(0, n) : items;
  }

  function start() {
    var items = pick();
    if (!items.length) return;
    session = { items: items, i: 0, ok: 0, wrong: [], ans: [], ord: [] };
    show("run"); ask();
  }

  function ask() {
    var it = session.items[session.i];
    $("pos").textContent = (session.i + 1) + " / " + session.items.length;
    $("bar").style.width = (session.i / session.items.length * 100) + "%";
    var meta = $("meta"); meta.textContent = ""; meta.appendChild(el("span", "", chTitle(it.c)));
    $("prompt").textContent = it.q;
    $("fb").hidden = true; $("next").hidden = true;
    var order = session.ord[session.i] || (session.ord[session.i] = shuffle(it.o.map(function (t, k) { return { t: t, k: k }; })));
    var box = $("opts"); box.textContent = "";
    order.forEach(function (o, idx) {
      var b = el("button", "an-opt"); b.type = "button"; b.dataset.k = o.k;
      b.appendChild(el("b", "", String.fromCharCode(65 + idx))); b.appendChild(el("span", "", o.t));
      b.addEventListener("click", function () { answer(it, o.k); });
      box.appendChild(b);
    });
    $("prev").hidden = session.i === 0;
    if (session.ans[session.i] != null) showResult(it, session.ans[session.i]);
  }

  function answer(it, k) {
    var good = k === it.a;
    var p = progress[it.id] || { n: 0, ok: 0 };
    p.n++; if (good) p.ok++; p.last = good ? 1 : 0; progress[it.id] = p; save();
    session.ans[session.i] = k;
    if (good) session.ok++; else session.wrong.push({ it: it, chosen: k });
    showResult(it, k);
  }

  function showResult(it, k) {
    var good = k === it.a;
    document.querySelectorAll("#opts .an-opt").forEach(function (b) {
      b.disabled = true;
      if (+b.dataset.k === it.a) b.classList.add("c");
      else if (+b.dataset.k === k) b.classList.add("w");
    });
    var fb = $("fb"); fb.textContent = ""; fb.className = "an-fb" + (good ? "" : " no");
    fb.appendChild(el("div", "v", good ? "Corect." : "Greșit. Răspunsul corect: " + it.o[it.a]));
    fb.appendChild(el("div", "", it.e));
    fb.appendChild(el("div", "t", "Temei: " + it.s));
    fb.appendChild(el("div", "x", "Din hartă: „" + it.x + "”"));
    fb.hidden = false;
    var nx = $("next"); nx.hidden = false; nx.textContent = session.i + 1 < session.items.length ? "Următorul →" : "Vezi rezultatul";
    nx.focus();
  }

  function prev() {
    if (session.i > 0) { session.i--; ask(); }
  }

  function restart() {
    if (!confirm("Reiei sesiunea de la prima întrebare? Răspunsurile din această sesiune se șterg.")) return;
    session.i = 0; session.ok = 0; session.wrong = []; session.ans = []; session.ord = [];
    ask();
  }

  function next() {
    session.i++;
    if (session.i < session.items.length) ask(); else finish();
  }

  function finish() {
    var n = session.items.length, ok = session.ok;
    $("score").textContent = ok + " din " + n + " corecte";
    $("msg").textContent = ok === n ? "Sesiune fără greșeli." : "Itemii greșiți rămân marcați și apar primii în modul „nevăzuți și greșiți mai întâi”.";
    var rv = $("review"); rv.textContent = "";
    $("revtitle").hidden = !session.wrong.length;
    session.wrong.forEach(function (w) {
      var d = el("div", "an-rv"); d.appendChild(el("h3", "", w.it.q));
      w.it.o.forEach(function (t, k) {
        var c = k === w.it.a ? " c" : (k === w.chosen ? " u" : "");
        d.appendChild(el("div", "o" + c, (k === w.it.a ? "✔ " : (k === w.chosen ? "✘ " : "")) + t));
      });
      d.appendChild(el("p", "", w.it.e)); d.appendChild(el("p", "", "Temei: " + w.it.s));
      rv.appendChild(d);
    });
    show("done");
  }

  function init() {
    progress = load();
    fetch("data/items.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      d.items.forEach(function (it) { (byChapter[it.c] = byChapter[it.c] || []).push(it); });
      renderSetup(); show("setup");
    }).catch(function () { $("status").textContent = "Itemii nu au putut fi încărcați."; });
    $("start").addEventListener("click", start);
    $("next").addEventListener("click", next);
    $("prev").addEventListener("click", prev);
    $("restart").addEventListener("click", restart);
    $("reset2").addEventListener("click", function () {
      if (confirm("Ștergi tot progresul din Antrenament și reiei sesiunea?")) { progress = {}; save(); session.i = 0; session.ok = 0; session.wrong = []; session.ans = []; session.ord = []; ask(); }
    });
    $("quit").addEventListener("click", function () { renderSetup(); show("setup"); });
    $("again").addEventListener("click", function () { renderSetup(); show("setup"); });
    $("mode").addEventListener("change", updateTotal);
    $("reset").addEventListener("click", function () {
      if (confirm("Ștergi tot progresul din Antrenament?")) { progress = {}; save(); renderSetup(); }
    });
  }
  init();
})();
