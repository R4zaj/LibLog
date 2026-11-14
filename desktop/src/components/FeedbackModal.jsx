import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

const VARIANT_STYLES = {
  success: {
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50',
    button: 'bg-primary-800 hover:bg-primary-900 text-white shadow-sm',
    DefaultIcon: CheckCircle2
  },
  primary: {
    iconBg: 'bg-primary-50 text-primary-700 border-primary-200/70 dark:bg-primary-950/50 dark:text-primary-400 dark:border-primary-800/50',
    button: 'bg-primary-800 hover:bg-primary-900 text-white shadow-sm',
    DefaultIcon: CheckCircle2
  },
  warning: {
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/50',
    button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
    DefaultIcon: AlertTriangle
  },
  danger: {
    iconBg: 'bg-red-50 text-red-600 border-red-200/70 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/50',
    button: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    DefaultIcon: AlertCircle
  },
  info: {
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/50',
    button: 'bg-primary-800 hover:bg-primary-900 text-white shadow-sm',
    DefaultIcon: Info
  }
};

/**
 * Compact status/feedback modal (Success, Info, Error) with bounded width and clean typography.
 */
export function StatusModal({
  isOpen,
  onClose,
  title,
  description,
  variant = 'success',
  icon: CustomIcon,
  primaryLabel = 'Done',
  secondaryLabel,
  onSecondaryAction
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.success;
  const Icon = CustomIcon || style.DefaultIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-dark-card w-full max-w-sm rounded-2xl shadow-xl border border-gray-200/80 dark:border-dark-border overflow-hidden animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-snug">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 leading-relaxed break-words">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3.5 bg-gray-50/80 dark:bg-dark-bg/60 border-t border-gray-100 dark:border-dark-border flex items-center justify-end gap-2.5">
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${style.button}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable confirmation dialog with header, optional body/form slot, error banner, and loading state.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  variant = 'primary',
  icon: CustomIcon,
  confirmLabel = 'Confirm',
  loadingLabel = 'Processing...',
  cancelLabel = 'Cancel',
  isLoading = false,
  error = null,
  maxWidth = 'max-w-md',
  children
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const Icon = CustomIcon || style.DefaultIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in no-print"
      onClick={() => {
        if (!isLoading) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-dark-card w-full ${maxWidth} rounded-2xl shadow-xl border border-gray-200/80 dark:border-dark-border overflow-hidden animate-pop-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4 flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {(error || children) && (
          <div className="px-5 pb-5 space-y-3.5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200/80 dark:border-red-800/50 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {children}
          </div>
        )}

        <div className="px-5 py-3.5 bg-gray-50/80 dark:bg-dark-bg/60 border-t border-gray-100 dark:border-dark-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 min-w-[110px] disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed ${style.button}`}
          >
            {isLoading && <Loader2 size={15} className="animate-spin" />}
            <span>{isLoading ? loadingLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

