import { animate } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";

renderNav(document.getElementById("nav"), "login");

// if already signed in, bounce straight to the right place
if (Session.isLoggedIn()) {
  window.location.href = Session.role() === "ADMIN" ? "admin.html" : "dashboard.html";
}

const card = document.querySelector(".authcard");
animate(card, { opacity: [0, 1], y: [26, 0] }, { duration: 0.5, easing: [0.16, 1, 0.3, 1] });

const form = document.getElementById("loginForm");
const errEl = document.getElementById("formErr");
const submitBtn = document.getElementById("submitBtn");

function shakeError(msg) {
  errEl.textContent = msg;
  errEl.classList.add("show");
  animate(errEl, { x: [0, -8, 8, -6, 6, 0] }, { duration: 0.4, easing: "ease-out" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.classList.remove("show");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Checking…";

  try {
    const { token } = await Api.login(email, password);
    Session.setToken(token);
    const role = Session.role();

    await animate(card, { opacity: [1, 0], y: [0, -14] }, { duration: 0.25, easing: "ease-in" }).finished;
    window.location.href = role === "ADMIN" ? "admin.html" : "dashboard.html";
  } catch (err) {
    shakeError(err.status === 403 ? "That email or password doesn't match our records." : err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});
