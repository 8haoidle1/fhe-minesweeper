import React from 'react';

interface WalletButtonProps {
  address: string | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  onConnect: () => void;
  onSwitchNetwork: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  address,
  isConnecting,
  isCorrectNetwork,
  onConnect,
  onSwitchNetwork,
}) => {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!address) {
    return (
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600
                   hover:from-indigo-500 hover:to-purple-500
                   rounded-lg font-semibold transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={onSwitchNetwork}
        className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600
                   hover:from-orange-500 hover:to-red-500
                   rounded-lg font-semibold transition-all duration-200"
      >
        Switch to Zama Network
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
      <span className="font-mono text-sm">{formatAddress(address)}</span>
    </div>
  );
};
