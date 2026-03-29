// ─── Users ────────────────────────────────────────────────────────────────────

export type UserType = "passenger" | "driver"
export type UserStatus = "active" | "suspended" | "pending"
export type PlanTier = "enterprise" | "professional" | "starter" | "trial" | "free"

export interface AppUser {
  id: string
  name: string
  email: string
  phone: string
  type: UserType
  status: UserStatus
  plan: PlanTier
  companyId?: string
  companyName?: string
  rides: number
  rating: number
  joinedDate: string
  lastActive: string
  city: string
  // driver-specific
  vehicle?: string
  licensePlate?: string
}

// ─── Companies ────────────────────────────────────────────────────────────────

export type CompanyStatus = "active" | "trial" | "suspended"

export interface Company {
  id: string
  name: string
  initials: string
  ownerName: string
  ownerEmail: string
  userCount: number
  status: CompanyStatus
  plan: PlanTier
  mrr: number
  joinedDate: string
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface BillingPlan {
  id: string
  name: string
  price: number
  maxUsers: number | "unlimited"
  apiCallsLimit: number | "unlimited"
  features: string[]
  popular?: boolean
}

export type PaymentStatus = "paid" | "failed" | "refunded" | "pending"

export interface Payment {
  id: string
  date: string
  description: string
  transactionId: string
  amount: number
  status: PaymentStatus
}

// ─── Rides ────────────────────────────────────────────────────────────────────

export type RideStatus = "completed" | "in_progress" | "cancelled" | "pending" | "searching"

export interface Ride {
  id: string
  passenger: string
  passengerPhone: string
  driver: string
  driverPhone: string
  pickupAddress: string
  dropoffAddress: string
  status: RideStatus
  price: string
  distance: string
  duration: string
  date: string
  paymentMethod: string
}

// ─── Support ──────────────────────────────────────────────────────────────────

export type TicketStatus = "open" | "pending" | "resolved" | "closed"
export type TicketPriority = "high" | "medium" | "low"

export interface Message {
  id: string
  sender: "user" | "admin"
  senderName: string
  text: string
  timestamp: string
}

export interface Ticket {
  id: string
  user: string
  userPhone: string
  subject: string
  category: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  lastUpdated: string
  messages: Message[]
}

// ─── Product / Feature Flags ──────────────────────────────────────────────────

export type FeatureStatus = "production" | "beta" | "paused"

export interface FeatureFlag {
  id: string
  name: string
  description: string
  status: FeatureStatus
  rolloutPct: number
  enabled: boolean
  lastModified: string
}

export type AiModel = {
  id: string
  name: string
  description: string
  selected: boolean
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error"

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  eventType: string
  component: string
  message: string
  userId?: string
}
