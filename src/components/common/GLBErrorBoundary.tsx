import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GLBErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface GLBErrorBoundaryState {
  hasError: boolean;
}

/**
 * ErrorBoundary bảo vệ nhánh tải mô hình `.glb` (`useGLTF`):
 * Nếu đường dẫn `modelPath` trong `campusLayout.json` bị lỗi 404 hoặc hỏng file,
 * ứng dụng không bị crash trắng trang mà tự động lùi về hiển thị khối `ProceduralBuilding`.
 */
export class GLBErrorBoundary extends Component<
  GLBErrorBoundaryProps,
  GLBErrorBoundaryState
> {
  state: GLBErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GLBErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[VMU Campus Tour] Không thể nạp file GLB, tự động dùng khối Procedural:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
