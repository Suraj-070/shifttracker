import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateUserByEmail } from '@/lib/get-or-create-user'

// PATCH /api/shifts/bulk
// Body: { ids: string[], status: 'Paid' | 'Unpaid' }
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, status } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }
    if (status !== 'Paid' && status !== 'Unpaid') {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }

    const dbUser = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? undefined,
      session.user.image ?? undefined
    )

    const { data, error } = await supabase
      .from('shifts')
      .update({ status })
      .in('id', ids)
      .eq('user_id', dbUser.id)
      .select('id, status')

    if (error) throw error

    return NextResponse.json({ updated: data })
  } catch (error) {
    console.error('PATCH /api/shifts/bulk error:', error)
    return NextResponse.json({ error: 'Failed to bulk update' }, { status: 500 })
  }
}