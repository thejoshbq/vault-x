#!/bin/bash
set -e

echo "============================================"
echo "Budget System - Local Development Setup"
echo "============================================"
echo ""

# Check for required tools
echo "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Install from: https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js $(node --version)"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
else
    echo "✅ npm $(npm --version)"
fi

# Check Go
if ! command -v go &> /dev/null; then
    echo "⚠️  Go is not installed"
    echo ""
    echo "Installing Go 1.21.6..."

    # Detect architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        GO_ARCH="amd64"
    elif [ "$ARCH" = "aarch64" ]; then
        GO_ARCH="arm64"
    else
        echo "Unsupported architecture: $ARCH"
        exit 1
    fi

    # Download and install Go
    GO_VERSION="1.21.6"
    GO_TAR="go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"

    echo "Downloading Go for ${GO_ARCH}..."
    wget -q "https://go.dev/dl/${GO_TAR}" -O "/tmp/${GO_TAR}"

    echo "Installing Go to ~/go-${GO_VERSION}..."
    mkdir -p ~/go-${GO_VERSION}
    tar -C ~/go-${GO_VERSION} --strip-components=1 -xzf "/tmp/${GO_TAR}"
    rm "/tmp/${GO_TAR}"

    # Add to PATH for this session
    export PATH="$HOME/go-${GO_VERSION}/bin:$PATH"
    export GOPATH="$HOME/go"

    # Add to bashrc if not already present
    if ! grep -q "go-${GO_VERSION}" ~/.bashrc; then
        echo "" >> ~/.bashrc
        echo "# Go installation" >> ~/.bashrc
        echo "export PATH=\"\$HOME/go-${GO_VERSION}/bin:\$PATH\"" >> ~/.bashrc
        echo "export GOPATH=\"\$HOME/go\"" >> ~/.bashrc
        echo "export PATH=\"\$GOPATH/bin:\$PATH\"" >> ~/.bashrc
    fi

    echo "✅ Go ${GO_VERSION} installed successfully"
    echo "   Run 'source ~/.bashrc' to update your PATH"
else
    echo "✅ Go $(go version | awk '{print $3}')"
fi

echo ""
echo "============================================"
echo "Installing dependencies..."
echo "============================================"
echo ""

# Install Go dependencies
echo "📦 Installing Go modules..."
go mod download
go mod tidy
echo "✅ Go dependencies installed"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd web
npm install
echo "✅ Frontend dependencies installed"

# Build frontend
echo ""
echo "🏗️  Building frontend..."
npm run build
cd ..
echo "✅ Frontend built successfully"

# Create data directories
echo ""
echo "📁 Creating data directories..."
mkdir -p data backups
echo "✅ Data directories created"

# Copy environment file
if [ ! -f .env ]; then
    echo ""
    echo "📄 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
fi

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "To start the application:"
echo ""
echo "  1. Build the binary:"
echo "     go build -o bin/vault-x ./cmd/server"
echo ""
echo "  2. Run the application:"
echo "     ./bin/vault-x"
echo ""
echo "  3. Open your browser:"
echo "     http://localhost:3000"
echo ""
echo "For development with hot reload:"
echo ""
echo "  Terminal 1 (backend):"
echo "     go run ./cmd/server/main.go"
echo ""
echo "  Terminal 2 (frontend):"
echo "     cd web && npm run dev"
echo "     (Then access at http://localhost:5173)"
echo ""
echo "============================================"
