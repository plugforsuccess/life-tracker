import React from 'react'
import ReactDOM from 'react-dom/client'

function showError(err) {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height:100vh;background:#0a0a0f;color:#e8e8f0;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;padding:20px">
      <div style="text-align:center;max-width:480px">
        <p style="font-size:11px;letter-spacing:4px;color:#7c6af7;margin-bottom:12px">LIFE COMMAND CENTER</p>
        <p style="font-size:16px;margin-bottom:16px">Something went wrong</p>
        <p style="font-size:12px;color:#5a5a7a;line-height:1.6;word-break:break-word">${String(err)}</p>
        <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;border-radius:8px;background:#7c6af7;border:none;color:#fff;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;cursor:pointer">RELOAD</button>
      </div>
    </div>`;
}

async function boot() {
  try {
    const { default: TaskTracker } = await import('./App.jsx');

    class ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { error: null }; }
      static getDerivedStateFromError(error) { return { error }; }
      componentDidCatch(err) { console.error('React error:', err); }
      render() {
        if (this.state.error) { showError(this.state.error); return null; }
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
  } catch (err) {
    console.error('Boot error:', err);
    showError(err);
  }
}

boot();
