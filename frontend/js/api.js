// ============================================================
// FONEBOOK — shared API client
// Talks to the Fonebook backend described in the API reference.
// ============================================================

const API_BASE = "http://localhost:8080";

const TOKEN_KEY = "fonebook_token";

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- token / session helpers ---------- */

const Session = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
  /** Decodes the JWT payload client-side. Never trust this for security
   *  decisions the server also makes — it's only used to decide what
   *  the UI should show (which nav links, which dashboard). */
  payload() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const part = token.split(".")[1];
      const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json);
    } catch {
      return null;
    }
  },
  role() {
    return this.payload()?.role ?? null;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    this.clear();
    window.location.href = "login.html";
  },
};

/* ---------- core fetch wrapper ---------- */

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = Session.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(0, "Can't reach the Fonebook server. Is it running?");
  }

  if (res.status === 200 || res.status === 204) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  const message = payload?.message || `Request failed (${res.status})`;
  throw new ApiError(res.status, message);
}

/* ---------- endpoints ---------- */

const Api = {
  // auth
  login(email, password) {
    return request("/api/auth/login", { method: "POST", body: { email, password } });
  },

  // cliques
  listCliques(name) {
    const qs = name ? `?name=${encodeURIComponent(name)}` : "";
    return request(`/api/cliques${qs}`);
  },
  createClique(name, description) {
    return request("/api/admin/cliques", { method: "POST", auth: true, body: { name, description } });
  },

  // contacts
  listContacts(cliqueId) {
    return request(`/api/contacts/clique/${cliqueId}`);
  },
  createContact({ cliqueId, name, phoneNumber, notes }) {
    return request("/api/contacts", { method: "POST", auth: true, body: { cliqueId, name, phoneNumber, notes } });
  },
  updateContact(contactId, { cliqueId, name, phoneNumber, notes }) {
    return request(`/api/contacts/${contactId}`, { method: "PUT", auth: true, body: { cliqueId, name, phoneNumber, notes } });
  },
  deleteContact(contactId) {
    return request(`/api/contacts/${contactId}`, { method: "DELETE", auth: true });
  },

  // admin
  listManagers(name) {
    const trimmedName = name ? name.trim() : "";
    const qs = trimmedName ? `?name=${encodeURIComponent(trimmedName)}` : "";
    return request(`/api/managers${qs}`, { auth: true });
  },
  createManager(name, email, password) {
    return request("/api/admin/managers", { method: "POST", auth: true, body: { name, email, password } });
  },
  deleteManager(managerId) {
    return request(`/api/admin/managers/${managerId}`, { method: "DELETE", auth: true });
  },
  assignClique(managerId, cliqueId) {
    return request("/api/admin  /assign-clique", { method: "POST", auth: true, body: { managerId, cliqueId } });
  },
  removeClique(managerId, cliqueId) {
    return request("/api/admin/remove-clique", { method: "POST", auth: true, body: { managerId, cliqueId } });
  },
};

/* ---------- toast ---------- */

function toast(message, { error = false } = {}) {
  let stack = document.querySelector(".toaststack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toaststack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast" + (error ? " err" : "");
  el.textContent = message;
  stack.appendChild(el);

  import("https://cdn.jsdelivr.net/npm/motion@11/+esm").then(({ animate }) => {
    animate(el, { opacity: [0, 1], x: [24, 0] }, { duration: 0.35, easing: "ease-out" });
  });

  setTimeout(() => {
    import("https://cdn.jsdelivr.net/npm/motion@11/+esm").then(({ animate }) => {
      animate(el, { opacity: [1, 0], x: [0, 24] }, { duration: 0.3, easing: "ease-in" }).finished.then(() => el.remove());
    });
  }, 3600);
}

/* ---------- shared nav render ---------- */

function renderNav(mountEl, active) {
  const role = Session.role();
  const loggedIn = Session.isLoggedIn();
  mountEl.innerHTML = `
    <a class="brand" href="index.html">
      ${dialSvg()}
      <span>FONEBOOK<small>clique directory</small></span>
    </a>
    <div class="navlinks">
      <a href="index.html" ${active === "browse" ? 'style="color:var(--brass-light);border-color:var(--brass);"' : ""}>Browse</a>
      ${loggedIn
        ? `
          <span class="pill-role">${role === "ADMIN" ? "Admin" : "Manager"}</span>
          ${role === "MANAGER" ? `<a href="dashboard.html" ${active === "dashboard" ? 'style="color:var(--brass-light);border-color:var(--brass);"' : ""}>Dashboard</a>` : ""}
          ${role === "ADMIN" ? `<a href="admin.html" ${active === "admin" ? 'style="color:var(--brass-light);border-color:var(--brass);"' : ""}>Admin</a>` : ""}
          <button id="logoutBtn">Sign out</button>
        `
        : `<a href="login.html" ${active === "login" ? 'style="color:var(--brass-light);border-color:var(--brass);"' : ""}>Sign in</a>`
      }
    </div>
  `;
  const logoutBtn = mountEl.querySelector("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => Session.logout());
}

function dialSvg() {
  return `
  <svg class="dial" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18" stroke="var(--brass-light)" stroke-width="2"/>
    <circle cx="20" cy="8.5" r="2.4" fill="var(--brass-light)"/>
    <circle cx="29.8" cy="13" r="2.4" fill="var(--brass-light)"/>
    <circle cx="33.5" cy="20" r="2.4" fill="var(--brass-light)"/>
    <circle cx="29.8" cy="27" r="2.4" fill="var(--brass-light)"/>
    <circle cx="20" cy="31.5" r="2.4" fill="var(--brass-light)"/>
    <circle cx="10.2" cy="27" r="2.4" fill="var(--brass-light)"/>
    <circle cx="6.5" cy="20" r="2.4" fill="var(--brass-light)"/>
    <circle cx="10.2" cy="13" r="2.4" fill="var(--brass-light)"/>
  </svg>`;
}

function requireRole(...roles) {
  const role = Session.role();
  if (!Session.isLoggedIn() || !roles.includes(role)) {
    window.location.href = "login.html";
  }
}
