import { Chess, type Color as Side, type PieceSymbol, type Square } from 'chess.js'
import type { Color } from './repertoire.ts'

export type Analysis = { forts: string[]; faibles: string[] }

type Piece = { square: Square; type: PieceSymbol; color: Side }

const FILES = 'abcdefgh'
const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const CENTER: Square[] = ['d4', 'd5', 'e4', 'e5']
const fileOf = (square: Square) => FILES.indexOf(square.charAt(0))
const rankOf = (square: Square) => Number(square.charAt(1))
const list = (files: number[]) => files.map((f) => FILES[f]).join(', ')

function sideFacts(chess: Chess, pieces: Piece[], side: Side) {
  const mine = pieces.filter((p) => p.color === side)
  const enemyPawns = pieces.filter((p) => p.color !== side && p.type === 'p')
  const pawns = mine.filter((p) => p.type === 'p')
  const pawnFiles = FILES.split('').map((_, f) => pawns.filter((p) => fileOf(p.square) === f).length)
  const occupied = pawnFiles.flatMap((count, f) => (count ? [f] : []))
  const home = side === 'w' ? 1 : 8
  const king = mine.find((p) => p.type === 'k')?.square as Square
  const castled = rankOf(king) === home && !'def'.includes(king.charAt(0))
  const rights = chess.fen().split(' ')[2] as string
  const forward = side === 'w' ? 1 : -1

  const shield = pawns.filter(
    (p) =>
      Math.abs(fileOf(p.square) - fileOf(king)) <= 1 &&
      [home + forward, home + 2 * forward].includes(rankOf(p.square)),
  ).length

  const passed = pawns.filter(
    (p) =>
      !enemyPawns.some(
        (e) =>
          Math.abs(fileOf(e.square) - fileOf(p.square)) <= 1 &&
          (rankOf(e.square) - rankOf(p.square)) * forward > 0,
      ),
  )

  const minorHomes = side === 'w' ? ['b1', 'c1', 'f1', 'g1'] : ['b8', 'c8', 'f8', 'g8']

  return {
    isolated: occupied.filter((f) => !pawnFiles[f - 1] && !pawnFiles[f + 1]),
    doubled: occupied.filter((f) => (pawnFiles[f] as number) > 1),
    passed: [...new Set(passed.map((p) => fileOf(p.square)))],
    islands: occupied.filter((f) => !pawnFiles[f - 1]).length,
    material: mine.reduce((sum, p) => sum + VALUES[p.type], 0),
    bishops: mine.filter((p) => p.type === 'b').length,
    undeveloped: mine.filter((p) => 'nb'.includes(p.type) && minorHomes.includes(p.square)).length,
    center: CENTER.reduce((sum, square) => sum + chess.attackers(square, side).length, 0),
    castled,
    stuck: rankOf(king) === home && !castled && !rights.includes(side === 'w' ? 'K' : 'k') && !rights.includes(side === 'w' ? 'Q' : 'q'),
    exposed: castled && shield < 2,
  }
}

// ponytail: heuristique structurelle sans moteur, elle ne voit ni tactique ni activité des pièces.
export function analyse(fen: string, color: Color): Analysis {
  const chess = new Chess(fen)
  const pieces = chess.board().flat().filter((p) => p !== null)
  const side: Side = color === 'white' ? 'w' : 'b'
  const me = sideFacts(chess, pieces, side)
  const them = sideFacts(chess, pieces, side === 'w' ? 'b' : 'w')
  const forts: string[] = []
  const faibles: string[] = []
  const middlegame = Number(fen.split(' ')[5]) >= 8

  if (me.material > them.material) forts.push(`Avance matérielle (+${me.material - them.material})`)
  if (me.material < them.material) faibles.push(`Retard matériel (${me.material - them.material})`)

  if (me.isolated.length) faibles.push(`Pion isolé en ${list(me.isolated)} : à protéger, il deviendra une cible`)
  if (them.isolated.length) forts.push(`Pion adverse isolé en ${list(them.isolated)} : cible à attaquer`)
  if (me.doubled.length) faibles.push(`Pions doublés en ${list(me.doubled)}`)
  if (them.doubled.length) forts.push(`Pions adverses doublés en ${list(them.doubled)}`)
  if (me.passed.length) forts.push(`Pion passé en ${list(me.passed)}`)
  if (them.passed.length) faibles.push(`Pion passé adverse en ${list(them.passed)}`)

  if (me.islands < them.islands) forts.push(`Structure plus saine : ${me.islands} îlots de pions contre ${them.islands}`)
  if (me.islands > them.islands) faibles.push(`Structure plus éclatée : ${me.islands} îlots de pions contre ${them.islands}`)

  if (me.bishops === 2 && them.bishops < 2) forts.push('Paire de fous')
  if (them.bishops === 2 && me.bishops < 2) faibles.push('Paire de fous pour l’adversaire')

  if (them.undeveloped - me.undeveloped >= 2) forts.push('Avance de développement')
  if (me.undeveloped - them.undeveloped >= 2) faibles.push('Retard de développement')

  if (me.center - them.center >= 2) forts.push('Meilleur contrôle du centre')
  if (them.center - me.center >= 2) faibles.push('Centre contrôlé par l’adversaire')

  if (middlegame) {
    if (me.castled && !them.castled) forts.push('Ton roi est à l’abri, pas celui de l’adversaire')
    if (them.castled && !me.castled) faibles.push('Roque à faire : ton roi reste exposé')
  }
  if (me.stuck) faibles.push('Ton roi a perdu le droit de roquer')
  if (them.stuck) forts.push('Le roi adverse ne peut plus roquer')
  if (me.exposed) faibles.push('Bouclier de pions affaibli devant ton roi')
  if (them.exposed) forts.push('Bouclier de pions adverse affaibli')

  return { forts, faibles }
}
