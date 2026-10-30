import { useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { analyse } from './analysis.ts'
import { explore, figurine, type Color, type Sheet } from './repertoire.ts'

const LIGHT = '#ebecd0'
const DARK = '#739552'
const ARROW = '#e0a100'
const selectedStyle: CSSProperties = { backgroundColor: 'rgba(224, 161, 0, 0.55)' }
const targetStyle: CSSProperties = {
  background: 'radial-gradient(circle, rgba(0, 0, 0, 0.28) 24%, transparent 26%)',
}

function moveNumber(ply: number) {
  const number = Math.floor(ply / 2) + 1
  return ply % 2 === 0 ? `${number}.` : `${number}...`
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function SheetCard({ sheet, forts, faibles }: { sheet: Sheet; forts: string[]; faibles: string[] }) {
  return (
    <article className="sheet">
      <header>
        <h2>{sheet.name}</h2>
        <span className="eco">{sheet.eco}</span>
      </header>
      <p>{sheet.idea}</p>
      <BulletList title="Plan après l’ouverture" items={sheet.plan} />
      <BulletList title="Tactiques à connaître" items={sheet.tactics} />
      <BulletList title="Pièges" items={sheet.traps} />
      <BulletList title="Points forts de cette position" items={forts} />
      <BulletList title="Points faibles de cette position" items={faibles} />
      <BulletList title="Points forts typiques" items={sheet.strengths} />
      <BulletList title="Points faibles typiques" items={sheet.weaknesses} />
    </article>
  )
}

export default function App() {
  const [color, setColor] = useState<Color>('white')
  const [moves, setMoves] = useState<string[]>([])
  const [selected, setSelected] = useState<Square | null>(null)

  const view = explore(moves, color)
  const chess = new Chess(view.fen)
  const { forts, faibles } = analyse(view.fen, color)
  const book = view.entry?.moves ?? []
  const recommended = view.myTurn ? book[0] : undefined
  const arrow = recommended && new Chess(view.fen).move(recommended.san)
  const targets = selected ? chess.moves({ square: selected, verbose: true }) : []

  const squareStyles: Record<string, CSSProperties> = {}
  for (const { to } of targets) squareStyles[to] = targetStyle
  if (selected) squareStyles[selected] = selectedStyle

  function changeMoves(next: string[]) {
    setMoves(next)
    setSelected(null)
  }

  function changeColor(next: Color) {
    setColor(next)
    changeMoves([])
  }

  function tryMove(from: string, to: string) {
    try {
      const { san } = new Chess(view.fen).move({ from, to, promotion: 'q' })
      changeMoves([...moves, san])
      return true
    } catch {
      return false
    }
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (selected && tryMove(selected, square)) return
    const canMove = chess.moves({ square: square as Square }).length > 0
    setSelected(canMove && square !== selected ? (square as Square) : null)
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    return targetSquare !== null && tryMove(sourceSquare, targetSquare)
  }

  return (
    <main className="app">
      <div className="board-column">
        <header className="toolbar">
          <div className="colors" role="group" aria-label="Ta couleur">
            <button type="button" aria-pressed={color === 'white'} onClick={() => changeColor('white')}>
              Blancs
            </button>
            <button type="button" aria-pressed={color === 'black'} onClick={() => changeColor('black')}>
              Noirs
            </button>
          </div>
          <div className="actions">
            <button type="button" disabled={moves.length === 0} onClick={() => changeMoves(moves.slice(0, -1))}>
              Retour
            </button>
            <button type="button" disabled={moves.length === 0} onClick={() => changeMoves([])}>
              Recommencer
            </button>
          </div>
        </header>

        <div className="board">
          <Chessboard
            options={{
              id: 'repertoire',
              position: view.fen,
              boardOrientation: color,
              allowDrawingArrows: false,
              arrows: arrow ? [{ startSquare: arrow.from, endSquare: arrow.to, color: ARROW }] : [],
              squareStyles,
              lightSquareStyle: { backgroundColor: LIGHT },
              darkSquareStyle: { backgroundColor: DARK },
              onSquareClick: handleSquareClick,
              onPieceDrop: handlePieceDrop,
            }}
          />
        </div>
      </div>

      <div className="info-column">
        <section className="action" aria-live="polite">
          {!view.entry && (
            <>
              <p className="badge">Hors répertoire</p>
              <p>Aucun coup conseillé ici : l’analyse de la position reste disponible.</p>
              <button type="button" onClick={() => changeMoves(moves.slice(0, view.lastBookPly))}>
                Revenir à la dernière position connue
              </button>
            </>
          )}

          {recommended && (
            <>
              <h2>Ton coup</h2>
              <button type="button" className="primary" onClick={() => changeMoves([...moves, recommended.san])}>
                {figurine(recommended.san)}
              </button>
              {recommended.note && <p>{recommended.note}</p>}
            </>
          )}

          {view.entry && !view.myTurn && book.length > 0 && (
            <>
              <h2>Quel coup a joué l’adversaire ?</h2>
              <div className="replies">
                {book.map(({ san }) => (
                  <button type="button" key={san} onClick={() => changeMoves([...moves, san])}>
                    {figurine(san)}
                  </button>
                ))}
              </div>
              <p className="hint">Autre coup ? Joue-le sur l’échiquier.</p>
            </>
          )}

          {view.entry && book.length === 0 && (
            <>
              <h2>Fin de la ligne</h2>
              <p>L’ouverture est terminée : applique le plan ci-dessous.</p>
            </>
          )}
        </section>

        {moves.length > 0 && (
          <ol className="history" aria-label="Coups joués">
            {moves.map((san, ply) => (
              <li key={ply}>
                {ply % 2 === 0 && <span className="number">{moveNumber(ply)}</span>}
                {figurine(san)}
              </li>
            ))}
          </ol>
        )}

        <SheetCard sheet={view.sheet} forts={forts} faibles={faibles} />
      </div>
    </main>
  )
}
