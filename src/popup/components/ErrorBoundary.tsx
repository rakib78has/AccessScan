import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Keeps a rendering bug in the results from blanking the whole popup. React
 * requires a class component for this.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // The message and component stack only; never the scan data being rendered.
    console.error('[SiteCheck] results failed to render', error.message, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex flex-col gap-2 text-sm">
        <p>SiteCheck could not display these results.</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false });
          }}
          className="self-start rounded border border-slate-500 px-2 py-1"
        >
          Try again
        </button>
      </div>
    );
  }
}
