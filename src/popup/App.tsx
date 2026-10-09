export function App() {
  return (
    <main className="flex flex-col gap-3 p-4">
      <header>
        <h1 className="text-lg font-semibold">SiteCheck</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Accessibility and SEO checks for the page you are viewing.
        </p>
      </header>
      <p
        className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        data-testid="automation-disclaimer"
      >
        Automated checks find only some accessibility problems. A clean result does not mean a page
        meets WCAG; manual testing with a keyboard and a screen reader is still needed.
      </p>
    </main>
  );
}
