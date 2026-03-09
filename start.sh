#!/bin/bash

# IntelliCPP Development Server Start Script
# This script starts both frontend and backend servers

echo "🚀 Starting IntelliCPP Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}Port $1 is in use. Killing existing process...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Check and kill existing processes
echo -e "${BLUE}Checking for existing processes...${NC}"
kill_port 3001  # Backend port (server.js uses PORT 3001)
kill_port 3000  # Frontend port

# Create logs directory
mkdir -p logs

# Start Backend Server
echo -e "${BLUE}Starting Backend Server...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Build backend if needed
if [ ! -f "dist/index.js" ]; then
    echo -e "${YELLOW}Building backend...${NC}"
    npm run build
fi

# Start backend in background
npm run server > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 3

# Check if backend is running
if check_port 3001; then
    echo -e "${GREEN}✅ Backend server started successfully on port 3001${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    echo "Check logs/backend.log for details"
    exit 1
fi

# Start Frontend Server
echo -e "${BLUE}Starting Frontend Server...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background with specific port
PORT=3000 npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

# Check if frontend is running
if check_port 3000; then
    echo -e "${GREEN}✅ Frontend server started successfully on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    echo "Check logs/frontend.log for details"
    # Kill backend if frontend fails
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Save PIDs to file for stop script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

echo ""
echo -e "${GREEN}🎉 IntelliCPP Development Environment is ready!${NC}"
echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}Backend:  http://localhost:3001${NC}"
echo ""
echo -e "${YELLOW}To stop all servers, run: ./stop.sh${NC}"
echo -e "${YELLOW}To view logs: tail -f logs/backend.log logs/frontend.log${NC}"
echo ""

# Keep script running and show logs
echo -e "${BLUE}Monitoring servers (Ctrl+C to stop monitoring)${NC}"
echo "---"

# Monitor both log files
tail -f logs/backend.log logs/frontend.log &
TAIL_PID=$!

# Handle Ctrl+C to stop monitoring but keep servers running
trap 'echo -e "\n${YELLOW}Stopped monitoring (servers still running)${NC}"; kill $TAIL_PID 2>/dev/null; exit 0' INT

# Wait for tail process
wait $TAIL_PID
