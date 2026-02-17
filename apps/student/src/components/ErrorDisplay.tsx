/**
 * Error Display Component
 *
 * Shows error message with retry button
 */

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white text-center" role="alert" aria-live="assertive">
        <div className="text-6xl mb-4" aria-hidden="true">❌</div>
        <p className="text-lg text-red-400 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="bg-primary px-4 py-2 rounded-lg hover:bg-primary/80"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
