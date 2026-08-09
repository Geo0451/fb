import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";

requireRole("ADMIN");
renderNav(document.getElementById("nav"), "admin");

const cliqueForm = document.getElementById("cliqueForm");
const cliqueErr = document.getElementById("cliqueErr");
const cliqueBtn = document.getElementById("cliqueBtn");

const managerForm = document.getElementById("managerForm");
const managerErr = document.getElementById("managerErr");
const managerBtn = document.getElementById("managerBtn");

const accessForm = document.getElementById("accessForm");
const accessErr = document.getElementById("accessErr");
const cliqueSelect = document.getElementById("aCliqueId");

const deleteForm = document.getElementById("deleteForm");
const deleteErr = document.getElementById("deleteErr");

const sessionLogEl = document.getElementById("sessionLog");
const dirSearchEl = document.getElementById("dirSearch");
const directoryTableEl = document.getElementById("directoryTable");

let logEntries = []; // {tag, text} — session only, just an activity feed
let cliqueOptions = [];
let lastManagerResults = [];

function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function pushLog(tag, text) {
  logEntries.unshift({ tag, text });
  renderLog();
}

function renderLog() {
  if (!logEntries.length) {
    sessionLogEl.innerHTML = `<div class="empty-state"><strong>Nothing yet</strong>Create a clique or change access above to see it here.</div>`;
    return;
  }
  sessionLogEl.innerHTML = logEntries
    .map((e, i) => `<div class="log-row"${i === 0 ? ' style="opacity:0;transform:translateX(-10px);"' : ""}><span>${e.text}</span><span class="tag">${e.tag}</span></div>`)
    .join("");
  const rows = sessionLogEl.querySelectorAll(".log-row");
  if (rows[0]) animate(rows[0], { opacity: [0, 1], x: [-10, 0] }, { duration: 0.3 });
}

/* ---------- manager directory, now backed by GET /api/admin/managers ---------- */

async function loadManagers(query) {
  directoryTableEl.innerHTML = `<div class="icard skel" style="height:120px;"></div>`;
  try {
    lastManagerResults = await Api.listManagers(query);
  } catch (err) {
    directoryTableEl.innerHTML = `<div class="empty-state"><strong>Couldn't load managers</strong>${escapeHtml(err.message)}</div>`;
    return;
  }
  renderDirectory(query);
}

function renderDirectory(query) {
  if (!lastManagerResults.length) {
    directoryTableEl.innerHTML = query
      ? `<div class="empty-state"><strong>No matches</strong>No manager's name matches “${escapeHtml(query)}.”</div>`
      : `<div class="empty-state"><strong>No managers yet</strong>Create one above.</div>`;
    return;
  }

  directoryTableEl.innerHTML = `
    <table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
      <tbody>
        ${lastManagerResults
          .map(
            (m) => `
          <tr>
            <td class="idcell">#${m.id}</td>
            <td>${escapeHtml(m.name)}</td>
            <td>${escapeHtml(m.email)}</td>
            <td class="actions">
              <button class="btn btn-outline on-paper btn-sm" data-use-access="${m.id}">Use for access</button>
              <button class="btn btn-outline on-paper btn-sm" data-use-delete="${m.id}">Use for delete</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  directoryTableEl.querySelectorAll("[data-use-access]").forEach((b) =>
    b.addEventListener("click", () => {
      document.getElementById("aManagerId").value = b.dataset.useAccess;
      document.getElementById("aManagerId").focus();
      document.getElementById("accessForm").scrollIntoView({ behavior: "smooth", block: "center" });
    })
  );
  directoryTableEl.querySelectorAll("[data-use-delete]").forEach((b) =>
    b.addEventListener("click", () => {
      document.getElementById("dManagerId").value = b.dataset.useDelete;
      document.getElementById("dManagerId").focus();
      document.getElementById("deleteForm").scrollIntoView({ behavior: "smooth", block: "center" });
    })
  );
}

const runManagerSearch = debounce((q) => loadManagers(q || undefined), 300);
dirSearchEl.addEventListener("input", () => {
  // the endpoint searches by name; if someone types a pure number, treat it as
  // an id lookup against whatever's already loaded rather than querying the server.
  const raw = dirSearchEl.value.trim();
  if (raw && /^\d+$/.test(raw)) {
    const hit = lastManagerResults.filter((m) => String(m.id) === raw);
    if (hit.length) {
      const previous = lastManagerResults;
      lastManagerResults = hit;
      renderDirectory(raw);
      lastManagerResults = previous;
      return;
    }
  }
  runManagerSearch(raw);
});

/* ---------- cliques (dropdown for access form) ---------- */

async function loadCliqueOptions() {
  try {
    cliqueOptions = await Api.listCliques();
    cliqueSelect.innerHTML = cliqueOptions.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (#${c.id})</option>`).join("");
  } catch {
    cliqueSelect.innerHTML = `<option value="">Couldn't load cliques</option>`;
  }
}

/* ---------- forms ---------- */

cliqueForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  cliqueErr.classList.remove("show");
  cliqueBtn.disabled = true;
  cliqueBtn.textContent = "Creating…";
  try {
    const name = document.getElementById("qName").value.trim();
    const description = document.getElementById("qDesc").value.trim();
    const clique = await Api.createClique(name, description);
    pushLog("clique", `“${clique.name}” created — id #${clique.id}`);
    toast(`Clique “${clique.name}” created.`);
    cliqueForm.reset();
    loadCliqueOptions();
  } catch (err) {
    cliqueErr.textContent = err.message;
    cliqueErr.classList.add("show");
  } finally {
    cliqueBtn.disabled = false;
    cliqueBtn.textContent = "Create clique";
  }
});

managerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  managerErr.classList.remove("show");
  managerBtn.disabled = true;
  managerBtn.textContent = "Creating…";
  try {
    const name = document.getElementById("mName").value.trim();
    const email = document.getElementById("mEmail").value.trim();
    const password = document.getElementById("mPass").value;
    const manager = await Api.createManager(name, email, password);
    pushLog("manager", `${manager.name} (${manager.email}) — id #${manager.id}`);
    toast(`Manager ${manager.name} created — id #${manager.id}.`);
    document.getElementById("aManagerId").value = manager.id;
    managerForm.reset();
    dirSearchEl.value = "";
    loadManagers();
  } catch (err) {
    managerErr.textContent = err.message;
    managerErr.classList.add("show");
  } finally {
    managerBtn.disabled = false;
    managerBtn.textContent = "Create manager";
  }
});

accessForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  accessErr.classList.remove("show");
  const mode = e.submitter?.dataset.mode || "assign";
  const managerId = Number(document.getElementById("aManagerId").value);
  const cliqueId = Number(cliqueSelect.value);
  const cliqueName = cliqueOptions.find((c) => c.id === cliqueId)?.name || `#${cliqueId}`;

  const btn = e.submitter;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = mode === "assign" ? "Assigning…" : "Removing…";

  try {
    if (mode === "assign") {
      await Api.assignClique(managerId, cliqueId);
      toast(`Manager #${managerId} can now manage “${cliqueName}.”`);
      pushLog("access", `manager #${managerId} → assigned to “${cliqueName}”`);
    } else {
      await Api.removeClique(managerId, cliqueId);
      toast(`Manager #${managerId} no longer manages “${cliqueName}.”`);
      pushLog("access", `manager #${managerId} → removed from “${cliqueName}”`);
    }
  } catch (err) {
    accessErr.textContent = err.status === 404 ? "That manager or clique ID doesn't exist." : err.message;
    accessErr.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

deleteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  deleteErr.classList.remove("show");
  const managerId = Number(document.getElementById("dManagerId").value);
  if (!confirm(`Delete manager #${managerId}? This can't be undone.`)) return;

  const btn = deleteForm.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    await Api.deleteManager(managerId);
    toast(`Manager #${managerId} deleted.`);
    pushLog("manager", `manager #${managerId} — deleted`);
    deleteForm.reset();
    loadManagers(dirSearchEl.value.trim() || undefined);
  } catch (err) {
    deleteErr.textContent = err.status === 404 ? "That manager ID doesn't exist." : err.message;
    deleteErr.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete manager";
  }
});

loadCliqueOptions();
loadManagers();
