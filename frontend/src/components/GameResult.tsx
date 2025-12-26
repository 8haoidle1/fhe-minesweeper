import React from 'react';
import { GameState } from '../utils/constants';

interface GameResultProps {
  state: GameState;
  clearTime?: number;
  onPlayAgain: () => void;
}

export const GameResult: React.FC<GameResultProps> = ({ state, clearTime, onPlayAgain }) => {
  if (state !== GameState.WON && state !== GameState.LOST) return null;

  const isWon = state === GameState.WON;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`glass rounded-2xl p-8 text-center max-w-md mx-4 ${
        isWon ? 'border-emerald-500/50' : 'border-red-500/50'
      } border-2`}>
        <div className="text-6xl mb-4">
          {isWon ? '' : ''}
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${
          isWon ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {isWon ? 'Victory!' : 'Game Over!'}
        </h2>
        <p className="text-gray-400 mb-4">
          {isWon
            ? `You cleared all safe cells in ${formatTime(clearTime || 0)}!`
            : 'You hit a mine! Better luck next time.'}
        </p>
        {isWon && (
          <p className="text-sm text-indigo-400 mb-6">
            Your time has been recorded on the leaderboard!
          </p>
        )}
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600
                     hover:from-indigo-500 hover:to-purple-500
                     rounded-lg font-semibold transition-all duration-200
                     hover:scale-105"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};
