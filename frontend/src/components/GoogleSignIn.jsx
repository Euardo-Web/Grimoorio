import { useEffect, useState } from "react";
import api, { API_BASE } from "@/lib/api";
export default function GoogleSignIn({ role = "player" }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/auth/providers").then(({ data }) => { if (active) setEnabled(data.google); }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!enabled) return null;
  return <div className="google-signin">
    <a className="google-button" href={`${API_BASE}/auth/google/start?role=${encodeURIComponent(role)}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
      Continuar com Google
    </a><div className="auth-divider"><span>ou continue com email</span></div>
  </div>;
}
