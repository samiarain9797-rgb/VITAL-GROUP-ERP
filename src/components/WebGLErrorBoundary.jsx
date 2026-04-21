import React from 'react';

export class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WebGL Rendering Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[450px] bg-zinc-950 flex flex-col items-center justify-center rounded-2xl border-2 border-zinc-200">
          <div className="text-red-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-zinc-100 font-bold tracking-widest uppercase">3D Visualization Unavailable</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm text-center">
            Your browser could not create a WebGL context. Hardware acceleration might be disabled, or the context limit was reached.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
