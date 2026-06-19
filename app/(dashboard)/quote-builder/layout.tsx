import { quoteFontVars } from "./fonts";

// Applies the route-scoped quote fonts (as CSS variables) to the whole
// quote-builder subtree and, in print, strips the surrounding dashboard chrome
// so only the quote document renders on US Letter. These print rules are only
// in the DOM while a quote-builder page is mounted, so other pages are
// unaffected.
export default function QuoteBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={quoteFontVars}>
      <style>{`
        @media print {
          header { display: none !important; }
          main { padding: 0 !important; max-width: none !important; margin: 0 !important; }
          .inf-backdrop { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .inf-screen-only { display: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}
