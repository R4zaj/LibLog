# LibLog Project Guide for Claude

This file provides critical context, commands, and architecture details for the LibLog repository. Use this to orient yourself when debugging or writing code.

## Tech Stack
- **Database**: PostgreSQL (hosted on Supabase), managed via Prisma ORM.
- **Backend (server)**: Node.js, Express.js, Prisma Client.
- **Frontend (desktop)**: React 18, Vite, Tailwind CSS, Lucide Icons. (Also configured to be wrapped in Electron).
- **Mobile (mobile)**: React Native, Expo, Tamagui, Expo Router.

## Project Structure
- `/server`: Express backend and Prisma database schema.
- `/desktop`: React web application (Admin/Staff dashboard).
- `/mobile`: Expo mobile application (Student/User app).

## Common Commands
### Backend (Server)
```bash
cd server
npm install
npx prisma generate  # CRITICAL: Always run this after npm install or when cloning!
npm run dev          # Starts the Express server on port 5000 using nodemon
```

### Desktop (Frontend)
```bash
cd desktop
npm install
npm run dev          # Starts the Vite dev server on port 5173
```

### Mobile (App)
```bash
cd mobile
npm install
npm run start        # Starts the Expo bundler
```

## Environment Variables
The `server` directory requires a `.env` file with the following keys. Without this, the server will crash on boot or throw 500 errors on database queries:
```env
PORT=5000
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="..."
```

## Critical Debugging Notes
- **Prisma Client Issues**: If you see `500 Internal Server Error` on the first API hit (like `/api/dashboard/overview`), it usually means the Prisma Client wasn't generated for the current OS. ALWAYS run `npx prisma generate` in `/server`.
- **CORS Issues**: The backend (`server/src/index.js`) is strictly configured to only allow requests from `localhost` and `127.0.0.1`. If testing on another device via a local IP, the CORS policy must be temporarily updated.
- **No Raw SQL**: The backend heavily relies on Prisma's built-in methods (`findMany`, `groupBy`, etc.). Avoid using `prisma.$queryRaw` unless absolutely necessary.
- **Mobile Build**: The mobile app is built using EAS (`eas build -p android`). Changes to native code require a new EAS build.

## Code Style
- Use functional React components with hooks.
- Styling is done via Tailwind CSS (desktop) and Tamagui (mobile).
- Keep API routes in `server/src/routes/` and business logic in `server/src/controllers/`.
- Handle backend errors safely and always return JSON (e.g., `res.status(500).json({ error: 'message' })`).
