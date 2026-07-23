import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home";
import Portfolio from "./pages/Portfolio/Portfolio";
import Admin from "./pages/Portfolio/Admin/Admin";
import Contact from "./pages/Contact/Contact";
import Branding from "./pages/Branding/Branding";
import Descent from "./pages/Descent/Descent";
import CVPage from "./pages/Descent/CVPage/CVPage";
import DescentAdmin from "./pages/Descent/Admin/Admin";
import JourneyLayout from "./pages/Journey/JourneyLayout";
import Overview from "./pages/Journey/Overview";
import Roadmap from "./pages/Journey/Roadmap";
import CheatSheets from "./pages/Journey/CheatSheets";
import CheatSheetDetail from "./pages/Journey/CheatSheetDetail";
import NotFound from "./pages/NotFound/NotFound";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import { useRouteFavicon } from "./hooks/useRouteFavicon";

export default function App() {
  useRouteFavicon();

  return (
    <>
      <ScrollToTop />
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
    </>
  );
}
