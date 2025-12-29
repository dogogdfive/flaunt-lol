// components/ui/BulkActions.tsx
// Reusable bulk actions toolbar component

'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
  confirmMessage?: string;
}

interface BulkActionsProps {
  selectedCount: number;
  actions: BulkAction[];
  onAction: (actionId: string) => Promise<void>;
  onClear: () => void;
}

export default function BulkActions({ 
  selectedCount, 
  actions, 
  onAction, 
  onClear 
}: BulkActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage && !confirm(action.confirmMessage)) {
      return;
    }

    setLoading(action.id);
    try {
      await onAction(action.id);
    } finally {
      setLoading(null);
    }
  };

  const getButtonClasses = (variant: string = 'default') => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#1f2937] border border-gray-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{selectedCount}</span>
          <span className="text-gray-400">selected</span>
        </div>

        <div className="w-px h-6 bg-gray-700" />

        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={loading !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${getButtonClasses(action.variant)}`}
            >
              {loading === action.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700" />

        <button
          onClick={onClear}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
