"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="font-['Space_Grotesk'] text-[10px] tracking-[0.3em] uppercase text-[#C9B96B88] mb-3">
              Something went wrong
            </div>
            <p className="font-['Instrument_Serif'] text-sm italic text-[#F0E6D366]">
              Please try refreshing the page.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
