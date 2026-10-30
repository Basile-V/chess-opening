import type { Color } from './repertoire.ts'

export type ExplorerMove = { san: string; white: number; draws: number; black: number }
export type Explorer = { moves: ExplorerMove[]; opening?: string }
export type Suggestion = { san: string; games: number; score: number }

const MIN_GAMES = 20
const MIN_SHARE = 0.05
const MAX_SHOWN = 5

const errors: Record<number, string> = {
  401: 'Jeton refusé par Lichess : vérifie le secret Cloudflare.',
  503: 'Jeton Lichess absent de Cloudflare.',
  429: 'Trop d’appels à Lichess : réessaie dans une minute.',
}

const cache = new Map<string, Explorer>()

export async function fetchExplorer(fen: string, signal: AbortSignal): Promise<Explorer> {
  const cached = cache.get(fen)
  if (cached) return cached

  const res = await fetch(`/api/explorer?${new URLSearchParams({ fen })}`, { signal })
  if (!res.ok) throw new Error(errors[res.status] ?? `Lichess a répondu ${res.status}.`)
  if (!res.headers.get('content-type')?.includes('json')) throw new Error('Explorateur indisponible : lance npm run dev:worker.')

  const data: { moves: ExplorerMove[]; opening?: { name: string } | null } = await res.json()
  const explorer = { moves: data.moves, opening: data.opening?.name }
  cache.set(fen, explorer)
  return explorer
}

// ponytail: score de parties réelles sans moteur, un coup populaire peut être mauvais. Le seuil écarte les petits échantillons.
export function suggest(moves: ExplorerMove[], color: Color, myTurn: boolean): Suggestion[] {
  const byGames = moves
    .map(({ san, white, draws, black }) => {
      const games = white + draws + black
      const wins = color === 'white' ? white : black
      return { san, games, score: games === 0 ? 0 : (wins + draws / 2) / games }
    })
    .toSorted((a, b) => b.games - a.games)

  if (!myTurn) return byGames.slice(0, MAX_SHOWN)

  const total = byGames.reduce((sum, move) => sum + move.games, 0)
  const threshold = Math.max(MIN_GAMES, total * MIN_SHARE)
  const solid = byGames.filter((move) => move.games >= threshold).toSorted((a, b) => b.score - a.score)
  const rare = byGames.filter((move) => move.games < threshold)
  return [...solid, ...rare].slice(0, MAX_SHOWN)
}
