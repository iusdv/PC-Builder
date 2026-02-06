import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  backTo?: string;
  backLabel?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
};

export default function PageShell({ title, subtitle, backTo, backLabel, right, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header sticky top-0 z-30">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {backTo ? (
              <Link to={backTo} className="text-sm text-[var(--muted)] hover:text-[var(--text)] whitespace-nowrap">
					← {backLabel ?? 'Back'}
              </Link>
            ) : null}
            <div className="min-w-0">
              <div className="text-xl font-semibold text-[var(--text)] truncate">{title}</div>
              {subtitle ? <div className="text-sm text-[var(--muted)] truncate">{subtitle}</div> : null}
            </div>
          </div>

          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
