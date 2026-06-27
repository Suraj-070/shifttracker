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
      .order('created_at', { ascending: false })

    if (error) throw error

    const mapped = shifts.map((s) => ({
      id: s.id,
      userId: s.user_id,
      coveringFor: s.covering_for,
      shiftDate: s.shift_date,
      locationName: s.location_name,
      notes: s.notes ?? '',
      shiftDay: s.shift_day,
      amountEarned: s.amount_earned,
      hoursWorked: s.hours_worked ?? 0,
      status: s.status,
      createdAt: s.created_at,
    }))

    return NextResponse.json({ shifts: mapped, userId })
  } catch (error) {
    console.error('GET /api/shifts error:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { coveringFor, shiftDate, locationName, notes, shiftDay, amountEarned, hoursWorked, status } = body

    if (!coveringFor || !shiftDate || !locationName || !shiftDay || !amountEarned) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dbUser = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? undefined,
      session.user.image ?? undefined
    )
    const userId = dbUser.id

    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        user_id: userId,
        covering_for: coveringFor,
        shift_date: shiftDate,
        location_name: locationName,
        notes: notes ?? '',
        shift_day: shiftDay,
        amount_earned: amountEarned,
        hours_worked: hoursWorked ?? 0,
        status: status ?? 'Unpaid',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      shift: {
        id: shift.id,
        userId: shift.user_id,
        coveringFor: shift.covering_for,
        shiftDate: shift.shift_date,
        locationName: shift.location_name,
        notes: shift.notes ?? '',
        shiftDay: shift.shift_day,
        amountEarned: shift.amount_earned,
        hoursWorked: shift.hours_worked ?? 0,
        status: shift.status,
        createdAt: shift.created_at,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/shifts error:', error)
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}