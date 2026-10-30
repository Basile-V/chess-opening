import { Chess } from 'chess.js'
import repertoire from './data/repertoire.json' with { type: 'json' }
import sheetData from './data/sheets.json' with { type: 'json' }

export type Color = 'white' | 'black'
export type Line = { moves: string; sheet: string; notes?: Partial<Record<string, string>> }
export type Sheet = {
  name: string
  eco: string
  idea: string
  plan: string[]
  tactics: string[]
  traps: string[]
  strengths: string[]
  weaknesses: string[]
  family?: string
}
export type BookMove = { san: string; note?: string }
export type Entry = { moves: BookMove[]; sheets: Set<string> }
export type Index = Map<string, Entry>

export const sheets: Record<string, Sheet> = sheetData
export const lines: Record<Color, Line[]> = repertoire

const overview: Record<Color, string> = { white: 'systeme-blancs', black: 'systeme-noirs' }

// Le numéro de coup et les compteurs sont ignorés : c'est ce qui rend les transpositions gratuites.
export const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

export function buildIndex(lines: Line[]): Index {
  const index: Index = new Map()
  const entryAt = (fen: string) => {
    const key = positionKey(fen)
    const entry = index.get(key) ?? { moves: [], sheets: new Set<string>() }
    index.set(key, entry)
    return entry
  }

  for (const line of lines) {
    const chess = new Chess()
    line.moves.split(' ').forEach((token, i) => {
      const entry = entryAt(chess.fen())
      entry.sheets.add(line.sheet)
      const { san } = chess.move(token)
      const note = line.notes?.[i + 1]
      const known = entry.moves.find((m) => m.san === san)
      if (!known) entry.moves.push({ san, note })
      else known.note ??= note
    })
    entryAt(chess.fen()).sheets.add(line.sheet)
  }
  return index
}

const indexes: Record<Color, Index> = { white: buildIndex(lines.white), black: buildIndex(lines.black) }

export type View = {
  fen: string
  myTurn: boolean
  entry?: Entry
  sheet: Sheet
  lastBookPly: number
}

// Une fiche seulement si toutes les lignes s'accordent, sur la fiche ou sur sa famille : avant, c'est trop tôt pour conclure.
function sheetOf({ sheets: ids }: Entry) {
  if (ids.size === 1) return [...ids][0]
  const families = new Set([...ids].map((id) => sheets[id]?.family))
  return families.size === 1 ? [...families][0] : undefined
}

export function explore(moves: string[], color: Color, index = indexes[color]): View {
  const chess = new Chess()
  let lastBookPly = 0
  let sheetId = overview[color]

  const visit = (ply: number) => {
    const entry = index.get(positionKey(chess.fen()))
    if (!entry) return
    lastBookPly = ply
    sheetId = sheetOf(entry) ?? sheetId
  }

  visit(0)
  moves.forEach((san, i) => {
    chess.move(san)
    visit(i + 1)
  })

  return {
    fen: chess.fen(),
    myTurn: (chess.turn() === 'w') === (color === 'white'),
    entry: index.get(positionKey(chess.fen())),
    sheet: sheets[sheetId] as Sheet,
    lastBookPly,
  }
}

const figurines: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' }

export const figurine = (san: string) => san.replace(/[KQRBN]/g, (letter) => figurines[letter] as string)
