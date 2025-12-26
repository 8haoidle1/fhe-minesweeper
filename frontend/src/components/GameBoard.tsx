import React from 'react';
import { Cell } from './Cell';
import { GRID_SIZE } from '../utils/constants';

interface GameBoardProps {
  cellStates: number[];
  onCellClick: (index: number) => void;
  disabled: boolean;
  isPending: boolean;
  pendingCell: number | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  cellStates,
  onCellClick,
  disabled,
  isPending,
  pendingCell,
}) => {
  return (
    <div className="glass rounded-2xl p-6 glow">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        }}
      >
        {cellStates.map((state, index) => (
          <Cell
            key={index}
            index={index}
            state={state}
            onClick={() => onCellClick(index)}
            disabled={disabled || isPending}
            isPendingCell={isPending && pendingCell !== index}
          />
        ))}
      </div>
    </div>
  );
};
