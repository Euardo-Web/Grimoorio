import axios from "axios";
const configured = window.__GRIMOORIO_API_URL__ || import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL;
const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
export const API_BASE = `${(configured || (local ? "http://localhost:8000" : "https://grimoorio-backend.onrender.com")).replace(/\/$/, "")}/api`;
const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 20000 });
let renewing = null;
api.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  const excluded = /\/auth\/(login|register|refresh|logout|providers|google)/.test(config?.url || "");
  if (error.response?.status !== 401 || !config || config._retried || excluded) return Promise.reject(error);
  config._retried = true;
  try {
    renewing ||= api.post("/auth/refresh").finally(() => { renewing = null; });
    await renewing;
    return api(config);
  } catch { return Promise.reject(error); }
});
export default api;
export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.code === "ECONNABORTED" ? "O servidor demorou a responder. Tente novamente." : err?.message || "Erro inesperado";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || "Dados inválidos").join(" ");
  return "Não foi possível concluir a operação.";
}
