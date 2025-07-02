'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  errorType?: 'data' | 'auth' | 'generic';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * A reusable error boundary component that catches errors in its child components
 * and displays a friendly error message with an option to retry.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null 
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, errorType = 'generic' } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // Otherwise, use the default error UI
      let errorMessage = 'Something went wrong';
      let detailMessage = 'Please try again later';

      // Customize messages based on error type
      switch (errorType) {
        case 'data':
          errorMessage = 'Failed to load data';
          detailMessage = 'There was a problem retrieving the requested data';
          break;
        case 'auth':
          errorMessage = 'Authentication error';
          detailMessage = 'You may not have permission to view this content';
          break;
        default:
          // Use default messages
          break;
      }

      return (
        <div 
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center"
        >
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-destructive mb-2">{errorMessage}</h3>
          <p className="text-muted-foreground mb-6">{detailMessage}</p>
          {error && (
            <div className="bg-card/50 p-3 rounded mb-4 text-left overflow-auto max-h-32">
              <code className="text-xs text-muted-foreground">
                {error.toString()}
              </code>
            </div>
          )}
          <Button 
            onClick={this.handleRetry}
            aria-label="Retry operation"
            className="focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      );
    }

    return children;
  }
}

/**
 * A hook-based error boundary wrapper for use in functional components.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}
