import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/", label: "Dépenses", icon: "📋", end: true },
  { to: "/scanner", label: "Scanner", icon: "📷" },
  { to: "/export", label: "Export", icon: "📤" },
  { to: "/reglages", label: "Réglages", icon: "⚙️" },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Navigation principale">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
