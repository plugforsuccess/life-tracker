import React from 'react'
import ReactDOM from 'react-dom/client'
import TaskTracker, { ErrorBoundary } from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(ErrorBoundary, null,
      React.createElement(TaskTracker)
    )
  )
);
