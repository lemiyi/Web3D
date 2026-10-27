import Cloture from '@/components/home/Cloture'
import Etapes from '@/components/home/Etapes'
import Hero from '@/components/home/Hero'
import { useCarteHero } from '@/lib/carteHero'

export default function Accueil() {
  const carte = useCarteHero()
  return (
    <>
      <Hero carte={carte} />
      <Etapes carte={carte} />
      <Cloture />
    </>
  )
}
