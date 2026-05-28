// Minimal stub authentication.
// Stores a token in sessionStorage once `admin/admin` is entered.
// When Firebase Auth is wired in, replace this module with a thin
// adapter — the `isAuthed()`, `signOut()` and `signIn()` interface
// stays the same.

const KEY = "amritos.admin.session";

export const Auth = {
  // Hard-coded credentials for now. To rotate, edit here or wire up
  // Firebase Auth and remove the stub.
  USERNAME: "admin",
  PASSWORD: "admin",

  isAuthed() {
    return sessionStorage.getItem(KEY) === "ok";
  },

  signIn(username, password) {
    if (username === this.USERNAME && password === this.PASSWORD) {
      sessionStorage.setItem(KEY, "ok");
      return { ok: true };
    }
    return { ok: false, error: "Invalid credentials" };
  },

  signOut() {
    sessionStorage.removeItem(KEY);
  },
};
