export type Tag = { id: number; name: string; color: string }

export type Customer = {
  id: number
  name: string
  phone: string
  email: string | null
  source: string | null
  location: string | null
  notes: string | null
  marketingConsent: boolean
  consentSource: string | null
  consentAt: string | null
  optedOut: boolean
  createdAt: string
  tags: Tag[]
}

export type CustomerDraft = {
  name: string
  phone: string
  email: string
  source: string
  location: string
  notes: string
  marketingConsent: boolean
  consentSource: string
  optedOut: boolean
}

export type Deal = {
  id: number
  customerId: number
  customerName: string
  product: string
  stage: string
  amount: number | null
  followUpAt: string | null
  notes: string | null
  createdAt: string
}
export type Activity = { id: number; customerId: number; body: string; createdAt: string }
export type Sms = {
  id: number
  customerId: number
  body: string
  purpose: string
  status: string
  providerMessageId: string | null
  errorMessage: string | null
  createdAt: string
}
export type Session = { username: string; smsMode: string }

export const STAGES = [
  { id: 'NEW', label: 'New lead' },
  { id: 'VISITED', label: 'Visited' },
  { id: 'QUOTED', label: 'Quoted' },
  { id: 'FOLLOW_UP', label: 'Follow-up' },
  { id: 'WON', label: 'Won' },
  { id: 'LOST', label: 'Lost' }
] as const
export const emptyCustomer: CustomerDraft = {
  name: '', phone: '', email: '', source: '', location: '', notes: '',
  marketingConsent: false, consentSource: '', optedOut: false
}
