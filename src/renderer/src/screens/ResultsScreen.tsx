import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import { useGameStore } from '../stores/gameStore'

export default function ResultsScreen() {
  const { gameState, players, myPlayerId, mode, disconnect, returnToLobby } = useGameStore()
  const isHost = mode === 'host'

  const winnerId = gameState?.winnerId
  const winner = players.find(p => p.id === winnerId)
  const isWinner = winnerId === myPlayerId

  return (
    <div className="min-h-screen bg-uno-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Celebration background */}
      {isWinner && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ['#ED1C24', '#0055A4', '#009A44', '#FFD600'][i % 4],
                left: `${Math.random() * 100}%`,
              }}
              initial={{ top: '-5%', opacity: 1 }}
              animate={{
                top: '105%',
                opacity: 0,
                rotate: Math.random() * 720,
                x: (Math.random() - 0.5) * 200,
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative z-10 text-center"
      >
        {/* Trophy/emoji */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-8xl mb-6"
        >
          {isWinner ? '🏆' : '🎮'}
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl font-bold font-game text-white mb-4"
        >
          {isWinner ? 'You Won!' : `${winner?.name ?? 'Someone'} Wins!`}
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-gray-400 text-lg font-game mb-8"
        >
          {isWinner ? 'Congratulations! 🎉' : 'Better luck next time! 💪'}
        </motion.p>

        {/* Player standings */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="bg-uno-dark/60 border border-white/10 rounded-2xl p-4 mb-8 min-w-[300px]"
        >
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Final Standings</h3>
          {[...players]
            .sort((a, b) => a.cardCount - b.cardCount)
            .map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg mb-1 ${
                  player.id === winnerId ? 'bg-uno-accent/10' : ''
                }`}
              >
                <span className="text-lg font-bold text-gray-500 w-6">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="flex-1 text-left text-white font-game">
                  {player.name}
                  {player.id === myPlayerId && <span className="text-gray-500 text-xs ml-1">(you)</span>}
                </span>
                <span className="text-gray-400 text-sm font-game">
                  {player.cardCount} cards left
                </span>
              </div>
            ))
          }
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex gap-4 justify-center"
        >
          {isHost && (
            <Button size="lg" onClick={returnToLobby}>
              🔄 Play Again
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={disconnect}>
            🚪 Exit
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
