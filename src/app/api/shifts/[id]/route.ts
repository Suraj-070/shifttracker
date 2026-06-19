import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: shift, error } = await supabase
      .from('shifts')
      .update({
        covering_for: body.coveringFor,
        shift_date: body.shiftDate,
        location_name: body.locationName,
        notes: body.notes,
        shift_day: body.shiftDay,
        amount_earned: body.amountEarned,
        status: body.status,
      })
      .eq('id', id)
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
        status: shift.status,
        createdAt: shift.created_at,
      }
    })
  } catch (error) {
    console.error('PATCH /api/shifts/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)
      .select()

    if (error) throw error

    // Supabase returns an empty array (not an error) when the id simply
    // doesn't match any row — catch that case explicitly so it doesn't
    // look like a silent success.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No shift was deleted. It may have already been removed.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, deleted: data[0] })
  } catch (error) {
    console.error('DELETE /api/shifts/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}