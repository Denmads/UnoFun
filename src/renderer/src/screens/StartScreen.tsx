import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import { useGameStore } from '../stores/gameStore'

export default function StartScreen() {
  const { setMode, setScreen } = useGameStore()

  return (
    <div className="min-h-screen bg-uno-black flex flex-col items-center justify-center p-8">
      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-uno-red/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-uno-blue/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-uno-accent/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-16"
      >
        <h1 className="text-8xl font-bold font-game mb-2">
          <span className="text-white">Uno</span>
          <span className="text-uno-red">Fun</span>
        </h1>
        <p className="text-gray-400 text-lg font-game">Multiplayer UNO with a twist</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 flex flex-col gap-4 w-72"
      >
        <Button
          size="lg"
          onClick={() => {
            setMode('host')
            setScreen('name')
          }}
          className="w-full"
        >
          🎮 Host Game
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            setMode('join')
            setScreen('name')
          }}
          className="w-full"
        >
          🔗 Join Game
        </Button>
      </motion.div>

      {/* Version */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 text-xs text-gray-600 font-game"
      >
        v1.0.0
      </motion.p>
    </div>
  )
}
