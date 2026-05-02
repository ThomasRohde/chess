import { NavLink } from "react-router-dom";

import { NicknameEditor } from "../Nickname/NicknameEditor";

type AppHeaderProps = {
  nickname?: string | null;
  onNickname?: (nickname: string) => void;
};

export function AppHeader({ nickname = null, onNickname }: AppHeaderProps) {
  return (
    <header className="app-header">
      <NavLink className="brand" to="/">
        <span className="brand-mark" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}branch-chess-icon.png`} alt="" />
        </span>
        <span>
          <strong>Branch Chess</strong>
          <small>URL-branching chess</small>
        </span>
      </NavLink>
      <nav className="app-nav" aria-label="Primary">
        <NavLink className={navLinkClass} end to="/">
          Play
        </NavLink>
        <NavLink className={navLinkClass} to="/games">
          Games in play
        </NavLink>
        <NavLink className={navLinkClass} to="/finished">
          Finished games
        </NavLink>
      </nav>
      {onNickname ? <NicknameEditor nickname={nickname} onNickname={onNickname} /> : null}
    </header>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? "app-nav-link active" : "app-nav-link";
}
