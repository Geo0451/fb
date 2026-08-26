// main.js
// Logic for index.html — the public browsing page. No auth involved anywhere here.

import { animate, stagger } from "motion";

// Each clique gets one of these accent colors, cycling in order, based on its
// position in the list. This is just a JS array mapped to id -> color, so the
// same clique always gets the same color across a session.
const ACCENTS = ["#ff5d5d", "#2b4eff", "#ffc93c", "#8c52ff"];

let allCliques = [];
let activeCliqueId = null; // null = "All"

const cliqueRail = document.getElementById("clique-rail");
const cardGrid = document.getElementById("card-grid");
const searchInput = document.getElementById("search-input");

function accentFor(cliqueId) {
  const index = allCliques.findIndex((c) => c.id === cliqueId);
  return ACCENTS[index % ACCENTS.length];
}

function renderCliqueTabs() {
  cliqueRail.innerHTML = "";

  const allTab = makeTab("All", null, "#1a1a2e");
  cliqueRail.appendChild(allTab);

  allCliques.forEach((clique) => {
    const tab = makeTab(clique.name, clique.id, accentFor(clique.id));
    cliqueRail.appendChild(tab);
  });
}

function makeTab(label, cliqueId, color) {
  const button = document.createElement("button");
  button.className =
    "clique-tab" + (activeCliqueId === cliqueId ? " active" : "");
  button.textContent = label;
  if (activeCliqueId === cliqueId) {
    button.style.background = color;
    button.style.borderColor = color;
  }
  button.addEventListener("click", () => {
    activeCliqueId = cliqueId;
    renderCliqueTabs();
    loadAndRenderContacts();
  });
  return button;
}

function contactCardHTML(contact) {
  const color = accentFor(contact.clique.id);
  const notes = contact.notes
    ? `<p class="contact-notes">${escapeHtml(contact.notes)}</p>`
    : "";
  return `
    <div class="contact-card" style="--tab-color: ${color}">
      <span class="contact-clique-label" style="background:${color}">${escapeHtml(contact.clique.name)}</span>
      <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
      <p class="contact-phone">${escapeHtml(contact.phoneNumber)}</p>
      ${notes}
    </div>
  `;
}

// Basic defense against notes/names containing HTML-breaking characters.
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadAndRenderContacts() {
  cardGrid.innerHTML = `<p class="state-message">Loading contacts…</p>`;

  try {
    let contacts;
    if (activeCliqueId === null) {
      // "All" view: fetch every clique's contacts and flatten them together.
      const perClique = await Promise.all(
        allCliques.map((c) => api.getContactsForClique(c.id)),
      );
      contacts = perClique.flat();
    } else {
      contacts = await api.getContactsForClique(activeCliqueId);
    }

    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phoneNumber.toLowerCase().includes(query),
      );
    }

    if (contacts.length === 0) {
      cardGrid.innerHTML = `<p class="state-message">No contacts found.</p>`;
      return;
    }

    cardGrid.innerHTML = contacts.map(contactCardHTML).join("");
    animateCardsIn();
  } catch (err) {
    cardGrid.innerHTML = `<p class="state-message">Couldn't load contacts: ${escapeHtml(err.message)}</p>`;
  }
}

// The "rolodex" moment: cards fade/slide in with a slight stagger and a tiny
// random rotation, like index cards being fanned out. Motion handles the
// actual interpolation; we just describe start/end state.
function animateCardsIn() {
  const cards = cardGrid.querySelectorAll(".contact-card");
  cards.forEach((card) => {
    const tilt = (Math.random() * 4 - 2).toFixed(1); // -2deg to +2deg
    card.style.setProperty("--rest-tilt", `${tilt}deg`);
  });

  animate(
    cards,
    {
      opacity: [0, 1],
      transform: [
        "translateY(16px) rotate(0deg)",
        "translateY(0px) rotate(var(--rest-tilt))",
      ],
    },
    { duration: 0.4, delay: stagger(0.04) },
  );
}

async function init() {
  try {
    allCliques = await api.getCliques();
    renderCliqueTabs();
    await loadAndRenderContacts();
  } catch (err) {
    cardGrid.innerHTML = `<p class="state-message">Couldn't load cliques: ${escapeHtml(err.message)}</p>`;
  }
}

searchInput.addEventListener("input", () => {
  // Simple debounce so we're not re-filtering on every single keystroke instantly.
  clearTimeout(searchInput._debounce);
  searchInput._debounce = setTimeout(loadAndRenderContacts, 200);
});

init();
