# CodeFlow AI - C++ Autocomplete Engine

## Overview
CodeFlow AI is a production-grade C++ autocomplete engine featuring a Trie-based prefix search, Monaco Editor UI with glassmorphism design, and STL-aware suggestions. Originally an Electron desktop app, it runs as a web application in Replit.

## Project Architecture
- **Frontend**: React 18 with Create React App (CRA), Monaco Editor, glassmorphism CSS
- **Backend**: C++ native addon (node-gyp/CMake) - not built in Replit; frontend has graceful fallback
- **Entry point**: `frontend/` directory with `npm start`
- **Port**: 5000 (configured via `frontend/.env`)

## Key Files
- `frontend/src/App.jsx` - Main React component with Monaco editor and suggestion logic
- `frontend/src/components/SuggestionPopup.jsx` - Autocomplete popup component
- `frontend/src/styles/glassmorphism.css` - UI theme and styles
- `main.js` - Electron main process (not used in Replit)
- `backend/` - C++ native addon source (not built in Replit)
- `data/` - C++ keywords and STL functions data

## Running
- Workflow "Start application" runs `cd frontend && npm start` on port 5000
- CRA dev server configured with `HOST=0.0.0.0` and `DANGEROUSLY_DISABLE_HOST_CHECK=true`

## Deployment
- Static deployment using `frontend/build` as public directory
- Build command: `cd frontend && npm install && npm run build`

## Recent Changes
- Feb 2026: Initial Replit setup - configured CRA for port 5000, fixed duplicate axios dep, disabled Electron postinstall build
