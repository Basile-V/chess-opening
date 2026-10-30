type Env = { LICHESS_TOKEN?: string; ASSETS: { fetch: (request: Request) => Promise<Response> } }

const ENDPOINT = 'https://explorer.lichess.ovh/lichess'
const FEN = /^[1-8pnbrqkPNBRQK/]{15,92} [wb] [KQkq-]{1,4} [a-h1-8-]{1,2} \d{1,3} \d{1,4}$/

// ponytail: Sec-Fetch-Site n'arrête que les navigateurs, un script peut encore consommer le quota. Protéger le site avec Cloudflare Access si ça arrive.
export async function explorer(request: Request, token?: string) {
  if (request.method !== 'GET') return new Response('Méthode refusée', { status: 405 })
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Interdit', { status: 403 })
  if (!token) return new Response('Jeton absent', { status: 503 })

  const fen = new URL(request.url).searchParams.get('fen') ?? ''
  if (!FEN.test(fen)) return new Response('Position invalide', { status: 400 })

  const params = new URLSearchParams({
    fen,
    ratings: '1400,1600,1800',
    speeds: 'blitz,rapid,classical',
    moves: '12',
    topGames: '0',
    recentGames: '0',
  })
  const res = await fetch(`${ENDPOINT}?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}

export default {
  fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url)
    return pathname === '/api/explorer' ? explorer(request, env.LICHESS_TOKEN) : env.ASSETS.fetch(request)
  },
}
