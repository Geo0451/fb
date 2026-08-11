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
    // if we're calling this from an API error (not user-initiated), let the page know
    if (window.location.pathname !== "/login.html") {
      toast("Your session expired. Please sign in again.", { error: true });
      setTimeout(() => {
        window.location.href = "login.html";
      }, 400);
    } else {
      window.location.href = "login.html";
    }
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

  // token expired or invalid — log out immediately
  if (res.status === 403 && auth) {
    Session.logout();
    return; // logout redirects, so this won't actually return
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
    return request("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  // cliques
  listCliques(name) {
    const qs = name ? `?name=${encodeURIComponent(name)}` : "";
    return request(`/api/cliques${qs}`);
  },
  createClique(name, description) {
    return request("/api/admin/cliques", {
      method: "POST",
      auth: true,
      body: { name, description },
    });
  },

  // contacts
  listContacts(cliqueId) {
    return request(`/api/contacts/clique/${cliqueId}`);
  },
  createContact({ cliqueId, name, phoneNumber, notes }) {
    return request("/api/contacts", {
      method: "POST",
      auth: true,
      body: { cliqueId, name, phoneNumber, notes },
    });
  },
  updateContact(contactId, { cliqueId, name, phoneNumber, notes }) {
    return request(`/api/contacts/${contactId}`, {
      method: "PUT",
      auth: true,
      body: { cliqueId, name, phoneNumber, notes },
    });
  },
  deleteContact(contactId) {
    return request(`/api/contacts/${contactId}`, {
      method: "DELETE",
      auth: true,
    });
  },

  // admin
  listManagers(name) {
    const qs = name ? `?name=${encodeURIComponent(name)}` : "";
    return request(`/api/managers${qs}`, { auth: true });
  },
  createManager(name, email, password) {
    return request("/api/admin/managers", {
      method: "POST",
      auth: true,
      body: { name, email, password },
    });
  },
  deleteManager(managerId) {
    return request(`/api/admin/managers/${managerId}`, {
      method: "DELETE",
      auth: true,
    });
  },
  assignClique(managerId, cliqueId) {
    return request("/api/admin/assign-clique", {
      method: "POST",
      auth: true,
      body: { managerId, cliqueId },
    });
  },
  removeClique(managerId, cliqueId) {
    return request("/api/admin/remove-clique", {
      method: "POST",
      auth: true,
      body: { managerId, cliqueId },
    });
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
  el.style.opacity = "0";
  el.style.transform = "translateX(24px)";
  stack.appendChild(el);

  import("https://cdn.jsdelivr.net/npm/motion@11/+esm").then(({ animate }) => {
    animate(
      el,
      { opacity: [0, 1], x: [24, 0] },
      { duration: 0.35, easing: "ease-out" },
    );
  });

  setTimeout(() => {
    import("https://cdn.jsdelivr.net/npm/motion@11/+esm").then(
      ({ animate }) => {
        animate(
          el,
          { opacity: [1, 0], x: [0, 24] },
          { duration: 0.3, easing: "ease-in" },
        ).finished.then(() => el.remove());
      },
    );
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
      
      ${
        loggedIn
          ? `
          <span class="pill-name">${Session.payload()?.name ?? "Unknown"}</span>
          <span class="pill-role">${role === "ADMIN" ? "(Admin)" : "(Manager)"}</span>
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

  // manually restart the spin on click too, in case the brand link
  // ever stops causing a full page reload (e.g. same-page click)
  const brandEl = mountEl.querySelector(".brand");
  const dialEl = brandEl?.querySelector(".dial");
  if (brandEl && dialEl) {
    brandEl.addEventListener("click", () => {
      dialEl.style.animation = "none";
      void dialEl.offsetWidth; // force reflow to allow the animation to restart
      dialEl.style.animation = "";
    });
  }
}

function dialSvg() {
  return `
  <svg class="dial" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- solid brass wheel -->
    <circle cx="20" cy="20" r="18" fill="var(--brass-light)"/>
    <!-- notch where the finger stop breaks the rim -->
    <path d="M32.9 25.4 L37.4 24.7 L35.6 29 Z" fill="var(--ink)"/>
    <!-- finger stop tab, poking past the rim -->
    <path d="M37.4 24.7 L35.6 29 L38.9 27.9 Z" fill="var(--brass-light)"/>
    <!-- punched finger holes -->
    <circle cx="20" cy="9" r="3" fill="var(--ink)"/>
    <circle cx="27.8" cy="12.2" r="3" fill="var(--ink)"/>
    <circle cx="31" cy="20" r="3" fill="var(--ink)"/>
    <circle cx="27.8" cy="27.8" r="3" fill="var(--ink)"/>
    <circle cx="20" cy="31" r="3" fill="var(--ink)"/>
    <circle cx="12.2" cy="27.8" r="3" fill="var(--ink)"/>
    <circle cx="9" cy="20" r="3" fill="var(--ink)"/>
    <circle cx="12.2" cy="12.2" r="3" fill="var(--ink)"/>
    <!-- center hub -->
    <circle cx="20" cy="20" r="3.6" fill="var(--ink)"/>
    <circle cx="20" cy="20" r="1.2" fill="var(--brass-light)"/>
  </svg>`;
}

function requireRole(...roles) {
  const role = Session.role();
  if (!Session.isLoggedIn() || !roles.includes(role)) {
    window.location.href = "login.html";
  }
}
