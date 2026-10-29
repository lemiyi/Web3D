import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import APropos from '@/pages/APropos'
import Accueil from '@/pages/Accueil'

// La carte (MapLibre) n'est chargée que sur sa page.
const Carte = lazy(() => import('@/pages/Carte'))
const Conte = lazy(() => import('@/pages/Conte'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route
          path="carte"
          element={
            <Suspense fallback={<p className="p-6">Chargement de la carte…</p>}>
              <Carte />
            </Suspense>
          }
        />
        <Route
          path="conte/:id"
          element={
            <Suspense fallback={<p className="px-5 pt-28">Chargement du conte…</p>}>
              <Conte />
            </Suspense>
          }
        />
        <Route path="a-propos" element={<APropos />} />
        <Route path="*" element={<p className="p-6">Page introuvable.</p>} />
      </Route>
    </Routes>
  )
}
