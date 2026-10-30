import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import { buildIndex, explore, figurine, lines, positionKey, sheets, type Color, type Line } from './repertoire.ts'

const colors: Color[] = ['white', 'black']
const plies = (line: Line) => line.moves.split(' ').length

test('chaque ligne finit sur un coup du répertoire', () => {
  for (const color of colors) {
    const expected = color === 'white' ? 1 : 0
    for (const line of lines[color]) assert.equal(plies(line) % 2, expected, line.moves)
  }
})

test('chaque ligne pointe vers une fiche, et chaque note vers un coup', () => {
  for (const line of [...lines.white, ...lines.black]) {
    assert.ok(sheets[line.sheet], `fiche inconnue : ${line.sheet}`)
    for (const ply of Object.keys(line.notes ?? {})) assert.ok(Number(ply) <= plies(line), `${line.moves} : note ${ply}`)
  }
})

test('toutes les fiches servent, et chaque famille existe', () => {
  const used = new Set([...lines.white, ...lines.black].map((line) => line.sheet))
  const families = new Set(Object.values(sheets).flatMap((sheet) => sheet.family ?? []))
  for (const family of families) assert.ok(sheets[family], `famille inconnue : ${family}`)
  for (const id of Object.keys(sheets)) {
    if (!id.startsWith('systeme-')) assert.ok(used.has(id) || families.has(id), `fiche inutilisée : ${id}`)
  }
})

test('une seule recommandation par position à mon tour', () => {
  for (const color of colors) {
    for (const [key, entry] of buildIndex(lines[color])) {
      const myTurn = (key.split(' ')[1] === 'w') === (color === 'white')
      if (myTurn) assert.ok(entry.moves.length <= 1, `${color} ${key} : ${entry.moves.map((m) => m.san)}`)
    }
  }
})

test('le répertoire démarre sur d4 puis c4 avec les Blancs et c5 avec les Noirs', () => {
  assert.equal(explore([], 'white').entry?.moves[0]?.san, 'd4')
  for (const reply of ['d5', 'Nf6', 'f5', 'e6', 'g6']) {
    assert.equal(explore(['d4', reply], 'white').entry?.moves[0]?.san, 'c4', reply)
  }
  for (const first of ['e4', 'd4', 'c4', 'Nf3']) {
    assert.equal(explore([first], 'black').entry?.moves[0]?.san, 'c5', first)
  }
})

test('♞f3 ramène au Gambit Dame par transposition', () => {
  const direct = explore('d4 d5 c4 e6 Nc3 c6 Nf3 Nf6 e3'.split(' '), 'white')
  const viaNf3 = explore('d4 Nf6 c4 e6 Nf3 d5 Nc3 c6 e3'.split(' '), 'white')
  assert.equal(viaNf3.entry, direct.entry)
  assert.equal(viaNf3.sheet, sheets['semi-slave'])
})

test('une transposition rejoint le Dragon Accéléré', () => {
  const direct = explore('e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6'.split(' '), 'black')
  const viaD4 = explore('d4 c5 Nf3 cxd4 Nxd4 Nc6 e4 g6'.split(' '), 'black')
  assert.equal(positionKey(viaD4.fen), positionKey(direct.fen))
  assert.equal(viaD4.entry, direct.entry)
  assert.equal(viaD4.sheet.name, direct.sheet.name)
})

test('la dame sortie en d4 est reconnue par les deux ordres de coups', () => {
  const viaNf3 = explore('Nf3 c5 d4 cxd4 Qxd4'.split(' '), 'black')
  const viaD4 = explore('d4 c5 Nf3 cxd4 Qxd4'.split(' '), 'black')
  assert.equal(viaNf3.entry?.moves[0]?.san, 'Nc6')
  assert.equal(viaD4.entry, viaNf3.entry)
  assert.equal(viaD4.sheet, sheets['anti-d4'])
})

test('hors répertoire, la dernière position connue et sa fiche restent disponibles', () => {
  const known = 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5'.split(' ')
  const out = explore([...known, 'a5', 'h3'], 'white')
  assert.equal(out.entry, undefined)
  assert.equal(out.lastBookPly, known.length)
  assert.equal(out.sheet, sheets.qgd)
})

test('la famille s’affiche quand plusieurs fiches restent possibles', () => {
  assert.equal(explore('d4 d5 c4'.split(' '), 'white').sheet, sheets['gambit-dame'])
  assert.equal(explore('d4 Nf6 c4 g6'.split(' '), 'white').sheet, sheets.indiennes)
  assert.equal(explore(['e4'], 'black').sheet, sheets.sicilienne)
})

test('le système reste affiché tant que le coup adverse ne tranche rien', () => {
  assert.equal(explore(['d4'], 'white').sheet, sheets['systeme-blancs'])
})

test('la position de départ affiche la fiche du système', () => {
  assert.equal(explore([], 'white').sheet, sheets['systeme-blancs'])
  assert.equal(explore([], 'black').sheet, sheets['systeme-noirs'])
})

test('une ligne illégale est refusée', () => {
  assert.throws(() => buildIndex([{ moves: 'e4 e4', sheet: 'x' }]))
})

test('les coups s’affichent en figurines', () => {
  assert.equal(figurine('Nf3'), '♞f3')
  assert.equal(figurine('Qxd4+'), '♛xd4+')
  assert.equal(figurine('O-O'), 'O-O')
  assert.equal(figurine('exd8=Q'), 'exd8=♛')
})

test('les lignes ne contiennent que du SAN normalisé par chess.js', () => {
  for (const line of [...lines.white, ...lines.black]) {
    const chess = new Chess()
    for (const san of line.moves.split(' ')) assert.equal(chess.move(san).san, san, line.moves)
  }
})
