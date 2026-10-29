// Le fond de la carte et les calques que l'on peut allumer ou éteindre. Le Burkina reste toujours détaillé.
export type Fond = 'maquette' | 'satellite' | 'carte'

export const FONDS: { id: Fond; nom: string; aide: string }[] = [
  { id: 'maquette', nom: 'Maquette 3D', aide: 'Le pays en relief, posé sur ses voisins' },
  { id: 'satellite', nom: 'Satellite', aide: 'Photographie réelle, Sentinel-2 2024' },
  { id: 'carte', nom: 'Carte en relief', aide: 'Altitudes et végétation en couleurs' },
]

export type Calques = {
  relief: boolean
  vegetation: boolean
  courbes: boolean
  eau: boolean
  sommets: boolean
  voisins: boolean
  arbres: boolean
  villes: boolean
}

export const CALQUES_DEFAUT: Calques = {
  relief: true,
  vegetation: true,
  courbes: true,
  eau: true,
  sommets: true,
  voisins: true,
  arbres: true,
  villes: true,
}

// `fonds` : les fonds où le calque a un sens (la photo montre déjà la végétation réelle).
export const LIBELLES_CALQUES: {
  id: keyof Calques
  nom: string
  aide: string
  fonds: Fond[]
}[] = [
  {
    id: 'relief',
    nom: 'Relief',
    aide: 'Ombres portées par les collines',
    fonds: ['satellite', 'carte'],
  },
  {
    id: 'vegetation',
    nom: 'Végétation',
    aide: 'Forêts, savane, zones humides, sols nus',
    fonds: ['carte'],
  },
  {
    id: 'arbres',
    nom: 'Arbres',
    aide: 'Là où les forêts et la savane arborée sont réelles',
    fonds: ['maquette'],
  },
  {
    id: 'villes',
    nom: 'Villes',
    aide: 'Les treize chefs-lieux de région',
    fonds: ['maquette'],
  },
  {
    id: 'courbes',
    nom: 'Courbes de niveau',
    aide: 'Une ligne tous les 25 m, Burkina',
    fonds: ['satellite', 'carte'],
  },
  {
    id: 'eau',
    nom: "Cours d'eau et lacs",
    aide: 'Fleuves, rivières, barrages',
    fonds: ['maquette', 'satellite', 'carte'],
  },
  {
    id: 'sommets',
    nom: 'Sommets',
    aide: 'Points hauts avec leur altitude',
    fonds: ['maquette', 'satellite', 'carte'],
  },
  {
    id: 'voisins',
    nom: 'Pays voisins',
    aide: 'Assombris, sans détails',
    fonds: ['satellite', 'carte'],
  },
]
