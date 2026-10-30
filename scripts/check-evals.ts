// Développement uniquement : compare chaque coup conseillé à l'évaluation cloud Lichess (publique, sans jeton).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { buildIndex, lines, type Color } from '../src/repertoire.ts'

const MAX_LOSS_CP = 70
const MATE_CP = 10000
const CACHE = '.evals-cache.json'

type Eval = number | null
const cache: Record<string, Eval> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

// Score toujours du point de vue des Blancs. null : position absente du cache cloud.
async function cloudEval(fen: string): Promise<Eval> {
  if (fen in cache) return cache[fen] as Eval
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`)
  if (res.status === 429) {
    console.error('429 : pause de 60 s')
    await new Promise((resolve) => setTimeout(resolve, 60000))
    return cloudEval(fen)
  }
  if (res.status === 404) return (cache[fen] = null)
  if (!res.ok) throw new Error(`cloud-eval ${res.status}`)
  const pv = (await res.json()).pvs[0]
  return (cache[fen] = pv.mate === undefined ? pv.cp : Math.sign(pv.mate) * MATE_CP)
}

const flagged: string[] = []
const unchecked: string[] = []
let checked = 0

for (const color of ['white', 'black'] as Color[]) {
  for (const [key, entry] of buildIndex(lines[color])) {
    const side = key.split(' ')[1] as string
    const myMove = entry.moves[0]
    if ((side === 'w') !== (color === 'white') || !myMove) continue

    const fen = `${key} 0 1`
    const chess = new Chess(fen)
    chess.move(myMove.san)
    const [before, after] = [await cloudEval(fen), await cloudEval(chess.fen())]
    if (before === null || after === null) {
      unchecked.push(`${color} ${fen} ${myMove.san}`)
      continue
    }
    checked++
    const loss = side === 'w' ? before - after : after - before
    if (loss > MAX_LOSS_CP) flagged.push(`-${loss} cp  ${color} ${fen}  ${myMove.san}  (avant ${before}, après ${after})`)
  }
  writeFileSync(CACHE, JSON.stringify(cache))
}

console.log(`Vérifiés : ${checked}, signalés : ${flagged.length}, non couverts : ${unchecked.length}`)
if (flagged.length) console.log(`\nSignalés :\n${flagged.join('\n')}`)
if (unchecked.length) console.log(`\nNon couverts :\n${unchecked.join('\n')}`)
process.exitCode = flagged.length ? 1 : 0
