ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.16
FROM ${BUILD_FROM}

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    git

# Copy app files
WORKDIR /app
COPY ../package.json .
COPY ../package-lock.json .

# Install dependencies
RUN npm ci --production

# Copy app files
COPY .. .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8099

# Set environment variables
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=8099

# Change working directory back to root
WORKDIR /

# Copy data for add-on
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]

# Labels
LABEL \
    io.hass.name="Organizer App" \
    io.hass.description="Personal Organization Platform" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="Your Name <your.email@example.com>"
