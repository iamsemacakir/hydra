import type { ReactNode } from "react";

type PageHeadProps = {
  /** Short label above the title, in the accent color (for example the area of the product). */
  eyebrow?: string;
  title: ReactNode;
  /** One sentence under the title. */
  lede?: ReactNode;
  /** Buttons or controls on the right; they wrap under the title on narrow screens. */
  actions?: ReactNode;
  children?: ReactNode;
};

/** The head of a signed-in page: eyebrow, the page's one h1, a lede and the page actions. */
export function PageHead({ eyebrow, title, lede, actions, children }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  );
}
