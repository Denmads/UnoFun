import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from './stores/gameStore'
import StartScreen from './screens/StartScreen'
import NameScreen from './screens/NameScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import ResultsScreen from './screens/ResultsScreen'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error): void {
    console.error('ERROR BOUNDARY CAUGHT:', error)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-uno-black">
          <div className="text-center p-8 bg-uno-dark rounded-lg border border-white/10">
            <p className="text-red-500 text-2xl mb-4 font-game">🔴 Rendering Error</p>
            <p className="text-gray-300 font-mono text-sm mb-4">{this.state.error?.message}</p>
            <p className="text-gray-400 text-xs">Check browser console for details</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App(): JSX.Element {
  const screen = useGameStore((s) => s.screen)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-uno-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {screen === 'start' && <StartScreen />}
            {screen === 'name' && <NameScreen />}
            {screen === 'lobby' && <LobbyScreen />}
            {screen === 'game' && <GameScreen />}
            {screen === 'results' && <ResultsScreen />}
            {!['start', 'name', 'lobby', 'game', 'results'].includes(screen) && (
              <div className="w-full h-screen flex items-center justify-center bg-uno-black">
                <div className="text-center">
                  <p className="text-white text-2xl mb-4">Unknown screen: {screen}</p>
                  <p className="text-gray-400">This is a debugging message</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  )
}

export default App
