import { animate, stagger } from "motion";
import { Api, renderNav, debounce } from "./api.js";

renderNav(document.getElementById("nav"), "browse");

const rolodexEl = document.getElementById("rolodex");
const stageEl = document.getElementById("stage");
const cardgridEl = document.getElementById("cardgrid");
const titleEl = document.getElementById("stageTitle");
const descEl = document.getElementById("stageDesc");
const searchEl = document.getElementById("search");
const cliqueSearchEl = document.getElementById("cliqueSearch");

let cliques = [];
let activeId = null;
let contactsCache = {}; // cliqueId -> contacts[]
let currentContacts = [];

const TAB_COLORS = ["var(--brass)", "var(--teal-light)"];

function escapeHtml(s) {
  return (s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/* ============================================================
   CONTACT FOCUS — "picked up" close-up view.
   Uses the native View Transitions API: the browser morphs the
   grid card into the focused card (position, size, crossfade)
   as a single compositor-driven animation. No manual FLIP math,
   no hand-sequenced crossfades.
   ============================================================ */

let focusedContactId = null;
let focusEls = null; // { backdrop, focus, cardEl }

function buildFocusMarkup(c) {
  return `
    <h3>${escapeHtml(c.name)}</h3>
    <p class="phone">${escapeHtml(c.phoneNumber)}</p>
    <p class="notes">${escapeHtml(c.notes) || "&nbsp;"}</p>
    <div class="meta">
      <span>added by ${escapeHtml(c.addedBy?.name || "—")}</span>
      <span>${formatDate(c.timestamp)}</span>
    </div>`;
}

function openContactFocus(cardEl, contact) {
  if (focusedContactId != null) return;
  focusedContactId = contact.id;
  const sourceRect = cardEl.getBoundingClientRect();
  const sourceParent = cardEl.parentElement;
  const sourceStyle = cardEl.getAttribute("style");

  const placeholder = document.createElement("div");
  placeholder.className = "icard-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.style.height = `${sourceRect.height}px`;
  sourceParent.insertBefore(placeholder, cardEl);

  const backdrop = document.createElement("div");
  backdrop.className = "card-backdrop";
  backdrop.addEventListener("click", closeContactFocus);

  const focus = cardEl;
  focus.classList.add("icard-focus", "is-compact");
  focus.setAttribute("role", "dialog");
  focus.setAttribute("aria-modal", "true");

  document.body.appendChild(backdrop);
  document.body.appendChild(focus);
  document.body.style.overflow = "hidden";
  focus.style.removeProperty("opacity");
  focus.style.removeProperty("transform");

  const targetWidth = Math.min(460, window.innerWidth * 0.9);
  focus.classList.remove("is-compact");
  focus.style.width = `${targetWidth}px`;
  const expandedHeight = Math.min(focus.scrollHeight, window.innerHeight - 32);
  focus.classList.add("is-compact");
  const targetRect = {
    left: (window.innerWidth - targetWidth) / 2,
    top: (window.innerHeight - expandedHeight) / 2,
    width: targetWidth,
    height: expandedHeight,
  };
  focus.style.left = `${sourceRect.left}px`;
  focus.style.top = `${sourceRect.top}px`;
  focus.style.width = `${sourceRect.width}px`;
  focus.style.height = `${sourceRect.height}px`;
  focus.style.transform = "none";

  focusEls = {
    backdrop,
    focus,
    cardEl,
    sourceRect,
    sourceParent,
    placeholder,
    sourceStyle,
  };
  document.addEventListener("keydown", onFocusKeydown);
  requestAnimationFrame(() => {
    backdrop.classList.add("is-opening");
    focus.classList.remove("is-compact");
    focus.animate(
      [
        {
          left: `${sourceRect.left}px`,
          top: `${sourceRect.top}px`,
          width: `${sourceRect.width}px`,
          height: `${sourceRect.height}px`,
          opacity: 1,
        },
        {
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          opacity: 1,
        },
      ],
      {
        duration: 520,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
    setTimeout(() => {
      if (focusEls?.focus !== focus) return;
      focus.style.left = `${targetRect.left}px`;
      focus.style.top = `${targetRect.top}px`;
      focus.style.width = `${targetRect.width}px`;
      focus.style.height = `${targetRect.height}px`;
      focus.classList.add("is-settled");
    }, 540);
  });
}

function closeContactFocus() {
  if (focusedContactId == null || !focusEls) return;
  const els = focusEls;
  const focusRect = els.focus.getBoundingClientRect();
  els.backdrop.classList.replace("is-opening", "is-closing");
  els.focus.getAnimations().forEach((animation) => animation.cancel());
  const sourceRect = els.sourceRect;
  els.focus.classList.remove("is-settled");
  els.focus.classList.add("is-compact");
  els.focus.animate(
    [
      {
        left: `${focusRect.left}px`,
        top: `${focusRect.top}px`,
        width: `${focusRect.width}px`,
        height: `${focusRect.height}px`,
        opacity: 1,
      },
      {
        left: `${sourceRect.left}px`,
        top: `${sourceRect.top}px`,
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
        opacity: 0,
      },
    ],
    {
      duration: 420,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    },
  );

  document.removeEventListener("keydown", onFocusKeydown);
  setTimeout(() => {
    if (focusEls !== els) return;
    els.backdrop.remove();
    els.focus.getAnimations().forEach((animation) => animation.cancel());
    els.focus.className = "icard";
    if (els.sourceStyle == null) {
      els.focus.removeAttribute("style");
    } else {
      els.focus.setAttribute("style", els.sourceStyle);
    }
    els.focus.removeAttribute("role");
    els.focus.removeAttribute("aria-modal");
    els.sourceParent.insertBefore(els.focus, els.placeholder);
    els.placeholder.remove();
    document.body.style.overflow = "";
    focusedContactId = null;
    focusEls = null;
  }, 440);
}

function onFocusKeydown(e) {
  if (e.key === "Escape") closeContactFocus();
}

async function init() {
  cliqueSearchEl.disabled = true;
  rolodexEl.innerHTML = `<div class="rolodex-empty">Fetching cliques…</div>`;
  await loadCliques();
  cliqueSearchEl.disabled = false;
}

async function loadCliques(query) {
  try {
    cliques = await Api.listCliques(query);
  } catch (err) {
    rolodexEl.innerHTML = `<div class="rolodex-empty">Couldn't load cliques.<br>${escapeHtml(err.message)}</div>`;
    return;
  }
  renderTabs(query);
}

function renderTabs(query) {
  if (!cliques.length) {
    rolodexEl.innerHTML = query
      ? `<div class="rolodex-empty">No cliques match “${escapeHtml(query)}.”</div>`
      : `<div class="rolodex-empty">No cliques yet. An admin can create one.</div>`;
    titleEl.textContent = query ? "No matches" : "No cliques yet";
    descEl.textContent = "";
    cardgridEl.innerHTML = "";
    searchEl.disabled = true;
    return;
  }

  rolodexEl.innerHTML = cliques
    .map(
      (c, i) => `
      <button class="tab" role="tab" data-id="${c.id}" style="--tab-color:${TAB_COLORS[i % 2]};opacity:0;transform:translateX(-16px);" aria-selected="${c.id === activeId}">
        <span class="dot"></span>
        <span>${escapeHtml(c.name)}</span>
        <span class="count" id="count-${c.id}">${contactsCache[c.id] ? contactsCache[c.id].length : ""}</span>
      </button>`,
    )
    .join("");

  rolodexEl.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => selectClique(Number(tab.dataset.id)));
  });

  animate(
    rolodexEl.querySelectorAll(".tab"),
    { opacity: [0, 1], x: [-16, 0] },
    { delay: stagger(0.05), duration: 0.35, easing: "ease-out" },
  );

  // keep the current clique selected across a search if it's still in the results;
  // otherwise fall back to the top result.
  if (!(activeId && cliques.some((c) => c.id === activeId))) {
    selectClique(cliques[0].id);
  }
}

const runCliqueSearch = debounce((q) => loadCliques(q || undefined), 300);
cliqueSearchEl.addEventListener("input", () =>
  runCliqueSearch(cliqueSearchEl.value.trim()),
);

async function selectClique(id, { skipFlip = false } = {}) {
  activeId = id;
  const clique = cliques.find((c) => c.id === id);

  rolodexEl.querySelectorAll(".tab").forEach((tab) => {
    tab.setAttribute("aria-selected", String(Number(tab.dataset.id) === id));
  });

  if (!skipFlip) {
    await animate(
      stageEl,
      { rotateY: [0, -6], opacity: [1, 0.4] },
      { duration: 0.18, easing: "ease-in" },
    ).finished;
  }

  titleEl.textContent = clique.name;
  descEl.textContent = clique.description || "No description on file.";
  searchEl.disabled = true;
  searchEl.value = "";
  cardgridEl.innerHTML = skeletons();

  try {
    if (!contactsCache[id]) {
      contactsCache[id] = await Api.listContacts(id);
    }
    currentContacts = contactsCache[id];
    const countEl = document.getElementById(`count-${id}`);
    if (countEl) countEl.textContent = String(currentContacts.length);
    renderCards(currentContacts);
    searchEl.disabled = false;
  } catch (err) {
    cardgridEl.innerHTML = `<div class="empty-state"><strong>Couldn't load contacts</strong>${escapeHtml(err.message)}</div>`;
  }

  animate(
    stageEl,
    { rotateY: [-6, 0], opacity: [0.4, 1] },
    { duration: 0.22, easing: "ease-out" },
  );
}

function skeletons() {
  return Array.from({ length: 4 })
    .map(() => `<div class="icard skel" style="height:150px;"></div>`)
    .join("");
}

function renderCards(contacts) {
  if (!contacts.length) {
    cardgridEl.innerHTML = `<div class="empty-state"><strong>No contacts filed here yet</strong>Whoever manages this clique hasn't added anyone.</div>`;
    return;
  }
  cardgridEl.innerHTML = contacts
    .map(
      (c) => `
    <article class="icard" style="opacity:0;transform:translateY(14px);">
      <h3>${escapeHtml(c.name)}</h3>
      <p class="phone">${escapeHtml(c.phoneNumber)}</p>
      <p class="notes">${escapeHtml(c.notes) || "&nbsp;"}</p>
      <div class="meta">
        <span>added by ${escapeHtml(c.addedBy?.name || "—")}</span>
        <span>${formatDate(c.timestamp)}</span>
      </div>
    </article>`,
    )
    .join("");

  animate(
    cardgridEl.querySelectorAll(".icard"),
    { opacity: [0, 1], y: [14, 0] },
    { delay: stagger(0.045), duration: 0.4, easing: "ease-out" },
  );

  cardgridEl.querySelectorAll(".icard").forEach((cardEl, i) => {
    cardEl.addEventListener("click", () =>
      openContactFocus(cardEl, contacts[i]),
    );
  });
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

searchEl.addEventListener("input", () => {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) {
    renderCards(currentContacts);
    return;
  }
  const filtered = currentContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phoneNumber.toLowerCase().includes(q),
  );
  renderCards(filtered);
});

init();
