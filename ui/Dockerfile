FROM node:18

WORKDIR /app

ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000
ARG VITE_OPENAPI_URL=http://localhost:3000/documentation/json

# Copy package.json and package-lock.json first
COPY package.json package-lock.json ./

# Install the npm packages directly in the Docker container's working directory
RUN npm install

# Copy the rest of the application, excluding node_modules
# .dockerignore should have an entry for node_modules to exclude it
COPY . .

# Build the application
RUN npm run build

# Expose the port your web server runs on, assuming it's 5173
EXPOSE 5173

# Command to run your web server
CMD ["npm", "run", "start"]
