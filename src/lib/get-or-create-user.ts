import { supabase } from '@/lib/supabase'

export async function getOrCreateUserByEmail(email: string, name?: string, image?: string) {
  // Try to find existing user by email
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (existing) return existing

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ email, name: name ?? email, image: image ?? null })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return newUser
}

// Legacy — kept for compatibility
export async function getOrCreateUserId(): Promise<string> {
  const { data: users } = await supabase.from('users').select('*').limit(1)
  if (users && users.length > 0) return users[0].id
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ name: 'Demo User', email: 'demo@example.com' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return newUser!.id
}