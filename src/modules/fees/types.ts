export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'other'

export type FeeObligationStatus = 'open' | 'paid' | 'cancelled'
export type FeePaymentStatus = 'posted' | 'reversed'

export type FeeObligation = {
  id: string
  studentId: string
  enrollmentId?: string
  description: string
  amount: number
  remainingBalance: number
  dueDate: string
  status: FeeObligationStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type FeeObligationInput = {
  studentId: string
  enrollmentId?: string
  description: string
  amount: number
  dueDate: string
}

export type FeePayment = {
  id: string
  studentId: string
  obligationId?: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  reference: string
  notes: string
  status: FeePaymentStatus
  reviewRequired: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  reversedAt?: string
  reversedBy?: string
}

export type FeePaymentInput = {
  studentId: string
  obligationId?: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  reference: string
  notes: string
}
