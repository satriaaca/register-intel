import { auth } from "./firebase.js";

/**
 * Custom fetch wrapper yang secara otomatis menambahkan header Authorization
 * dengan Firebase ID Token dari user yang sedang login.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const currentUser = auth.currentUser;

  let token = "";
  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
    } catch (err) {
      console.warn("Gagal mendapatkan Firebase ID Token:", err);
    }
  }

  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  return response;
}
