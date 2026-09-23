import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../stores/gameStore'
import CardFan from '../components/cards/CardFan'
import CardStack from '../components/cards/CardStack'
import PlayerSlot from '../components/game/PlayerSlot'
import DirectionRing from '../components/game/DirectionRing'
import UnoButton from '../components/game/UnoButton'
import ColorPicker from '../components/game/ColorPicker'
import ChallengeDialog from '../components/game/ChallengeDialog'
import SwapHandDialog from '../components/game/SwapHandDialog'
import CircleHandsDialog from '../components/game/CircleHandsDialog'
import TimerBar from '../components/game/TimerBar'
import Notification from '../components/game/Notification'
import type { Card as CardType, CardColor } from '../../../shared/types'
import { canPlayCard, canStackWith } from '../../../shared/rules'
import { sortCardsByColor } from '../../../shared/sortCards'

function getPlayerPosition(index: number, total: number) {
  const startAngle = -Math.PI * 0.85
  const endAngle = -Math.PI * 0.15
  const angle = total === 1
    ? (startAngle + endAngle) / 2
    : startAngle + (endAngle - startAngle) * (index / (total - 1))

  const radiusX = 42
  const radiusY = 35
  return {
    left: `${50 + radiusX * Math.cos(angle)}%`,
    top: `${50 + radiusY * Math.sin(angle)}%`,
  }
}

type ActiveDialog = 'color' | 'challenge' | 'swap' | 'circle' | null

export default function GameScreen() {
  const { gameState, sendAction, myPlayerId, settings, mode, returnToLobby, notification, setNotification } = useGameStore()
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [pendingCards, setPendingCards] = useState<string[]>([])
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const lastChallengeCardId = useRef<string | null>(null)

  const {
    players, myHand, currentPlayerIndex, direction,
    discardTop, drawPileCount, currentColor, plusChain, turnStartTime, hasDrawnCardThisTurn
  } = gameState || {
    players: [],
    myHand: [],
    currentPlayerIndex: 0,
    direction: 1,
    discardTop: null,
    drawPileCount: 0,
    currentColor: null,
    plusChain: { totalAmount: 0, playerId: null, canReflect: false },
    turnStartTime: null,
    hasDrawnCardThisTurn: false
  }

  const currentPlayer = players[currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === myPlayerId

  // Arrange other players around the table, rotated so the next-in-turn
  // player after me is leftmost — ensuring smooth visual turn flow on all clients.
  const otherPlayers = useMemo(() => {
    const myIdx = players.findIndex(p => p.id === myPlayerId)
    if (myIdx === -1) return players
    const n = players.length
    const rotated: typeof players = []
    for (let j = 1; j < n; j++) {
      rotated.push(players[(myIdx + j) % n])
    }
    return rotated
  }, [players, myPlayerId])

  // Playable card IDs (individually playable on current discard)
  const playableIds = useMemo(() => {
    if (!isMyTurn || !discardTop) return new Set<string>()
    const ids = new Set<string>()
    for (const card of myHand) {
      if (canPlayCard(card, discardTop, currentColor, plusChain, settings)) {
        ids.add(card.id)
      }
    }
    return ids
  }, [isMyTurn, myHand, discardTop, currentColor, plusChain, settings])

  // Clickable card IDs — includes playable + stackable with current selection
  const clickableIds = useMemo(() => {
    if (!isMyTurn) return new Set<string>()
    const ids = new Set(playableIds)
    if (selectedCardIds.size > 0 && settings.allowStackSameNumber) {
      const selectedCards = myHand.filter(c => selectedCardIds.has(c.id))
      if (selectedCards.length > 0) {
        const ref = selectedCards[0]
        for (const card of myHand) {
          if (ids.has(card.id)) continue
          if (canStackWith(ref, card)) {
            ids.add(card.id)
          }
        }
      }
    }
    return ids
  }, [isMyTurn, playableIds, selectedCardIds, myHand, settings.allowStackSameNumber])

  // Sort cards by color for better UX
  const sortedHand = useMemo(() => {
    return sortCardsByColor(myHand)
  }, [myHand])

  // Auto-show challenge dialog when a wild plus card is played on me (I'm next to draw).
  // Must not fire for the player who played the card themselves (activeDialog !== null also
  // guards against clobbering their own still-open color picker during that brief window).
  useEffect(() => {
    if (!isMyTurn || !discardTop || activeDialog !== null) return
    if (
      discardTop.type === 'plus' &&
      discardTop.color === 'wild' &&
      plusChain?.lastWildPlayerId != null &&
      plusChain.lastWildPlayerId !== myPlayerId
    ) {
      // Only show dialog if this is a NEW card (not the same card from a previous render)
      if (discardTop.id !== lastChallengeCardId.current) {
        if (settings.allowChallengeWild) {
          lastChallengeCardId.current = discardTop.id
          setActiveDialog('challenge')
        }
      }
    }
  }, [isMyTurn, discardTop, plusChain, activeDialog, settings.allowChallengeWild, myPlayerId])

  const handleCardClick = useCallback((card: CardType) => {
    if (!isMyTurn) return

    setSelectedCardIds(prev => {
      const next = new Set(prev)
      if (next.has(card.id)) {
        next.delete(card.id)
      } else {
        // If stacking, check compatibility
        if (next.size > 0 && settings.allowStackSameNumber) {
          const selectedCards = myHand.filter(c => next.has(c.id))
          const allCompatible = selectedCards.every(c => canStackWith(c, card))
          if (allCompatible) {
            next.add(card.id)
          } else {
            next.clear()
            next.add(card.id)
          }
        } else {
          next.clear()
          next.add(card.id)
        }
      }
      return next
    })
  }, [isMyTurn, myHand, settings.allowStackSameNumber])

  const handlePlaySelected = useCallback(() => {
    if (!isMyTurn || selectedCardIds.size === 0) return

    const cardIds = Array.from(selectedCardIds)
    const cards = cardIds.map(id => myHand.find(c => c.id === id)).filter((c): c is CardType => c !== undefined)

    // Check if any card needs color pick (wild cards)
    const needsColor = cards.some(c => c.color === 'wild' && c.type !== 'reflect')
    const needsSwap = cards.some(c => c.type === 'swap-hand')
    const needsCircle = cards.some(c => c.type === 'circle-hands')

    if (needsColor || needsSwap || needsCircle) {
      setPendingCards(cardIds)
      if (needsSwap) {
        setActiveDialog('swap')
      } else if (needsCircle) {
        setActiveDialog('circle')
      } else {
        sendAction({ type: 'play-cards', cardIds })
        setSelectedCardIds(new Set())
        setActiveDialog('color')
      }
      return
    }

    sendAction({ type: 'play-cards', cardIds })
    setSelectedCardIds(new Set())
  }, [isMyTurn, selectedCardIds, myHand, sendAction])

  const handleDraw = useCallback(() => {
    if (!isMyTurn) return
    sendAction({ type: 'draw-card' })
    setSelectedCardIds(new Set())
  }, [isMyTurn, sendAction])

  const handleColorPick = useCallback((color: CardColor) => {
    sendAction({ type: 'pick-color', color })
    setActiveDialog(null)
    setPendingCards([])
  }, [sendAction])

  const handleSwapHand = useCallback((targetId: string) => {
    sendAction({ type: 'play-cards', cardIds: pendingCards })
    sendAction({ type: 'swap-hand', targetPlayerId: targetId })
    setActiveDialog(null)
    setSelectedCardIds(new Set())
    setPendingCards([])
  }, [sendAction, pendingCards])

  const handleCircleHands = useCallback((dir: 'left' | 'right') => {
    sendAction({ type: 'play-cards', cardIds: pendingCards })
    sendAction({ type: 'circle-hands', direction: dir })
    setActiveDialog(null)
    setSelectedCardIds(new Set())
    setPendingCards([])
  }, [sendAction, pendingCards])

  const handleCallUno = useCallback(() => {
    const store = useGameStore.getState()
    sendAction({ type: 'call-uno', message: store.unoMessage })
    // Show local feedback
    setNotification(`You said: ${store.unoMessage}`)
  }, [sendAction, setNotification])

  const handleForgotUno = useCallback((targetId: string) => {
    sendAction({ type: 'forgot-uno', targetPlayerId: targetId })
  }, [sendAction])

  if (!gameState) return null

  return (
    <div className="h-screen bg-uno-black flex flex-col overflow-hidden relative">
      {/* Timer bar */}
      {settings.timeLimitEnabled && turnStartTime && (
        <TimerBar
          startTime={turnStartTime}
          duration={settings.timeLimitSeconds}
          isMyTurn={isMyTurn}
        />
      )}

      {/* End game button (host only) — floating top-right */}
      {mode === 'host' && (
        <div className="absolute top-3 right-3 z-[200]">
          {showEndConfirm ? (
            <div className="bg-uno-dark border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
              <p className="text-xs text-gray-300 font-game">End game for everyone?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { returnToLobby(); setShowEndConfirm(false) }}
                  className="bg-uno-red hover:bg-red-700 text-white text-xs font-game font-bold
                    px-3 py-1.5 rounded-lg transition-colors"
                >
                  End Game
                </button>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="bg-uno-surface hover:bg-uno-surface/80 text-gray-300 text-xs font-game
                    px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="bg-uno-dark/80 hover:bg-uno-dark border border-white/10 text-gray-400
                hover:text-white text-xs font-game px-3 py-1.5 rounded-lg transition-colors"
            >
              ✕ End Game
            </button>
          )}
        </div>
      )}

      {/* Notification — UNO and other messages */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[250]">
        <AnimatePresence>
          {notification && (
            <Notification
              message={notification.message}
              duration={3000}
              onClose={() => setNotification(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Game area */}
      <div className="flex-1 relative min-h-0">
        {/* Other players around the table */}
        {otherPlayers.map((player, i) => {
          const pos = getPlayerPosition(i, otherPlayers.length)
          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pos.left, top: pos.top }}
            >
              <PlayerSlot
                player={player}
                isCurrentTurn={players[currentPlayerIndex]?.id === player.id}
                onForgotUno={() => handleForgotUno(player.id)}
              />
            </div>
          )
        })}

        {/* Center area: direction ring + discard + draw */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Direction ring — behind stacks */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
            <DirectionRing direction={direction} />
          </div>

          <div className="relative z-10 flex items-center gap-8">
          <CardStack
            topCard={null}
            count={drawPileCount}
            label={isMyTurn && hasDrawnCardThisTurn ? 'Pass' : 'Draw'}
            onClick={isMyTurn ? handleDraw : undefined}
            highlight={isMyTurn && playableIds.size === 0}
          />

          <div className="flex flex-col items-center gap-2">
            <CardStack
              topCard={discardTop}
              label="Discard"
              displayColor={discardTop?.color === 'wild' ? currentColor : undefined}
              onClick={undefined}
            />
          </div>

          {/* Plus chain indicator */}
          <AnimatePresence>
            {plusChain && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-red-600/20 border border-red-500/40 rounded-xl px-4 py-2 text-center"
              >
                <p className="text-2xl font-bold text-red-400 font-game">+{plusChain.totalAmount}</p>
                <p className="text-xs text-red-300">chain active</p>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        {/* Floating play button — centered above the hand area */}
        <AnimatePresence>
          {selectedCardIds.size > 0 && isMyTurn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-8 inset-x-0 flex justify-center z-[200]"
            >
              <button
                onClick={handlePlaySelected}
                className="bg-uno-accent hover:bg-red-600 text-white font-game font-bold
                  px-8 py-3 rounded-2xl shadow-glow transition-colors text-lg
                  border-2 border-white/20 hover:border-white/40"
              >
                Play {selectedCardIds.size > 1 ? `${selectedCardIds.size} cards` : 'card'} ▶
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

      {/* My hand area */}
      <div className={`h-48 bg-gradient-to-t from-uno-dark to-transparent flex flex-col items-center justify-end pb-4 relative transition-all duration-300
        ${isMyTurn ? 'border-t-2 border-uno-accent shadow-[0_-6px_24px_rgba(233,69,96,0.35)]' : ''}
      `}>
        {/* Turn info + card count */}
        <div className={`absolute top-2 left-4 text-xs font-game ${isMyTurn ? 'text-uno-accent font-semibold' : 'text-gray-400'}`}>
          {isMyTurn
            ? <motion.span
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                🎯 YOUR TURN · {myHand.length} {myHand.length === 1 ? 'card' : 'cards'}
              </motion.span>
            : <>⏳ {currentPlayer?.name ?? '...'}&apos;s turn · {myHand.length} {myHand.length === 1 ? 'card' : 'cards'}</>
          }
        </div>

        {/* Player name */}
        <div className="absolute top-2 right-4 text-xs text-gray-400 font-game">
          {players.find(p => p.id === myPlayerId)?.name ?? 'You'}
        </div>

        <CardFan
          cards={sortedHand}
          selectedIds={selectedCardIds}
          onCardClick={handleCardClick}
          playableIds={isMyTurn ? clickableIds : new Set()}
        />

        {/* UNO button — show when:
             (a) already at 1 card and haven't called UNO yet (any time, not just own turn)
             (b) on own turn with 2 cards (any play will bring to 1)
             (c) on own turn and selection would bring to 1 */}
        {(() => {
          const myPlayer = players.find(p => p.id === myPlayerId)
          const alreadyCalledUno = myPlayer?.calledUno ?? false
          if (alreadyCalledUno) return null
          const atOneCard = myHand.length === 1
          const willReachOne = isMyTurn && (
            myHand.length === 2 || myHand.length - selectedCardIds.size === 1
          )
          return (atOneCard || willReachOne) ? (
            <div className="absolute top-4 right-24 z-[300]">
              <UnoButton onClick={handleCallUno} />
            </div>
          ) : null
        })()}
      </div>

      {/* Dialogs */}
      <ColorPicker
        open={activeDialog === 'color'}
        onPick={handleColorPick}
      />
      <ChallengeDialog
        open={activeDialog === 'challenge'}
        onClose={() => setActiveDialog(null)}
      />
      <SwapHandDialog
        open={activeDialog === 'swap'}
        players={otherPlayers}
        onSelect={handleSwapHand}
        onClose={() => setActiveDialog(null)}
      />
      <CircleHandsDialog
        open={activeDialog === 'circle'}
        onSelect={handleCircleHands}
        onClose={() => setActiveDialog(null)}
      />
    </div>
  )
}
