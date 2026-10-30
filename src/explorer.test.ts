import assert from 'node:assert/strict'
import { test } from 'node:test'
import { explorer } from '../worker/index.ts'
import { suggest, type ExplorerMove } from './explorer.ts'

const move = (san: string, white: number, draws: number, black: number): ExplorerMove => ({ san, white, draws, black })

test('à mon tour, le meilleur score passe avant le coup le plus joué', () => {
  const moves = [move('e4', 500, 0, 500), move('d4', 300, 0, 100)]
  assert.equal(suggest(moves, 'white', true)[0]?.san, 'd4')
})

test('le score se lit du côté de ma couleur', () => {
  const moves = [move('e5', 700, 0, 300), move('c5', 300, 0, 700)]
  const [best] = suggest(moves, 'black', true)
  assert.equal(best?.san, 'c5')
  assert.equal(best?.score, 0.7)
})

test('une nulle compte pour un demi-point', () => {
  assert.equal(suggest([move('e4', 10, 20, 10)], 'white', true)[0]?.score, 0.5)
})

test('un petit échantillon ne passe pas devant un coup bien testé', () => {
  const moves = [move('e4', 500, 0, 500), move('a4', 5, 0, 0)]
  assert.equal(suggest(moves, 'white', true)[0]?.san, 'e4')
})

test('un coup trop rare par rapport à la position reste derrière', () => {
  const moves = [move('e4', 5000, 0, 5000), move('h4', 100, 0, 0)]
  assert.equal(suggest(moves, 'white', true)[0]?.san, 'e4')
})

test('au tour adverse, les coups sont classés par fréquence', () => {
  const moves = [move('d5', 100, 0, 900), move('e5', 2000, 0, 1000)]
  assert.deepEqual(suggest(moves, 'white', false).map((m) => m.san), ['e5', 'd5'])
})

test('une position sans partie ne propose rien', () => {
  assert.deepEqual(suggest([], 'white', true), [])
})

test('une position peu jouée propose quand même ses coups', () => {
  assert.equal(suggest([move('e4', 3, 0, 1)], 'white', true)[0]?.san, 'e4')
})

const FEN = 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2'
const call = (fen: string, token?: string, headers: Record<string, string> = {}) =>
  explorer(new Request(`https://site.test/api/explorer?fen=${encodeURIComponent(fen)}`, { headers }), token)

test('la fonction ajoute le jeton et ne laisse passer que les filtres du serveur', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json({ moves: [] }))
  const res = await call(FEN, 'secret')
  assert.equal(res.status, 200)
  assert.equal(JSON.stringify(await res.json()).includes('secret'), false)
  const [url, init] = upstream.mock.calls[0]?.arguments as [string, RequestInit]
  assert.ok(url.startsWith('https://explorer.lichess.ovh/lichess?'))
  assert.ok(!url.includes('secret'))
  assert.deepEqual(init.headers, { Authorization: 'Bearer secret' })
})

test('la fonction refuse ce qui n’est pas une position', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response())
  for (const fen of ['', 'x', `${FEN}&ratings=2500`]) {
    assert.equal((await call(fen, 'secret')).status, 400, fen)
  }
  assert.equal(upstream.mock.callCount(), 0)
})

test('la fonction n’accepte que GET', async () => {
  const post = new Request('https://site.test/api/explorer', { method: 'POST' })
  assert.equal((await explorer(post, 'secret')).status, 405)
})

test('la fonction refuse les autres sites et signale un jeton absent', async () => {
  const crossSite = await call(FEN, 'secret', { 'sec-fetch-site': 'cross-site' })
  assert.equal(crossSite.status, 403)
  assert.equal((await call(FEN)).status, 503)
})
