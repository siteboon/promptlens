FROM node:20-slim

# Create app directory
WORKDIR /app

# Install development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER node

# The rest of the setup will be handled by devcontainer.json 