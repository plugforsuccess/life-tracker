import React from 'react'
import ReactDOM from 'react-dom/client'
import TaskTracker from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { minHeight: '100vh', background: '#0a0a0f', color: '#e8e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", padding: '20px' }
      },
        React.createElement('div', { style: { textAlign: 'center', maxWidth: '400px' } },
          React.createElement('p', { style: { fontSize: '11px', letterSpacing: '4px', color: '#7c6af7', marginBottom: '12px' } }, 'LIFE COMMAND CENTER'),
          React.createElement('p', { style: { fontSize: '16px', marginBottom: '16px' } }, 'Something went wrong'),
          React.createElement('p', { style: { fontSize: '12px', color: '#5a5a7a', lineHeight: 1.6, wordBreak: 'break-word' } }, String(this.state.error)),
          React.createElement('button', {
            onClick: () => window.location.reload(),
            style: { marginTop: '20px', padding: '10px 24px', borderRadius: '8px', background: '#7c6af7', border: 'none', color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: '12px', letterSpacing: '2px', cursor: 'pointer' }
          }, 'RELOAD')
        )
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(ErrorBoundary, null,
      React.createElement(TaskTracker)
    )
  )
);
