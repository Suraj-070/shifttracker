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

    const user = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? undefined,
      session.user.image ?? undefined
    )

    return NextResponse.json({
      ...user,
      // Ensure createdAt is always a valid ISO string
      createdAt: user.created_at ?? new Date().toISOString(),
    })
  } catch (error) {
    console.error('GET /api/profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: updated } = await supabase
      .from('users')
      .update({ name: body.name, username: body.username, image: body.image })
      .eq('email', session.user.email)
      .select()
      .single()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}