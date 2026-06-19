import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateUserByEmail } from '@/lib/get-or-create-user'

export async function GET() {
  try {
    // FIX: session check — only export current user's data
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const dbUser = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? undefined,
      session.user.image ?? undefined
    )

    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('shift_date', { ascending: false })

    if (error) throw error

    const headers = ['Date', 'Day', 'Location', 'Covering For', 'Amount', 'Status', 'Notes']
    const csvRows = [headers.join(',')]

    for (const s of shifts ?? []) {
      const row = [
        s.shift_date,
        s.shift_day,
        `"${(s.location_name ?? '').replace(/"/g, '""')}"`,
        `"${(s.covering_for ?? '').replace(/"/g, '""')}"`,
        s.amount_earned,
        s.status,
        `"${(s.notes ?? '').replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="shifts-export.csv"',
      },
    })
  } catch (error) {
    console.error('GET /api/profile/export error:', error)
    return NextResponse.json({ error: 'Failed to export shifts' }, { status: 500 })
  }
}