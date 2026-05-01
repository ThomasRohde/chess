import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { BadLinkPage } from "../pages/BadLinkPage";
import { PlayPage } from "../pages/PlayPage";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PlayPage />} />
        <Route path="/p/:payload" element={<PlayPage />} />
        <Route path="/bad-link" element={<BadLinkPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
