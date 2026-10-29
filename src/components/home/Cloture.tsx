import BoutonEchelle from '@/components/ui/BoutonEchelle'

export default function Cloture() {
  return (
    <section aria-labelledby="titre-cloture" className="px-5 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <h2
          id="titre-cloture"
          className="font-display text-[clamp(2.5rem,7vw,4.75rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-balance"
        >
          Écoutez la voix du conteur, choisissez la suite
        </h2>
        <p className="max-w-[52ch] font-serif text-xl leading-relaxed text-discret">
          Les premiers contes arrivent : chaque récit s'ouvrira sur son lieu, avec la voix
          du conteur dans sa langue, le texte surligné au rythme de la voix et, parfois,
          un choix qui oriente la suite de l'histoire.
        </p>
        <BoutonEchelle to="/carte">Explorer la carte</BoutonEchelle>
      </div>

      <p className="mx-auto mt-24 max-w-4xl border-t border-ligne pt-6 text-base text-discret">
        Fond de carte : limites administratives de la Banque mondiale via geoBoundaries
        (CC BY 4.0), altitudes des tuiles Terrarium (AWS Open Data), rivières Natural
        Earth.
      </p>
    </section>
  )
}
