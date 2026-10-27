import { NavLink, Outlet } from 'react-router-dom'

const lien = ({ isActive }: { isActive: boolean }) =>
  `border-b-2 px-3 py-1.5 font-display text-lg font-semibold uppercase tracking-wider transition-colors duration-200 ${
    isActive ? 'border-r2 text-r2' : 'border-transparent text-os hover:text-r2'
  }`

export default function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-indigo bg-nuit px-4 lg:px-8">
        <NavLink
          to="/"
          className="font-display text-xl font-bold uppercase leading-none tracking-wider text-os"
        >
          Contes du Burkina
        </NavLink>
        <nav aria-label="Navigation principale" className="flex gap-1">
          <NavLink to="/carte" className={lien}>
            Carte
          </NavLink>
          <NavLink to="/a-propos" className={lien}>
            À propos
          </NavLink>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
