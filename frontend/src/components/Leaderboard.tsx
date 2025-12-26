import React from 'react';

interface LeaderboardEntry {
  player: string;
  clearTime: bigint;
  timestamp: bigint;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  const formatTime = (seconds: bigint) => {
    const secs = Number(seconds);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  if (entries.length === 0) {
    return (
      <div className="glass rounded-xl p-6 mt-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          Leaderboard
        </h3>
        <p className="text-gray-400 text-center py-4">No winners yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 mt-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Leaderboard
      </h3>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg ${
              index === 0
                ? 'bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30'
                : index === 1
                ? 'bg-gradient-to-r from-gray-400/20 to-slate-400/20 border border-gray-400/30'
                : index === 2
                ? 'bg-gradient-to-r from-amber-700/20 to-orange-700/20 border border-amber-600/30'
                : 'bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {index === 0 ? '' : index === 1 ? '' : index === 2 ? '' : `#${index + 1}`}
              </span>
              <span className="font-mono text-white">{formatAddress(entry.player)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-emerald-400 font-mono">{formatTime(entry.clearTime)}</span>
              <span className="text-gray-500 text-sm">{formatDate(entry.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
