import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import RouteFallback from "./components/RouteFallback/RouteFallback";
import { useRouteFavicon } from "./hooks/useRouteFavicon";

/**
 * Every route is lazy-loaded. Without this, a single visitor landing
 * on any one page - say, someone just checking out the portfolio -
 * downloaded and parsed the JS for the ENTIRE site in one bundle: both
 * admin dashboards (GitHub API client, OAuth flow, image conversion),
 * Descent's GSAP scroll-physics engine, all of Journey's guide content,
 * Branding, Contact, everything, whether they'd ever visit those pages
 * or not. Splitting per-route means a page only pays for its own code.
 */
const Home = lazy(() => import("./pages/Home/Home"));
const Portfolio = lazy(() => import("./pages/Portfolio/Portfolio"));
const Admin = lazy(() => import("./pages/Portfolio/Admin/Admin"));
const Contact = lazy(() => import("./pages/Contact/Contact"));
const Branding = lazy(() => import("./pages/Branding/Branding"));
const Descent = lazy(() => import("./pages/Descent/Descent"));
const CVPage = lazy(() => import("./pages/Descent/CVPage/CVPage"));
const DescentAdmin = lazy(() => import("./pages/Descent/Admin/Admin"));
const JourneyLayout = lazy(() => import("./pages/Journey/JourneyLayout"));
const Overview = lazy(() => import("./pages/Journey/Overview"));
const Roadmap = lazy(() => import("./pages/Journey/Roadmap"));
const CheatSheets = lazy(() => import("./pages/Journey/CheatSheets"));
const CheatSheetDetail = lazy(() => import("./pages/Journey/CheatSheetDetail"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));

export default function App() {
  useRouteFavicon();

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/portfolio/admin" element={<Admin />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/branding" element={<Branding />} />
          <Route path="/descent" element={<Descent />} />
          <Route path="/descent/cv" element={<CVPage />} />
          <Route path="/descent/admin" element={<DescentAdmin />} />
          <Route path="/journey" element={<JourneyLayout />}>
            <Route index element={<Overview />} />
            <Route path="roadmap" element={<Roadmap />} />
            <Route path="cheatsheets" element={<CheatSheets />} />
            <Route path="cheatsheets/:slug" element={<CheatSheetDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
