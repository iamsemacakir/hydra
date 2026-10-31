import { Icon } from "../landing/Icon";

type NoResultsProps = {
  /** What was searched for, if a search (rather than only filters) found nothing. */
  query?: string;
  /** What the list holds, plural ("components", "work items"). */
  what: string;
  /** A close name to offer instead ("Did you mean Payment Service?"). */
  suggestion?: string | null;
  onSuggestion?: (suggestion: string) => void;
  onClear: () => void;
  className?: string;
};

/** A search or filter that found nothing: say so, offer the likely intended name, and a way back to everything. */
export function NoResults({ query, what, suggestion, onSuggestion, onClear, className }: NoResultsProps) {
  const searched = !!query?.trim();
  return (
    <div className={["no-results", className].filter(Boolean).join(" ")} role="status">
      <span className="empty-icon" aria-hidden="true"><Icon name="search-x" size={20} /></span>
      <p className="no-results-title">{searched ? <>No {what} match “{query?.trim()}”.</> : <>No {what} match these filters.</>}</p>
      {suggestion && onSuggestion && <p className="no-results-hint">Did you mean <button type="button" className="link-button" onClick={() => onSuggestion(suggestion)}>{suggestion}</button>?</p>}
      <button type="button" className="button small" onClick={onClear}><Icon name="x" size={14} />{searched ? "Clear the search" : "Clear the filters"}</button>
    </div>
  );
}
