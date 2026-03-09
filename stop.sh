#!/bin/bash

# IntelliCPP Development Server Stop Script
# This script stops both frontend and backend servers

echo "🛑 Stopping IntelliCPP Development Environment..."

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
        echo -e "${YELLOW}Killing process on port $1...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 1
        return 0
    else
        return 1
    fi
}

# Stop servers using saved PIDs if available
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${BLUE}Stopping backend server (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        sleep 2
        # Force kill if still running
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing backend...${NC}"
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo -e "${YELLOW}Backend process (PID: $BACKEND_PID) not found${NC}"
    fi
    rm -f .backend.pid
else
    echo -e "${YELLOW}No backend PID file found${NC}"
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${BLUE}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 2
        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing frontend...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo -e "${YELLOW}Frontend process (PID: $FRONTEND_PID) not found${NC}"
    fi
    rm -f .frontend.pid
else
    echo -e "${YELLOW}No frontend PID file found${NC}"
fi

# Additional cleanup - kill any remaining processes on ports
echo -e "${BLUE}Checking for remaining processes...${NC}"

if check_port 3001; then
    echo -e "${YELLOW}Found remaining backend process on port 3001${NC}"
    kill_port 3001
    echo -e "${GREEN}✅ Backend port 3001 cleared${NC}"
else
    echo -e "${GREEN}✅ No backend process found on port 3001${NC}"
fi

if check_port 3000; then
    echo -e "${YELLOW}Found remaining frontend process on port 3000${NC}"
    kill_port 3000
    echo -e "${GREEN}✅ Frontend port 3000 cleared${NC}"
else
    echo -e "${GREEN}✅ No frontend process found on port 3000${NC}"
fi

# Clean up any remaining node processes related to this project
echo -e "${BLUE}Cleaning up related node processes...${NC}"
pkill -f "npm.*start" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "node.*http-server" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Final verification
echo -e "${BLUE}Final verification...${NC}"
if check_port 3001 || check_port 3000; then
    echo -e "${RED}❌ Some processes are still running${NC}"
    echo "Remaining processes:"
    lsof -i :3001 2>/dev/null || echo "  No process on port 3001"
    lsof -i :3000 2>/dev/null || echo "  No process on port 3000"
    echo ""
    echo -e "${YELLOW}You may need to manually kill these processes:${NC}"
    echo "  sudo lsof -ti:3001 | xargs kill -9"
    echo "  sudo lsof -ti:3000 | xargs kill -9"
else
    echo -e "${GREEN}🎉 All IntelliCPP servers stopped successfully!${NC}"
fi

echo ""
echo -e "${BLUE}Log files are available in the logs/ directory${NC}"
echo -e "${YELLOW}To restart servers, run: ./start.sh${NC}"
