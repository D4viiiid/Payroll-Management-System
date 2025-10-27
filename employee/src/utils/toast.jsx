/**
 * ✅ BUG #25 FIX: React Hot Toast Utility Functions
 * Centralized toast notification helpers to replace default alerts
 */

import toast from 'react-hot-toast';

/**
 * Show success toast notification
 * @param {string} message - Success message to display
 * @param {object} options - Additional toast options
 */
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    ...options,
  });
};

/**
 * Show error toast notification
 * @param {string} message - Error message to display
 * @param {object} options - Additional toast options
 */
export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 5000,
    ...options,
  });
};

/**
 * Show warning toast notification (using custom emoji icon)
 * @param {string} message - Warning message to display
 * @param {object} options - Additional toast options
 */
export const showWarning = (message, options = {}) => {
  return toast(message, {
    icon: '⚠️',
    duration: 4000,
    style: {
      background: '#f59e0b',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Show info toast notification
 * @param {string} message - Info message to display
 * @param {object} options - Additional toast options
 */
export const showInfo = (message, options = {}) => {
  return toast(message, {
    icon: 'ℹ️',
    duration: 4000,
    style: {
      background: '#3b82f6',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Show loading toast notification
 * @param {string} message - Loading message to display
 * @param {object} options - Additional toast options
 * @returns {string} Toast ID that can be used to dismiss later
 */
export const showLoading = (message, options = {}) => {
  return toast.loading(message, options);
};

/**
 * Dismiss a specific toast by ID
 * @param {string} toastId - Toast ID to dismiss
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

/**
 * Show confirmation dialog using React Hot Toast
 * Returns a Promise that resolves to true if confirmed, false if cancelled
 * @param {string} message - Confirmation message
 * @param {object} options - Additional options
 * @returns {Promise<boolean>}
 */
export const showConfirm = (message, options = {}) => {
  return new Promise((resolve) => {
    const {
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmColor = '#10b981',
      cancelColor = '#6b7280',
      duration = 0, // Don't auto-dismiss
      ...otherOptions
    } = options;

    const toastId = toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontWeight: '500', fontSize: '14px' }}>{message}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              style={{
                padding: '8px 16px',
                background: cancelColor,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              style={{
                padding: '8px 16px',
                background: confirmColor,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        duration,
        style: {
          background: '#fff',
          color: '#000',
          padding: '16px',
          borderRadius: '8px',
          minWidth: '320px',
        },
        ...otherOptions,
      }
    );
  });
};

/**
 * Update an existing toast
 * @param {string} toastId - Toast ID to update
 * @param {object} options - Update options (message, icon, etc.)
 */
export const updateToast = (toastId, options) => {
  toast.dismiss(toastId);
  
  if (options.type === 'success') {
    return showSuccess(options.message, options);
  } else if (options.type === 'error') {
    return showError(options.message, options);
  } else {
    return toast(options.message, options);
  }
};

// Export default toast for custom usage
export default toast;
