import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";

requireRole("MANAGER");
renderNav(document.getElementById("nav"), "dashboard");

const tabsEl = document.getElementById("cliqueTabs");
const cliqueSearchEl = document.getElementById("cliqueSearch");
const addPanel = document.getElementById("addPanel");
const addPanelSub = document.getElementById("addPanelSub");
const addForm = document.getElementById("addForm");
const addErr = document.getElementById("addErr");
const addBtn = document.getElementById("addBtn");
const gridEl = document.getElementById("contactGrid");
const listTitle = document.getElementById("listTitle");
const listSub = document.getElementById("listSub");
const editTpl = document.getElementById("editTpl");

let cliques = [];
let activeClique = null;
let contacts = [];

function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function init() {
  cliqueSearchEl.disabled = true;
  tabsEl.innerHTML = `<span style="font-family:var(--font-mono);font-size:13px;color:var(--paper-dim);">Loading cliques…</span>`;
  await loadCliques();
  cliqueSearchEl.disabled = false;
}

async function loadCliques(query) {
  try {
    cliques = await Api.listCliques(query);
  } catch (err) {
    tabsEl.innerHTML = `<span style="font-family:var(--font-mono);color:var(--rose-light);">${escapeHtml(err.message)}</span>`;
    return;
  }
  if (!cliques.length) {
    tabsEl.innerHTML = query
      ? `<span style="font-family:var(--font-mono);font-size:13px;color:var(--paper-dim);">No cliques match “${escapeHtml(query)}.”</span>`
      : `<span style="font-family:var(--font-mono);font-size:13px;color:var(--paper-dim);">No cliques exist yet. Ask an admin to create one and assign you to it.</span>`;
    addPanel.style.display = "none";
    gridEl.innerHTML = "";
    return;
  }
  tabsEl.innerHTML = cliques
    .map((c) => `<button class="dash-tab" data-id="${c.id}" style="opacity:0;transform:translateY(8px);" aria-selected="${activeClique?.id === c.id}">${escapeHtml(c.name)}</button>`)
    .join("");
  tabsEl.querySelectorAll(".dash-tab").forEach((b) => b.addEventListener("click", () => selectClique(Number(b.dataset.id))));
  animate(tabsEl.querySelectorAll(".dash-tab"), { opacity: [0, 1], y: [8, 0] }, { delay: stagger(0.04), duration: 0.3 });

  if (!(activeClique && cliques.some((c) => c.id === activeClique.id))) {
    selectClique(cliques[0].id);
  }
}

const runCliqueSearch = debounce((q) => loadCliques(q || undefined), 300);
cliqueSearchEl.addEventListener("input", () => runCliqueSearch(cliqueSearchEl.value.trim()));

async function selectClique(id) {
  activeClique = cliques.find((c) => c.id === id);
  tabsEl.querySelectorAll(".dash-tab").forEach((b) => b.setAttribute("aria-selected", String(Number(b.dataset.id) === id)));

  addPanel.style.display = "block";
  addPanelSub.textContent = `Filing into “${activeClique.name}.” If you're not assigned to this clique, saving will tell you.`;
  listTitle.textContent = `Contacts — ${activeClique.name}`;
  listSub.textContent = "Loading…";
  gridEl.innerHTML = `<div class="icard skel" style="height:150px;"></div>`.repeat(3);

  try {
    contacts = await Api.listContacts(id);
    listSub.textContent = `${contacts.length} on file`;
    renderContacts();
  } catch (err) {
    listSub.textContent = "";
    gridEl.innerHTML = `<div class="empty-state"><strong>Couldn't load contacts</strong>${escapeHtml(err.message)}</div>`;
  }
}

function renderContacts() {
  if (!contacts.length) {
    gridEl.innerHTML = `<div class="empty-state"><strong>Nothing filed yet</strong>Add the first contact above.</div>`;
    return;
  }
  gridEl.innerHTML = contacts
    .map(
      (c) => `
    <article class="icard" data-id="${c.id}" style="opacity:0;transform:translateY(12px);">
      <div class="view">
        <h3>${escapeHtml(c.name)}</h3>
        <p class="phone">${escapeHtml(c.phoneNumber)}</p>
        <p class="notes">${escapeHtml(c.notes) || "&nbsp;"}</p>
        <div class="rowbtns">
          <button class="btn btn-outline on-paper btn-sm" data-action="edit">Edit</button>
          <button class="btn btn-rose btn-sm" data-action="delete">Delete</button>
        </div>
      </div>
    </article>`
    )
    .join("");

  animate(gridEl.querySelectorAll(".icard"), { opacity: [0, 1], y: [12, 0] }, { delay: stagger(0.04), duration: 0.35 });

  gridEl.querySelectorAll("[data-action='edit']").forEach((btn) =>
    btn.addEventListener("click", () => enterEditMode(btn.closest(".icard")))
  );
  gridEl.querySelectorAll("[data-action='delete']").forEach((btn) =>
    btn.addEventListener("click", () => handleDelete(btn.closest(".icard")))
  );
}

function enterEditMode(cardEl) {
  const id = Number(cardEl.dataset.id);
  const contact = contacts.find((c) => c.id === id);
  const view = cardEl.querySelector(".view");
  view.style.display = "none";

  const frag = editTpl.content.cloneNode(true);
  const form = frag.querySelector("form");
  form.querySelector(".e-name").value = contact.name;
  form.querySelector(".e-phone").value = contact.phoneNumber;
  form.querySelector(".e-notes").value = contact.notes || "";
  cardEl.appendChild(form);

  form.querySelector("[data-action='cancel']").addEventListener("click", () => {
    form.remove();
    view.style.display = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = form.querySelector("button[type='submit']");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      const updated = await Api.updateContact(id, {
        cliqueId: activeClique.id,
        name: form.querySelector(".e-name").value.trim(),
        phoneNumber: form.querySelector(".e-phone").value.trim(),
        notes: form.querySelector(".e-notes").value.trim(),
      });
      const idx = contacts.findIndex((c) => c.id === id);
      contacts[idx] = updated;
      toast("Contact updated.");
      renderContacts();
    } catch (err) {
      toast(explainErr(err), { error: true });
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}

async function handleDelete(cardEl) {
  const id = Number(cardEl.dataset.id);
  const contact = contacts.find((c) => c.id === id);
  if (!confirm(`Remove ${contact.name} from ${activeClique.name}?`)) return;

  try {
    await animate(cardEl, { opacity: [1, 0], scale: [1, 0.94] }, { duration: 0.2 }).finished;
    await Api.deleteContact(id);
    contacts = contacts.filter((c) => c.id !== id);
    listSub.textContent = `${contacts.length} on file`;
    renderContacts();
    toast("Contact removed.");
  } catch (err) {
    animate(cardEl, { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.2 });
    toast(explainErr(err), { error: true });
  }
}

function explainErr(err) {
  if (err.status === 403) return "You don't manage this clique yet — ask an admin to assign you to it.";
  if (err.status === 404) return "That contact no longer exists.";
  return err.message;
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addErr.classList.remove("show");
  addBtn.disabled = true;
  addBtn.textContent = "Adding…";

  const name = document.getElementById("cName").value.trim();
  const phoneNumber = document.getElementById("cPhone").value.trim();
  const notes = document.getElementById("cNotes").value.trim();

  try {
    const created = await Api.createContact({ cliqueId: activeClique.id, name, phoneNumber, notes });
    contacts.push(created);
    listSub.textContent = `${contacts.length} on file`;
    renderContacts();
    addForm.reset();
    toast(`${created.name} added to ${activeClique.name}.`);
  } catch (err) {
    addErr.textContent = explainErr(err);
    addErr.classList.add("show");
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = "Add contact";
  }
});

init();
