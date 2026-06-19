import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getOrCreateUserByEmail } from '@/lib/get-or-create-user'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? undefined,
      session.user.image ?? undefined
    )
    const userId = dbUser.id

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .order('shift_date', { ascending: false })

    if (error) throw error

    let totalEarned = 0
    let totalPaid = 0
    let totalUnpaid = 0
    let paidShifts = 0
    let unpaidShifts = 0

    const monthMap = new Map<string, { earned: number; paid: number; unpaid: number; shiftCount: number }>()

    for (const s of shifts ?? []) {
      const amount = parseFloat(s.amount_earned) || 0
      totalEarned += amount

      if (s.status === 'Paid') {
        totalPaid += amount
        paidShifts++
      } else {
        totalUnpaid += amount
        unpaidShifts++
      }

      const dateObj = new Date(s.shift_date + 'T00:00:00')
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      const existing = monthMap.get(monthKey) ?? { earned: 0, paid: 0, unpaid: 0, shiftCount: 0 }
      existing.earned += amount
      existing.shiftCount++
      if (s.status === 'Paid') existing.paid += amount
      else existing.unpaid += amount
      monthMap.set(monthKey, existing)
    }

    const monthly = Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-')
        const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long',
        })
        return { monthKey, monthLabel, ...data }
      })

    const totalShifts = shifts?.length ?? 0
    const summary = {
      totalEarned,
      totalPaid,
      totalUnpaid,
      totalShifts,
      paidShifts,
      unpaidShifts,
      averagePerShift: totalShifts > 0 ? totalEarned / totalShifts : 0,
    }

    return NextResponse.json({ summary, monthly })
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}