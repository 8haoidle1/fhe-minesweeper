import React, { useEffect, useState } from 'react';
import { GameState, TOTAL_CELLS, MINE_COUNT } from '../utils/constants';

interface GameStatsProps {
  gameInfo: {
    gameId: bigint | null;
    startTime: bigint;
    endTime: bigint;
    revealedCount: number;
    safeRevealed: number;
    state: GameState;
  } | null;
}

export const GameStats: React.FC<GameStatsProps> = ({ gameInfo }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!gameInfo || gameInfo.state !== GameState.ACTIVE) return;

    const startTime = Number(gameInfo.startTime);
    const interval = setInterval(() => {
      setElapsedTime(Math.floor(Date.now() / 1000) - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameInfo]);

  if (!gameInfo) return null;

  const safeCells = TOTAL_CELLS - MINE_COUNT;
  const progress = Math.round((gameInfo.safeRevealed / safeCells) * 100);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = gameInfo.state === GameState.ACTIVE
    ? elapsedTime
    : Number(gameInfo.endTime - gameInfo.startTime);

  return (
    <div className="glass rounded-xl p-4 mb-4">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Time:</span>
            <span className="font-mono text-lg text-white">{formatTime(displayTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Progress:</span>
            <span className="font-mono text-lg text-emerald-400">{progress}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Safe cells found:</span>
          <span className="font-mono text-lg text-white">
            {gameInfo.safeRevealed}/{safeCells}
          </span>
        </div>
      </div>
      <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
