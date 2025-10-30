# How to Start (Dev)

This guide assumes Windows PowerShell.

## 1) Install dependencies
- Root:
`
npm install
`
- Frontend:
`
cd Frontend
npm install
cd ..
`
- Backend:
`
cd Backend
npm install
cd ..
`

## 2) Backend environment
Create Backend/.env with:
`
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace_with_strong_secret"
PORT=4000
FRONTEND_ORIGIN="http://localhost:5173"
ADMIN_ACCOUNT="admin@example.com"
ADMIN_PASSWORD="Admin123!"
`

## 3) Initialize database
In Backend/:
`
npx prisma generate
npx prisma migrate dev --name init
`

## 4) Run dev servers
From project root:
`
npm start
`
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## 5) Login
Open http://localhost:5173/
- If not authenticated, you will be redirected to /login.
- Login with the admin credentials from .env.
- You will be routed to /Admin. Student/Supplier will be routed to /Student or /Supplier.
