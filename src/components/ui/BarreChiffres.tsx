import Compteur from '@/components/ui/Compteur'
import type { Conte } from '@/lib/schemas'

const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un)

// Barre de chiffres en verre : ce que la carte contient, ou ce que les filtres en laissent voir.
export default function BarreChiffres({
  contes,
  className = '',
}: {
  contes: Conte[]
  className?: string
}) {
  const nbLangues = new Set(contes.map((c) => c.langue)).size
  const nbRegions = new Set(contes.map((c) => c.region)).size
  const chiffres = [
    { n: contes.length, libelle: pluriel(contes.length, 'conte', 'contes') },
    { n: nbLangues, libelle: pluriel(nbLangues, 'langue', 'langues') },
    { n: nbRegions, libelle: pluriel(nbRegions, 'région', 'régions') },
  ]
  return (
    <dl className={`verre flex gap-7 rounded-3xl px-6 py-3 ${className}`}>
      {chiffres.map(({ n, libelle }) => (
        <div key={libelle} className="flex flex-col-reverse">
          <dt className="text-sm font-semibold text-discret">{libelle}</dt>
          <dd className="font-display text-3xl font-extrabold leading-none tracking-tight">
            <Compteur valeur={n} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
