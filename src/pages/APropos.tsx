export default function APropos() {
  return (
    <section className="mx-auto max-w-2xl px-5 pb-16 pt-28">
      <h1 className="font-display text-4xl font-extrabold leading-[1] tracking-[-0.035em]">
        À propos
      </h1>
      <p className="mt-5 font-serif text-xl leading-relaxed">
        Projet de préservation du patrimoine oral burkinabè. Page à compléter : équipe,
        conteurs, illustrateurs, licences (carte, polices, sons) et mention des
        illustrations générées par IA le cas échéant.
      </p>

      <h2 className="mt-12 font-display text-2xl font-extrabold tracking-tight">
        Sources de la carte
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 font-serif text-lg leading-relaxed">
        <li>
          Altitudes : tuiles Terrarium (AWS Open Data), issues de SRTM et d’autres modèles
          d’élévation.
        </li>
        <li>
          Limites du Burkina Faso, de ses régions et des pays voisins : geoBoundaries /
          Banque mondiale (CC BY 4.0).
        </li>
        <li>
          Cours d’eau, plans d’eau et sommets du Burkina : © les contributeurs
          d’OpenStreetMap (ODbL).
        </li>
        <li>
          Grands fleuves, grands lacs et sommets des pays voisins : Natural Earth (domaine
          public).
        </li>
        <li>
          Images satellite : EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH
          (Contains modified Copernicus Sentinel data 2024), licence CC BY-NC-SA 4.0 pour
          un usage non commercial.
        </li>
        <li>
          Lumières nocturnes : NASA Earth Observatory, Black Marble 2016 (domaine public).
        </li>
        <li>
          Sites naturels du survol (pics de Sindou, cascades de Karfiguéla, dômes de
          Fabédougou, lac de Tengrela, parc national d’Arly) : coordonnées et descriptions
          tirées de Wikipédia.
        </li>
        <li>
          Végétation du fond « Carte en relief », couleurs et arbres de la « Maquette 3D »
          : ESA WorldCover 2021, couverture terrestre à 10 m (CC BY 4.0).
        </li>
        <li>
          Maquette 3D : images EOxCloudless retravaillées en peinture (même licence CC
          BY-NC-SA 4.0), relief Terrarium exagéré pour être lisible. Les arbres et les
          maisons sont des symboles : leur taille n’est pas à l’échelle.
        </li>
        <li>Courbes de niveau : calculées à partir des altitudes ci-dessus.</li>
      </ul>
    </section>
  )
}
