import { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getOrCreateUserByEmail } from '@/lib/get-or-create-user'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        await getOrCreateUserByEmail(
          user.email,
          user.name ?? undefined,
          user.image ?? undefined
        )
        return true
      } catch {
        return false
      }
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single()
        if (data) session.user.id = data.id
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}