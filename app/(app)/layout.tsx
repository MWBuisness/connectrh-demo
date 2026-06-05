import Sidebar from '@/components/layout/Sidebar'
import type { UserProfile } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Pour la démo : si pas de session, afficher quand même le layout
  const profile = session ? (await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()).data : null

  if (!profile) {
    // Redirection côté client uniquement
    return (
      <html><body>
        <script dangerouslySetInnerHTML={{__html: `window.location.href='/auth/login'`}} />
      </body></html>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile as UserProfile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
