import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import LandingContent from "../pages/LandingContent";
import PublicGuide from "../pages/PublicGuide";
export { pages, SITE_URL } from "./pages";

export function render(page) {
  return renderToString(<StaticRouter location={page.path}>
    {page.path === "/" ? <LandingContent /> : <PublicGuide page={page} />}
  </StaticRouter>);
}
