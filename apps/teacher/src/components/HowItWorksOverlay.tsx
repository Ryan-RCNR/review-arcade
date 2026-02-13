import React, { useEffect, useCallback } from "react";
import { X, Film, BookOpen } from "lucide-react";

interface Section {
  title: string;
  icon: React.ReactNode;
  items: string[];
}

interface HowItWorksOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  toolName: string;
  videoUrl?: string;
  sections: Section[];
}

export function HowItWorksOverlay({
  isOpen,
  onClose,
  toolName,
  videoUrl,
  sections,
}: HowItWorksOverlayProps): React.JSX.Element | null {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 12, 23, 0.95)", backdropFilter: "blur(8px)" }}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Content card */}
      <div
        className="relative glass-nav rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ animation: "fadeIn 0.2s ease" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-brand/50 hover:text-brand hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={24} className="text-brand" />
            <h2 className="text-2xl font-bold text-white font-serif">
              How {toolName} Works
            </h2>
          </div>
          <p className="text-brand/50 text-sm">
            Everything you need to get started.
          </p>
        </div>

        {/* Video section */}
        <div className="px-8 pb-4">
          {videoUrl ? (
            <div className="rounded-xl overflow-hidden aspect-video">
              <iframe
                src={videoUrl}
                title={`${toolName} walkthrough`}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-xl bg-white/5 border border-brand/10 flex flex-col items-center justify-center py-10 gap-3">
              <Film size={32} className="text-brand/30" />
              <p className="text-brand/30 text-sm">Video walkthrough coming soon</p>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="px-8 pb-4 space-y-6">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-brand uppercase tracking-wider mb-3">
                {section.icon}
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-3 text-sm text-white/80"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand/40 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 pt-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: "#F5A623",
              color: "#000C17",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#FFB84D")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#F5A623")}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to manage first-visit auto-open
export function useHowItWorks(toolSlug: string) {
  const storageKey = `rcnr_${toolSlug}_intro_seen`;
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setIsOpen(true);
    }
  }, [storageKey]);

  const close = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  return { isOpen, open, close };
}
