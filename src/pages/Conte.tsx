import { Link, useParams } from 'react-router-dom'
import Lecteur from '@/components/reader/Lecteur'
import { conteParId } from '@/lib/contenu'

export default function Conte() {
  const { id } = useParams()
  const conte = id ? conteParId(id) : undefined

  if (!conte)
    return (
      <p className="px-5 pt-28">
        Conte introuvable.{' '}
        <Link to="/carte" className="font-bold text-lien underline underline-offset-4">
          Retour à la carte
        </Link>
      </p>
    )

  // `key` : un autre conte repart d'un lecteur neuf.
  return <Lecteur key={conte.id} conte={conte} />
}
