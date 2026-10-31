# Codelings 🐛

A gamified, invite-only coding school (MERN). Students learn through short lessons, quick exercises and code challenges, with XP, streaks, hearts and leagues. Admins build courses lesson by lesson, or generate them with AI (coming).

```
codelings/
├── docker-compose.yml   MongoDB + Mailpit (dev email inbox)
├── server/              Express 5 + Mongoose API (port 4000)
└── client/              React 19 + Vite + Tailwind 4 (port 5173)
```

## Run it locally

```bash
# 1. Database + email catcher
docker compose up -d

# 2. API
cd server
cp .env.example .env      # then set JWT_SECRET and ADMIN_PASSWORD
npm install
npm run seed:admin        # creates your admin login from .env
npm run seed:demo         # optional: an "HTML Basics" demo course
npm run dev

# 3. Web app (new terminal)
cd client
npm install
npm run dev
```

- App: http://localhost:5173 (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Dev inbox (every email the app sends): http://localhost:8025

## Sending real email without a domain

Use a Gmail account with an App Password (about 500 emails/day):

1. Turn on 2-Step Verification for the Google account.
2. Create an App Password at https://myaccount.google.com/apppasswords.
3. In `server/.env` set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`.

## Deploying (Render + MongoDB Atlas)

In production one Node service serves both the API and the built React app (`npm run build`, then `npm start` from the repo root).

1. **Database:** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), add a database user, allow access from anywhere (`0.0.0.0/0`), and copy the connection string. Add `/codelings` before the `?` so data goes into a `codelings` database.
2. **Email:** create a Gmail App Password (see above).
3. **Host:** on [Render](https://render.com), choose **New → Blueprint** and pick this repo. `render.yaml` sets everything up; fill in the values it asks for:
   - `MONGO_URI`: the Atlas connection string
   - `CLIENT_URL`: the app's public address, e.g. `https://codelings.onrender.com` (you can fill it in after the first deploy shows the URL, then redeploy)
   - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: your admin login (created on first start only)
   - `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: your Gmail address, its App Password, and e.g. `Codelings <you@gmail.com>`
4. Open the app, sign in as admin, and use **Send me a test** on the dashboard to check email works.

Students can install the app from their phone browser ("Add to Home screen").

## Background jobs

The API runs two hourly jobs (node-cron): closing finished league weeks, and sending streak reminders at 7pm in each student's timezone. **The server must stay awake for reminders to go out on time.** Free hosts that sleep when idle (e.g. Render's free tier) will skip them, so use an always-on plan for the API. League weeks also close on startup and whenever someone opens the league page, so they catch up regardless.

## Build phases

- [x] **1. Foundations:** auth, invite links (email / WhatsApp / copy), course → module → lesson builder, exercise editor (multiple choice, fill-in-the-blank, arrange code, HTML/CSS/JS challenge), student course map with locked lessons
- [x] **2. Learning experience:** lesson player (video/notes → exercises → finish screen), instant feedback with sounds, wrong answers come back until right, live code editor with preview and auto-checks, hearts lost on failed code checks, practice round to refill hearts, XP + daily streak on lesson completion
- [x] **3. Game layer:** weekly leagues (8 tiers, groups of 20, top/bottom 5 move), streak freezes (earned every 7-day streak, max 2), cohorts (shared start date + private leaderboard), profile with badges, promotion/freeze notices
- [x] **4. Retention:** 7pm (student's timezone) streak-at-risk email with their next lesson, one-tap "Continue" card and streak banner on the home page, "students who need a nudge" list on the admin dashboard with WhatsApp/email/copy messages, test-reminder button
- [x] **5a. Create a course with Claude (no API key):** Courses → "Create with Claude" builds a prompt to paste into claude.ai; paste the reply back to validate, preview and import it as a draft
- [ ] **5b. One-click generation:** same import format, generated server-side (needs `ANTHROPIC_API_KEY`)
