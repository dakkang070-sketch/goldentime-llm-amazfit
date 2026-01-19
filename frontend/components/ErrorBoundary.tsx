import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [에러 바운더리] 컴포넌트 에러 감지:', error);
    console.error('🚨 [에러 바운더리] 에러 정보:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-[#0a0a0b] flex items-center justify-center">
          <div className="bg-red-900/20 border border-red-500/30 p-8 rounded-xl max-w-md text-center">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-red-400 text-xl font-semibold mb-4">
              지도 시스템 오류
            </h2>
            <p className="text-zinc-300 text-sm mb-6">
              지도 컴포넌트를 로딩하는 중 오류가 발생했습니다.
            </p>
            <div className="text-xs text-zinc-400 mb-4 bg-zinc-800/50 p-3 rounded font-mono">
              {this.state.error?.message || '알 수 없는 오류'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              🔄 페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;