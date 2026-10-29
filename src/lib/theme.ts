import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const MEDIA = '(prefers-color-scheme: dark)'

// Le thème choisi par la personne (data-theme) prime ; sinon on suit celui du système.
function lire(): Theme {
  const choisi = document.documentElement.dataset.theme
  if (choisi === 'dark' || choisi === 'light') return choisi
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light'
}

function souscrire(rappel: () => void) {
  const observateur = new MutationObserver(rappel)
  observateur.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  const systeme = window.matchMedia(MEDIA)
  systeme.addEventListener('change', rappel)
  return () => {
    observateur.disconnect()
    systeme.removeEventListener('change', rappel)
  }
}

export const useTheme = () =>
  useSyncExternalStore(souscrire, lire, () => 'light' as Theme)

export function basculerTheme() {
  const suivant: Theme = lire() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = suivant
  try {
    localStorage.setItem('theme', suivant)
  } catch {
    // stockage indisponible (navigation privée) : le choix vaut pour cette visite seulement
  }
}
