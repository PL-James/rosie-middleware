#!/bin/bash

# ROSIE Middleware - Quick Setup Script
# This script automates the initial setup process

set -e

echo "🚀 ROSIE Middleware - Quick Setup"
echo "=================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql not found. Make sure PostgreSQL is installed or accessible."
    echo "   You can use Docker: docker run --name rosie-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rosie -p 5432:5432 -d postgres:18"
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env and set your GITHUB_TOKEN!"
    echo "   Get a token at: https://github.com/settings/tokens"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check if DATABASE_URL is set
if ! grep -q "GITHUB_TOKEN=ghp_" .env 2>/dev/null; then
    echo "⚠️  WARNING: GITHUB_TOKEN not set in .env!"
    echo "   The application will not be able to scan repositories without this."
    echo ""
fi

# Generate and run migrations
echo "🗄️  Setting up database..."
cd packages/backend

echo "Generating migrations..."
npm run db:generate

echo "Running migrations..."
npm run db:migrate

cd ../..
echo ""

# Success message
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and set your GITHUB_TOKEN (if not done already)"
echo "2. Run 'npm run dev' to start development servers"
echo "3. Open http://localhost:5173 in your browser"
echo "4. Check API docs at http://localhost:3000/api/docs"
echo ""
echo "For detailed instructions, see IMPLEMENTATION.md"
