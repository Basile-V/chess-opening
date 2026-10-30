import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyse } from './analysis.ts'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const ISOLATED_D = 'r1bq1rk1/pp3ppp/2n2n2/2bp4/8/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 10'
const DOUBLED_C = 'r1bqkbnr/1pp2ppp/p1p5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5'
const PASSED_A = '4k3/8/8/8/8/P7/8/4K3 w - - 0 40'
const UNCASTLED_BLACK = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 0 9'

const has = (items: string[], text: string) => items.some((item) => item.includes(text))

test('la position initiale ne signale rien', () => {
  assert.deepEqual(analyse(START, 'white'), { forts: [], faibles: [] })
})

test('un pion isolé est faible pour son camp et fort pour l’adversaire', () => {
  assert.ok(has(analyse(ISOLATED_D, 'black').faibles, 'isolé en d'))
  assert.ok(has(analyse(ISOLATED_D, 'white').forts, 'isolé en d'))
})

test('des pions doublés sont détectés', () => {
  assert.ok(has(analyse(DOUBLED_C, 'black').faibles, 'doublés en c'))
})

test('un pion passé et l’avance matérielle sont détectés', () => {
  const { forts } = analyse(PASSED_A, 'white')
  assert.ok(has(forts, 'passé en a'))
  assert.ok(has(forts, 'Avance matérielle (+1)'))
})

test('le roque est comparé en milieu de partie seulement', () => {
  assert.ok(has(analyse(UNCASTLED_BLACK, 'black').faibles, 'Roque à faire'))
  assert.ok(has(analyse(UNCASTLED_BLACK, 'white').forts, 'à l’abri'))
  const early = UNCASTLED_BLACK.replace('0 9', '0 5')
  assert.ok(!has(analyse(early, 'black').faibles, 'Roque à faire'))
})

test('chaque constat a son miroir chez l’adversaire', () => {
  for (const fen of [ISOLATED_D, DOUBLED_C, PASSED_A, UNCASTLED_BLACK]) {
    assert.equal(analyse(fen, 'white').forts.length, analyse(fen, 'black').faibles.length)
    assert.equal(analyse(fen, 'white').faibles.length, analyse(fen, 'black').forts.length)
  }
})
