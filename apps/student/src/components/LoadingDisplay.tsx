/**
 * Loading Display Component
 *
 * Shows loading spinner with message
 */

interface LoadingDisplayProps {
  message?: string;
}

export function LoadingDisplay({ message = 'Loading game...' }: LoadingDisplayProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white text-center" role="status" aria-live="polite">
        <div className="animate-spin text-6xl mb-4" aria-hidden="true">⏳</div>
        <p className="text-lg">{message}</p>
      </div>
    </div>
  );
}
