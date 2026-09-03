export function LoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <svg
        className="size-10 animate-spin text-brand-teal"
        viewBox="0 0 24 24"
        fill="none"
        role="status"
        aria-label="Carregando"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
        <path
          d="M22 12c0-5.523-4.477-10-10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
