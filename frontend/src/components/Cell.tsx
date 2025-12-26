import React from 'react';
import { CELL_HIDDEN, CELL_REVEALED_SAFE, CELL_REVEALED_MINE, CELL_PENDING } from '../utils/constants';

interface CellProps {
  index: number;
  state: number;
  onClick: () => void;
  disabled: boolean;
  isPendingCell: boolean;
}

export const Cell: React.FC<CellProps> = ({ index, state, onClick, disabled, isPendingCell }) => {
  const isHidden = state === CELL_HIDDEN;
  const isSafe = state === CELL_REVEALED_SAFE;
  const isMine = state === CELL_REVEALED_MINE;
  const isPending = state === CELL_PENDING;

  const getContent = () => {
    if (isHidden) return '?';
    if (isPending) return '';
    if (isSafe) return '';
    if (isMine) return '';
    return '';
  };

  const getClassName = () => {
    const base = `
      w-14 h-14 md:w-16 md:h-16
      rounded-lg font-bold text-2xl
      flex items-center justify-center
      transition-all duration-200
      border-2
    `;

    if (isPending) {
      return `${base}
        bg-gradient-to-br from-yellow-600 to-amber-700
        border-yellow-400
        cursor-wait
        animate-pulse-slow
      `;
    }

    if (isHidden) {
      return `${base}
        bg-gradient-to-br from-indigo-600 to-purple-700
        border-indigo-400
        hover:from-indigo-500 hover:to-purple-600
        hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30
        cursor-pointer
        ${isPendingCell ? 'animate-pulse-slow opacity-50' : ''}
      `;
    }

    if (isSafe) {
      return `${base}
        bg-gradient-to-br from-emerald-600 to-green-700
        border-emerald-400
        cursor-default
      `;
    }

    if (isMine) {
      return `${base}
        bg-gradient-to-br from-red-600 to-rose-700
        border-red-400
        cursor-default
        animate-explode
      `;
    }

    return base;
  };

  return (
    <button
      className={getClassName()}
      onClick={onClick}
      disabled={disabled || !isHidden || isPending}
      title={`Cell ${index}${isPending ? ' (Decrypting...)' : ''}`}
    >
      {getContent()}
    </button>
  );
};
