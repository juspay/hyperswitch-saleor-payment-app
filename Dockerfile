# Use an official Node.js image as the base image
FROM node:20-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy over the package.json and lock files to install dependencies
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install the dependencies
RUN pnpm install

# Copy the rest of the application code to the container
COPY . .

# Build the Next.js application
RUN pnpm build

# Run the pnpm generate command to prepare necessary files
RUN pnpm generate

# Prepare the production environment
FROM node:20-alpine AS production

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies from the build stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Set environment variables (you can also set these in a .env file)
# ENV PAYMENT_SERVICE_API_KEY=your-api-key
# ENV OTHER_SERVICE_API_KEY=your-other-api-key

# Expose the port on which the app will run
EXPOSE 3000

# Start the Next.js application in production mode
CMD ["pnpm", "start"]
