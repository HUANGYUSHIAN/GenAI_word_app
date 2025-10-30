# Backend Communication and Data Operations

Create `Backend/.env` with DATABASE_URL, JWT_SECRET, PORT, FRONTEND_ORIGIN as described in README.

## Setup
- Root install: `npm install`
- Backend dev: `npm -w Backend run dev`
- Prisma generate/migrate: `npm -w Backend run prisma:generate` then `npm -w Backend run prisma:migrate`

## Auth
- Register: POST `/auth/register` (role: student|supplier, email, phoneNumber?, birthday?, name, password, language?)
- Login: POST `/auth/login` -> sets httpOnly cookie
- Me: GET `/auth/me`
- Logout: POST `/auth/logout`

## Admin
- List users: GET `/users`
- Lock/Unlock: PATCH `/users/:id/lock` or `/users/:id/unlock`

## Vocabulary
- Upload file: POST `/vocabulary/upload` (multipart form `file`: .csv/.xlsx). Headers: Word, Spelling, Explanation, PartOfSpeech, Sentences. Missing -> null.
- Create JSON: POST `/vocabulary`
