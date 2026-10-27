import BoutonEchelle from '@/components/ui/BoutonEchelle'

export default function Cloture() {
  return (
    <section
      aria-labelledby="titre-cloture"
      className="bg-nuit px-5 py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <h2
          id="titre-cloture"
          className="font-display text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.9] text-balance"
        >
          Écoutez la voix du conteur, choisissez la suite
        </h2>
        <p className="max-w-[52ch] font-serif text-xl leading-relaxed text-os/90">
          Chaque récit s'ouvre sur son lieu, se lit dans la langue d'origine et en
          français, et le texte se surligne au rythme de la voix. À certains moments,
          c'est à vous de décider quel chemin prend l'histoire.
        </p>
        <BoutonEchelle to="/carte">Explorer la carte</BoutonEchelle>
      </div>

      <p className="mx-auto mt-24 max-w-4xl border-t border-indigo pt-6 text-base text-os/70">
        Fond de carte : limites administratives de la Banque mondiale via geoBoundaries
        (CC BY 4.0), altitudes des tuiles Terrarium (AWS Open Data), rivières Natural
        Earth.
      </p>
    </section>
  )
}
