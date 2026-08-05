import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";

renderNav(document.getElementById("nav"), "browse");

const rolodexEl = document.getElementById("rolodex");
const stageEl = document.getElementById("stage");
const cardgridEl = document.getElementById("cardgrid");
const titleEl = document.getElementById("stageTitle");
const descEl = document.getElementById("stageDesc");
const searchEl = document.getElementById("search");

let cliques = [];
let activeId = null;
let contactsCache = {}; // cliqueId -> contacts[]
let currentContacts = [];

const TAB_COLORS = ["var(--brass)", "var(--teal-light)"];

function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function init() {
  rolodexEl.innerHTML = `<div class="rolodex-empty">Fetching cliques…</div>`;
  try {
    cliques = await Api.listCliques();
  } catch (err) {
    rolodexEl.innerHTML = `<div class="rolodex-empty">Couldn't load cliques.<br>${escapeHtml(err.message)}</div>`;
    titleEl.textContent = "Nothing to show";
    return;
  }

  if (!cliques.length) {
    rolodexEl.innerHTML = `<div class="rolodex-empty">No cliques yet. An admin can create one.</div>`;
    titleEl.textContent = "No cliques yet";
    descEl.textContent = "";
    return;
  }

  rolodexEl.innerHTML = cliques
    .map(
      (c, i) => `
      <button class="tab" role="tab" data-id="${c.id}" style="--tab-color:${TAB_COLORS[i % 2]}" aria-selected="false">
        <span class="dot"></span>
        <span>${escapeHtml(c.name)}</span>
        <span class="count" id="count-${c.id}"></span>
      </button>`
    )
    .join("");

  rolodexEl.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => selectClique(Number(tab.dataset.id)));
  });

  animate(rolodexEl.querySelectorAll(".tab"), { opacity: [0, 1], x: [-16, 0] }, { delay: stagger(0.05), duration: 0.4, easing: "ease-out" });

  selectClique(cliques[0].id);
}

async function selectClique(id, { skipFlip = false } = {}) {
  activeId = id;
  const clique = cliques.find((c) => c.id === id);

  rolodexEl.querySelectorAll(".tab").forEach((tab) => {
    tab.setAttribute("aria-selected", String(Number(tab.dataset.id) === id));
  });

  if (!skipFlip) {
    await animate(stageEl, { rotateY: [0, -6], opacity: [1, 0.4] }, { duration: 0.18, easing: "ease-in" }).finished;
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

  animate(stageEl, { rotateY: [-6, 0], opacity: [0.4, 1] }, { duration: 0.22, easing: "ease-out" });
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
    <article class="icard">
      <h3>${escapeHtml(c.name)}</h3>
      <p class="phone">${escapeHtml(c.phoneNumber)}</p>
      <p class="notes">${escapeHtml(c.notes) || "&nbsp;"}</p>
      <div class="meta">
        <span>added by ${escapeHtml(c.addedBy?.name || "—")}</span>
        <span>${formatDate(c.timestamp)}</span>
      </div>
    </article>`
    )
    .join("");

  animate(cardgridEl.querySelectorAll(".icard"), { opacity: [0, 1], y: [14, 0] }, { delay: stagger(0.045), duration: 0.4, easing: "ease-out" });
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
    (c) => c.name.toLowerCase().includes(q) || c.phoneNumber.toLowerCase().includes(q)
  );
  renderCards(filtered);
});

init();
