#!/bin/bash
# Script de compilation pour VLogger CLI en Go

echo "Building VLogger CLI for multiple platforms..."

cd "$(dirname "$0")"

# Windows
echo "📦 Compilation pour Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -o vlg.exe -ldflags "-s -w" main.go

# macOS
echo "📦 Compilation pour macOS (Intel)..."
GOOS=darwin GOARCH=amd64 go build -o vlg-macos-intel -ldflags "-s -w" main.go

echo "📦 Compilation pour macOS (Apple Silicon)..."
GOOS=darwin GOARCH=arm64 go build -o vlg-macos-arm64 -ldflags "-s -w" main.go

# Linux
echo "📦 Compilation pour Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -o vlg-linux -ldflags "-s -w" main.go

echo ""
echo "✅ Compilation réussie!"
echo ""
echo "Fichiers créés:"
echo "  - vlg.exe (Windows)"
echo "  - vlg-macos-intel (macOS Intel)"
echo "  - vlg-macos-arm64 (macOS Apple Silicon)"
echo "  - vlg-linux (Linux)"
