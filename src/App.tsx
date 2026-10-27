import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/ui/Layout'
import APropos from '@/pages/APropos'
import Accueil from '@/pages/Accueil'
import Conte from '@/pages/Conte'

// La carte (MapLibre) n'est chargée que sur sa page.
const Carte = lazy(() => import('@/pages/Carte'))

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
        <Route path="conte/:id" element={<Conte />} />
        <Route path="a-propos" element={<APropos />} />
        <Route path="*" element={<p className="p-6">Page introuvable.</p>} />
      </Route>
    </Routes>
  )
}
