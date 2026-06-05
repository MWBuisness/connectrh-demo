import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [key, value] = cookie.trim().split('=')
            if (key === name) return decodeURIComponent(value)
          }
          return undefined
        },
        set(name: string, value: string, options: any) {
          let cookie = `${name}=${encodeURIComponent(value)}`
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options?.path) cookie += `; path=${options.path}`
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
          if (options?.secure) cookie += `; secure`
          document.cookie = cookie
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; max-age=0; path=${options?.path ?? '/'}`
        },
      },
    }
  )
}
