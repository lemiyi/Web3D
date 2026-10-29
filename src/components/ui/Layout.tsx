import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { basculerTheme, useTheme } from '@/lib/theme'

const lien = ({ isActive }: { isActive: boolean }) =>
  `flex h-10 items-center rounded-full px-4 text-[0.95rem] font-semibold transition-colors duration-200 ${
    isActive ? 'bg-surface-2 text-texte' : 'text-discret hover:text-texte'
  }`

function IconeTheme({ sombre }: { sombre: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {sombre ? (
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
    </svg>
  )
}

// Navigation en pilule flottante : elle se pose sur les pages au lieu de réserver une bande.
export default function Layout() {
  const theme = useTheme()
  const [menu, setMenu] = useState(false)
  const sombre = theme === 'dark'

  return (
    <div className="flex min-h-svh flex-col">
      <header className="pointer-events-none fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-3">
        <nav
          aria-label="Navigation principale"
          className="flottant pointer-events-auto flex w-full max-w-2xl items-center gap-1 rounded-full bg-nav p-1.5 pl-5 ring-1 ring-ligne"
        >
          <NavLink
            to="/"
            onClick={() => setMenu(false)}
            className="mr-auto flex h-10 items-center font-display text-lg font-extrabold tracking-tight"
          >
            Contes du Burkina
          </NavLink>
          <div className="hidden items-center sm:flex">
            <NavLink to="/carte" className={lien}>
              Carte
            </NavLink>
            <NavLink to="/a-propos" className={lien}>
              À propos
            </NavLink>
          </div>
          <button
            type="button"
            onClick={basculerTheme}
            aria-pressed={sombre}
            aria-label="Mode veillée (thème sombre)"
            className="grid size-10 place-items-center rounded-full transition-colors duration-200 hover:bg-surface-2"
          >
            <IconeTheme sombre={sombre} />
          </button>
          <button
            type="button"
            aria-expanded={menu}
            aria-controls="menu-mobile"
            onClick={() => setMenu((m) => !m)}
            className="h-10 rounded-full px-4 text-[0.95rem] font-bold hover:bg-surface-2 sm:hidden"
          >
            Menu
          </button>
          <Link
            to="/carte"
            className="hidden rounded-full bg-texte px-5 py-2.5 text-[0.95rem] font-bold text-page transition-transform duration-200 hover:-translate-y-0.5 sm:block"
          >
            Explorer
          </Link>
        </nav>

        {menu && (
          <nav
            id="menu-mobile"
            aria-label="Menu"
            className="verre-dense pointer-events-auto flex w-full max-w-2xl flex-col gap-1 rounded-3xl p-2 sm:hidden"
          >
            <NavLink to="/carte" onClick={() => setMenu(false)} className={lien}>
              Carte
            </NavLink>
            <NavLink to="/a-propos" onClick={() => setMenu(false)} className={lien}>
              À propos
            </NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
