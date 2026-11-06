import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert } from "../alert/index.js";
import { Button } from "../button/index.js";

export interface ErrorFallbackProps {
  error: unknown;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  onError?: (error: unknown, info: ErrorInfo) => void;
  onReset?: () => void;
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/** Isolates descendant rendering failures. Reset remounts children; it never retries application operations. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps, previousState: ErrorBoundaryState) {
    if (
      this.state.hasError &&
      previousState.hasError &&
      !Object.is(previousProps.resetKey, this.props.resetKey)
    ) {
      this.reset();
    }
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === "function")
      return fallback({ error: this.state.error, reset: this.reset });
    if (fallback !== undefined) return fallback;
    return (
      <Alert
        tone="danger"
        title="This panel couldn’t be displayed."
        action={<Button onClick={this.reset}>Try again</Button>}
      >
        The rest of the page is still available. Try reopening this panel.
      </Alert>
    );
  }
}
