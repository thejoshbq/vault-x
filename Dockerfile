# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies for SQLite
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build for ARM64 (Raspberry Pi 4) with static linking
RUN CGO_ENABLED=1 GOOS=linux GOARCH=arm64 \
    go build -ldflags="-s -w" -o vault-x ./cmd/server

# Runtime stage - minimal image
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN adduser -D -g '' appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/vault-x .

# Copy frontend build (if exists)
COPY --from=builder /app/web/dist ./web/dist 2>/dev/null || true

# Create data directory
RUN mkdir -p /data && chown appuser:appuser /data

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run
CMD ["./vault-x"]
