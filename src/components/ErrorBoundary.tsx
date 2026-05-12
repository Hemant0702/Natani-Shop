import * as React from 'react';

interface Props { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}

interface State { 
  hasError: boolean; 
  error?: Error; 
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 my-8">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Kuch galat ho gaya</h2>
          <p className="text-gray-600 mb-6 max-w-xs">
            Kripya page ko refresh karein ya thodi der baad try karein.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
          >
            Refresh Karein
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}