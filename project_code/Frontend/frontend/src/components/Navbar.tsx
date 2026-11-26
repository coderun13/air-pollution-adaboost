import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Wind,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import type { LiveStation } from "../services/api";
import { useTheme } from "../context/ThemeContext";

interface NavbarProps {
  apiOnline: boolean;
  stations?: LiveStation[];
  selectedStation?: LiveStation;
  onSelectStation?: (station: LiveStation) => void;
  activeAlertsCount?: number;
  onOpenAssistant?: () => void;
}

const NAV_LINKS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Compare", to: "/compare" },
  { label: "ML Predictor", to: "/predict" },
  { label: "India Map", to: "/map" },
  { label: "About", to: "/about" },
];

export function Navbar({ apiOnline }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap transition-colors ${
      isActive
        ? "font-semibold text-primary-dark"
        : "text-text-secondary hover:text-text-primary"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-border-light bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-pink-200 bg-pink-50 text-primary">
            <Wind className="h-5 w-5" />
            <span
              title={apiOnline ? "Backend API Live" : "Snapshot Mode"}
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                apiOnline ? "bg-emerald-500" : "bg-amber-400"
              }`}
            />
          </div>
          <div>
            <span className="font-display text-base font-bold tracking-tight text-text-primary">
              AIRWATCH AI
            </span>
            <span className="hidden xl:block text-[11px] leading-none text-text-secondary">
              All-India Air Quality Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-5 text-xs xl:text-sm font-medium"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={navLinkClass}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Light/Soft Pink Mode"
            title={theme === "light" ? "Switch to Soft Rose Mode" : "Switch to Crisp Ivory Mode"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-[#FAF8F6] text-text-secondary transition hover:border-pink-200 hover:text-primary-dark"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 text-pink-600" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>

          <Link to="/predict" className="btn-primary hidden sm:inline-flex text-xs xl:text-sm">
            Predict AQI
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-text-secondary hover:text-text-primary lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border-light bg-[#FFF8FB] px-4 py-4 lg:hidden">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-text-secondary">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2.5 py-1.5 transition-colors hover:bg-pink-100/60 hover:text-text-primary"
              >
                {link.label}
              </NavLink>
            ))}

            <Link
              to="/predict"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary mt-2 w-full text-center text-xs"
            >
              Predict AQI
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}