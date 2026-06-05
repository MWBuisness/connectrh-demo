import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(date))
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(date))
}

export function getAnciennete(dateEntree: string): string {
  const diff = Date.now() - new Date(dateEntree).getTime()
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.5 * 24 * 3600 * 1000))
  if (years === 0) return `${months} mois`
  if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`
}

export function getInitials(prenom: string, nom: string): string {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase()
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    salarie: 'Salarié',
    responsable: 'Responsable',
    rh_admin: 'Administrateur RH',
  }
  return labels[role] ?? role
}

export function masquerIBAN(iban: string): string {
  if (!iban || iban.length < 8) return iban
  return iban.slice(0, 4) + ' **** **** **** ' + iban.slice(-4)
}
