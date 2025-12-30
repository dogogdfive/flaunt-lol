// lib/toast.ts
// Centralized toast notification system

import toast from 'react-hot-toast';

// Success notifications
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
    style: {
      background: '#10B981',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  });
};

// Error notifications
export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
    style: {
      background: '#EF4444',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  });
};

// Warning notifications
export const showWarning = (message: string) => {
  toast(message, {
    duration: 4000,
    icon: '⚠️',
    style: {
      background: '#F59E0B',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
    },
  });
};

// Info notifications
export const showInfo = (message: string) => {
  toast(message, {
    duration: 4000,
    icon: 'ℹ️',
    style: {
      background: '#3B82F6',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
    },
  });
};

// Loading toast (returns dismiss function)
export const showLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: '#1F2937',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
    },
  });
};

// Dismiss a specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Promise-based toast for async operations
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string | ((err: Error) => string);
  }
) => {
  return toast.promise(promise, messages, {
    style: {
      background: '#1F2937',
      color: '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
    },
    success: {
      style: {
        background: '#10B981',
      },
    },
    error: {
      style: {
        background: '#EF4444',
      },
    },
  });
};

// Transaction-specific toasts
export const showTxSuccess = (signature: string) => {
  toast.success(
    <div>
      <p className="font-medium">Transaction confirmed!</p>
      <a
        href={`https://solscan.io/tx/${signature}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline opacity-90"
      >
        View on Solscan
      </a>
    </div>,
    {
      duration: 6000,
      style: {
        background: '#10B981',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    }
  );
};

export const showTxError = (error: string) => {
  toast.error(
    <div>
      <p className="font-medium">Transaction failed</p>
      <p className="text-sm opacity-90">{error}</p>
    </div>,
    {
      duration: 6000,
      style: {
        background: '#EF4444',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 16px',
      },
    }
  );
};
