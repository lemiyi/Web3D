import { Link, useParams } from 'react-router-dom'
import { conteParId } from '@/lib/contenu'

// Squelette : le lecteur de scènes (rôle B) viendra dans components/reader.
export default function Conte() {
  const { id } = useParams()
  const conte = id ? conteParId(id) : undefined

  if (!conte)
    return (
      <p className="p-6">
        Conte introuvable.{' '}
        <Link to="/carte" className="underline">
          Retour à la carte
        </Link>
      </p>
    )

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold">{conte.titre.fr}</h1>
      <p className="mt-2 text-sm">
        {conte.dureeMinutes} min · {conte.scenes.length} scènes
      </p>
      <p className="mt-6">{conte.scenes[0].texteFr}</p>
    </article>
  )
}
