import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE_URL, pageForPath } from "./pages";

export default function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = pageForPath(pathname);
    document.title = page?.title || "Sua mesa de RPG | Grimoorio";
    const setMeta = (attribute, name, content) => {
      let element = document.head.querySelector('meta[' + attribute + '="' + name + '"]');
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };
    const description = page?.description || "Acesse sua conta no Grimoorio para gerenciar personagens e campanhas de RPG.";
    setMeta("name", "description", description);
    setMeta("name", "robots", page ? "index,follow" : "noindex,follow");
    setMeta("property", "og:title", document.title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", SITE_URL + (page?.path || pathname));
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (page && canonical) canonical.href = SITE_URL + page.path;
    else if (page) {
      const element = document.createElement("link");
      element.rel = "canonical";
      element.href = SITE_URL + page.path;
      document.head.appendChild(element);
    } else canonical?.remove();

  }, [pathname]);
  return null;
}
