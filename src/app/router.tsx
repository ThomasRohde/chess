import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { BadLinkPage } from "../pages/BadLinkPage";
import { GamesPage } from "../pages/GamesPage";
import { PlayPage } from "../pages/PlayPage";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PlayPage />} />
        <Route path="/games" element={<GamesPage mode="open" />} />
        <Route path="/finished" element={<GamesPage mode="finished" />} />
        <Route path="/:payload" element={<PlayPage />} />
        <Route path="/p/:payload" element={<PlayPage />} />
        <Route path="/s/:payload" element={<PlayPage />} />
        <Route path="/bad-link" element={<BadLinkPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
