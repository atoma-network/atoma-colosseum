# Use the official Rust image as the base image
FROM --platform=$BUILDPLATFORM rust:1.83-slim-bullseye AS builder

ARG TRACE_LEVEL
ARG BUILDPLATFORM
ARG TARGETPLATFORM

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /usr/src/guess-ai

# Copy the source code
COPY . .

# Build the dependencies to cache them
RUN RUST_LOG=${TRACE_LEVEL} cargo build --release --no-default-features

FROM --platform=$TARGETPLATFORM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Build the application

WORKDIR /app

COPY --from=builder /usr/src/guess-ai/target/release/guess-ai /usr/local/bin/guess-ai
# Set the startup command to run the binary
# CMD ["/usr/local/bin/guess-ai", "--config-path", ]

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["/usr/local/bin/guess-ai", "--config-path", "/app/config.toml"]
