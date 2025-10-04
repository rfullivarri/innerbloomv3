# Innerbloom Monorepo

## Project Structure
- `apps/api`: Express + Prisma backend service.
- `apps/web`: React (Vite + TS) frontend.
- `Docs`: Additional documentation.

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an `.env` in `apps/api` based on `.env.example` and provide database credentials.
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Start development servers:
   ```bash
   npm run dev
   ```
