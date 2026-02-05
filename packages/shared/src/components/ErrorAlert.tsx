/**
 * ErrorAlert Component
 *
 * Displays error messages in a consistent, accessible format
 */

interface ErrorAlertProps {
  error: string | null;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, className = '', onDismiss }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative ${className}`}
    >
      <span className="block sm:inline">{error}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-0 bottom-0 right-0 px-4 py-3"
          aria-label="Dismiss error"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
}
