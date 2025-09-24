#!/bin/bash

# 🚀 OpenCut Development Setup Script
# This script automates the development environment setup

set -e

echo "🚀 OpenCut Development Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    print_success "Node.js found: v$NODE_VERSION"
    
    # Check if version is >= 18
    if [ "$(echo "$NODE_VERSION" | cut -d'.' -f1)" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current: v$NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Bun
if command_exists bun; then
    BUN_VERSION=$(bun --version)
    print_success "Bun found: v$BUN_VERSION"
else
    print_warning "Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    
    if command_exists bun; then
        print_success "Bun installed successfully"
    else
        print_error "Failed to install Bun. Please install manually."
        exit 1
    fi
fi

# Check Docker
if command_exists docker; then
    print_success "Docker found"
else
    print_error "Docker not found. Please install Docker and Docker Compose."
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose; then
    print_success "Docker Compose found"
elif docker compose version >/dev/null 2>&1; then
    print_success "Docker Compose (v2) found"
    alias docker-compose='docker compose'
else
    print_error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

print_status "All prerequisites satisfied!"

# Install dependencies
print_status "Installing dependencies..."
if bun install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Start Docker services
print_status "Starting Docker services..."
if docker-compose up -d; then
    print_success "Docker services started"
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 5
    
    # Check if PostgreSQL is ready
    for i in {1..30}; do
        if docker-compose exec -T postgres pg_isready -U opencut >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        
        if [ $i -eq 30 ]; then
            print_error "PostgreSQL failed to start"
            exit 1
        fi
        
        sleep 1
    done
    
else
    print_error "Failed to start Docker services"
    exit 1
fi

# Setup environment file
print_status "Setting up environment file..."
if [ ! -f "apps/web/.env.local" ]; then
    if [ -f "apps/web/.env.example" ]; then
        cp apps/web/.env.example apps/web/.env.local
        print_success "Environment file created from example"
        print_warning "Please edit apps/web/.env.local with your actual values"
    else
        print_warning "No .env.example found, creating basic .env.local"
        cat > apps/web/.env.local << EOF
# Database
DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"

# Authentication
BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
BETTER_AUTH_URL="http://localhost:3000"

# Redis
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="example_token"

# CMS (optional)
MARBLE_WORKSPACE_KEY="workspace-key"
NEXT_PUBLIC_MARBLE_API_URL="https://api.marblecms.com"
EOF
        print_success "Basic environment file created"
    fi
else
    print_success "Environment file already exists"
fi

# Setup database
print_status "Setting up database..."
cd apps/web

if bun run db:push:local; then
    print_success "Database setup completed"
else
    print_warning "Database setup failed, but continuing..."
fi

cd ../..

# Final checks
print_status "Running final checks..."

# Check if the development server can start
print_status "Testing development server startup..."
cd apps/web
timeout 10s bun run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 5

if kill -0 $DEV_PID 2>/dev/null; then
    kill $DEV_PID
    print_success "Development server can start successfully"
else
    print_warning "Development server test failed, but setup is complete"
fi

cd ../..

# Success message
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your OpenCut development environment is ready!"
echo ""
echo "Next steps:"
echo "1. Review and edit apps/web/.env.local if needed"
echo "2. Start development with: bun dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Useful commands:"
echo "• bun dev                    - Start all services"
echo "• cd apps/web && bun run dev - Start web app only"
echo "• bun lint                   - Check code quality"
echo "• bun format                 - Format code"
echo ""
echo "Documentation:"
echo "• GUIDE_LANCEMENT.md         - Complete launch guide"
echo "• GUIDE_DEVELOPPEMENT.md     - Development guide"
echo "• RESUME_AMELIORATIONS.md    - Recent improvements"
echo ""
echo "Happy coding! 🚀"
