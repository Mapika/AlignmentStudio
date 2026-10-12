import type { ReactNode } from 'react';

// A one-line "Why?" disclosure for caveats that would otherwise crowd the page.
export function Why({ children, label = 'Why?' }: { children: ReactNode; label?: string }) {
  return <details className="why"><summary>{label}</summary><div>{children}</div></details>;
}
