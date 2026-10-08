import { type FormEvent, useMemo, useState } from 'react'
import type { Student } from '../students/types'
import type { FeeObligation, FeeObligationInput, FeePayment, FeePaymentInput } from './types'

type FeesManagementPageProps = {
  students: Student[]
  obligations: FeeObligation[]
  payments: FeePayment[]
  onCreateObligation: (input: FeeObligationInput) => Promise<void>
  onCreatePayment: (input: FeePaymentInput) => Promise<void>
  onReversePayment: (id: string) => Promise<void>
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

function FeesManagementPage({
  students,
  obligations,
  payments,
  onCreateObligation,
  onCreatePayment,
  onReversePayment,
}: FeesManagementPageProps) {
  const [obligationStudentId, setObligationStudentId] = useState('')
  const [obligationAmount, setObligationAmount] = useState('')
  const [obligationDueDate, setObligationDueDate] = useState('')
  const [obligationDescription, setObligationDescription] = useState('')
  const [obligationError, setObligationError] = useState('')
  const [obligationSaving, setObligationSaving] = useState(false)

  const [paymentStudentId, setPaymentStudentId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'other'>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10))

  const studentSummaries = useMemo(
    () =>
      students.map((student) => {
        const studentObligations = obligations.filter(
          (entry) => entry.studentId === student.id && entry.status !== 'cancelled',
        )
        const studentPayments = payments.filter((entry) => entry.studentId === student.id)
        const totalObligations = studentObligations.reduce((total, entry) => total + entry.amount, 0)
        const postedPayments = studentPayments
          .filter((entry) => entry.status === 'posted')
          .reduce((total, entry) => total + entry.amount, 0)
        const balance = studentObligations.reduce((total, entry) => total + entry.remainingBalance, 0)
        const overdueCount = studentObligations.filter(
          (entry) => entry.status === 'open' && entry.dueDate && entry.dueDate < todayIso && entry.remainingBalance > 0,
        ).length

        return {
          student,
          totalObligations,
          postedPayments,
          balance,
          overdueCount,
        }
      }),
    [obligations, payments, students, todayIso],
  )

  const recentPayments = useMemo(
    () =>
      [...payments]
        .filter((entry) => entry.status === 'posted')
        .sort((left, right) => new Date(right.paymentDate).getTime() - new Date(left.paymentDate).getTime())
        .slice(0, 8),
    [payments],
  )

  const totalOutstanding = studentSummaries.reduce((total, row) => total + Math.max(row.balance, 0), 0)
  const totalPaymentsReceived = payments
    .filter((entry) => entry.status === 'posted')
    .reduce((total, entry) => total + entry.amount, 0)
  const reviewRequiredCount = payments.filter((entry) => entry.reviewRequired && entry.status === 'posted').length

  const handleObligationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setObligationError('')

    if (!obligationStudentId) {
      setObligationError('Choose a student before creating an obligation.')
      return
    }

    const amount = Number(obligationAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setObligationError('Fee obligation amount must be greater than zero.')
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(obligationDueDate)) {
      setObligationError('Select a valid due date.')
      return
    }

    setObligationSaving(true)
    try {
      await onCreateObligation({
        studentId: obligationStudentId,
        description: obligationDescription.trim() || 'Course fee obligation',
        amount,
        dueDate: obligationDueDate,
      })
      setObligationDescription('')
      setObligationAmount('')
      setObligationDueDate('')
      setObligationStudentId('')
    } catch (error) {
      setObligationError(error instanceof Error ? error.message : 'Unable to save the fee obligation.')
    } finally {
      setObligationSaving(false)
    }
  }

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPaymentError('')

    if (!paymentStudentId) {
      setPaymentError('Choose a student before recording a payment.')
      return
    }

    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Payment amount must be greater than zero.')
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      setPaymentError('Select a valid payment date.')
      return
    }

    setPaymentSaving(true)
    try {
      await onCreatePayment({
        studentId: paymentStudentId,
        amount,
        paymentDate,
        method: paymentMethod,
        reference: paymentReference.trim() || 'Manual entry',
        notes: paymentNotes.trim(),
      })
      setPaymentStudentId('')
      setPaymentAmount('')
      setPaymentDate('')
      setPaymentMethod('cash')
      setPaymentReference('')
      setPaymentNotes('')
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to save the payment record.')
    } finally {
      setPaymentSaving(false)
    }
  }

  const handleReversePayment = async (paymentId: string) => {
    setPaymentError('')
    try {
      await onReversePayment(paymentId)
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to reverse the payment.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">Finance</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Fees and payments</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Record obligations, accept payments, and review balances for each student using the academy’s fee ledger.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Outstanding balance</p>
          <p className="mt-3 text-3xl font-bold text-white">{formatCurrency(totalOutstanding)}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Payments received</p>
          <p className="mt-3 text-3xl font-bold text-white">{formatCurrency(totalPaymentsReceived)}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Overdue obligations</p>
          <p className="mt-3 text-3xl font-bold text-white">
            {studentSummaries.reduce((total, row) => total + row.overdueCount, 0)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Review flags</p>
          <p className="mt-3 text-3xl font-bold text-white">{reviewRequiredCount}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={handleObligationSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold text-white">Create student obligation</h2>
          <div className="mt-5 grid gap-4">
            <div>
              <label htmlFor="obligation-student" className="mb-2 block text-sm font-medium text-slate-200">Student</label>
              <select
                id="obligation-student"
                value={obligationStudentId}
                onChange={(event) => setObligationStudentId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="">Select a student</option>
                {students
                  .filter((student) => student.status === 'active')
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} ({student.studentIdentifier})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="obligation-description" className="mb-2 block text-sm font-medium text-slate-200">Description</label>
              <input
                id="obligation-description"
                value={obligationDescription}
                onChange={(event) => setObligationDescription(event.target.value)}
                placeholder="Tuition, lab fee, registration fee"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="obligation-amount" className="mb-2 block text-sm font-medium text-slate-200">Amount</label>
                <input
                  id="obligation-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={obligationAmount}
                  onChange={(event) => setObligationAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                />
              </div>
              <div>
                <label htmlFor="obligation-date" className="mb-2 block text-sm font-medium text-slate-200">Due date</label>
                <input
                  id="obligation-date"
                  type="date"
                  value={obligationDueDate}
                  onChange={(event) => setObligationDueDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                />
              </div>
            </div>

            {obligationError ? (
              <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{obligationError}</p>
            ) : null}

            <button
              type="submit"
              disabled={obligationSaving}
              className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {obligationSaving ? 'Saving obligation...' : 'Save obligation'}
            </button>
          </div>
        </form>

        <form onSubmit={handlePaymentSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold text-white">Record payment</h2>
          <div className="mt-5 grid gap-4">
            <div>
              <label htmlFor="payment-student" className="mb-2 block text-sm font-medium text-slate-200">Student</label>
              <select
                id="payment-student"
                value={paymentStudentId}
                onChange={(event) => setPaymentStudentId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} ({student.studentIdentifier})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="payment-amount" className="mb-2 block text-sm font-medium text-slate-200">Amount</label>
                <input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                />
              </div>
              <div>
                <label htmlFor="payment-method" className="mb-2 block text-sm font-medium text-slate-200">Method</label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as 'cash' | 'bank_transfer' | 'card' | 'other')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="payment-date" className="mb-2 block text-sm font-medium text-slate-200">Payment date</label>
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="payment-reference" className="mb-2 block text-sm font-medium text-slate-200">Reference</label>
              <input
                id="payment-reference"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Receipt number or transfer reference"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="payment-notes" className="mb-2 block text-sm font-medium text-slate-200">Notes</label>
              <textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                rows={3}
                placeholder="Optional note or memo"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />
            </div>

            {paymentError ? (
              <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{paymentError}</p>
            ) : null}

            <button
              type="submit"
              disabled={paymentSaving}
              className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {paymentSaving ? 'Recording payment...' : 'Record payment'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Student balances</h2>
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
              {studentSummaries.length} students
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Obligations</th>
                  <th className="px-4 py-3 font-medium">Payments</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-200">
                {studentSummaries.map(({ student, totalObligations, postedPayments, balance }) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{student.fullName}</div>
                      <div className="text-xs text-slate-400">{student.studentIdentifier}</div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(totalObligations)}</td>
                    <td className="px-4 py-3">{formatCurrency(postedPayments)}</td>
                    <td className={`px-4 py-3 font-semibold ${balance > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
                      {formatCurrency(balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-semibold text-white">Recent payments</h2>
          <div className="mt-5 space-y-3">
            {recentPayments.length ? (
              recentPayments.map((record) => {
                const student = students.find((candidate) => candidate.id === record.studentId)
                return (
                  <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{student?.fullName ?? 'Unknown student'}</p>
                      <span className="text-sm font-semibold text-violet-200">{formatCurrency(record.amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{record.paymentDate} · {record.method}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300">{record.reference}</span>
                      {record.reviewRequired ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                          review
                        </span>
                      ) : null}
                    </div>
                    {record.status === 'posted' ? (
                      <button
                        type="button"
                        onClick={() => void handleReversePayment(record.id)}
                        className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-500 hover:text-white"
                      >
                        Reverse payment
                      </button>
                    ) : (
                      <span className="mt-3 inline-block text-xs text-slate-400">Reversed</span>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                No payment records have been added yet.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

export default FeesManagementPage
