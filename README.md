# Codelings 🐛

A gamified coding school (MERN). Students apply through a public link and are approved by the admin; they learn through short lessons, quick exercises and code challenges, with XP, streaks, hearts and leagues. Admins build courses lesson by lesson, or have Claude write them.

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

**On Render's free plan, use Brevo** (outgoing SMTP is blocked there):

1. Sign up free at [brevo.com](https://www.brevo.com).
2. **Senders, domains & IPs → Senders → Add a sender:** add your Gmail address and click the link Brevo emails you.
3. **SMTP & API → API keys → Generate a new API key.**
4. Set `BREVO_API_KEY` to that key and `MAIL_FROM` to `Codelings <your-verified@gmail.com>`. When `BREVO_API_KEY` is set, the SMTP settings are ignored.

**On hosts that allow SMTP**, Gmail works directly:

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
4. **Keep it awake (free plan):** Render's free plan sleeps after ~15 idle minutes. On [cron-job.org](https://cron-job.org) (free), create a job that calls
   `https://YOUR-APP.onrender.com/api/cron/run?key=YOUR_CRON_SECRET` **every 10 minutes**. Copy `CRON_SECRET` from Render → your service → Environment. Each call keeps the app awake and sends any due 7pm reminders.
   On the paid Starter plan this step is optional.
5. Open the app, sign in as admin, and use **Send me a test** on the dashboard to check email works.

Students can install the app from their phone browser ("Add to Home screen").

## Joining: applications and referrals

Share `/apply` (Admin → **Applications** has the link with copy/WhatsApp buttons). Applicants give name, email and phone (required), an optional referral code, and optional details (date of birth, gender, location, occupation, experience, goals, laptop, preferred time). You approve (choosing courses and cohort) or reject with a note. Approval creates the account and emails a temporary password, which the student must change at first sign-in; the password is also shown to you once in case the email doesn't arrive. Every student gets a referral code and link on their profile (`/apply?ref=CODE`), and you can see who referred whom.

## Statistics

Every lesson and practice round is recorded as a session (`LessonAttempt`) with each answer: right or wrong, what was answered, time taken, and failed code checks. Admin → **Analytics** shows class-wide numbers (activity, where students drop off, hardest questions, leaderboards, cohorts); each student's page (Students → **Stats**) shows their activity calendar, time, accuracy, mistakes, code challenges, sessions and league history. Both export to CSV. Students see a lighter version on their profile.

## Background jobs

Two jobs run hourly inside the server (node-cron): closing finished league weeks, and sending streak reminders at 7pm in each student's timezone. They also run whenever `/api/cron/run?key=CRON_SECRET` is called, which is how a free host that sleeps gets woken up (see step 4 above). Runs never overlap, and each student gets at most one reminder a day. League weeks also close when someone opens the league page.

## Build phases

- [x] **1. Foundations:** auth, course → module → lesson builder, exercise editor (multiple choice, fill-in-the-blank, arrange code, HTML/CSS/JS challenge), student course map with locked lessons
- [x] **2. Learning experience:** lesson player (video/notes → exercises → finish screen), instant feedback with sounds, wrong answers come back until right, live code editor with preview and auto-checks, hearts lost on failed code checks, practice round to refill hearts, XP + daily streak on lesson completion
- [x] **3. Game layer:** weekly leagues (8 tiers, groups of 20, top/bottom 5 move), streak freezes (earned every 7-day streak, max 2), cohorts (shared start date + private leaderboard), profile with badges, promotion/freeze notices
- [x] **4. Retention:** 7pm (student's timezone) streak-at-risk email with their next lesson, one-tap "Continue" card and streak banner on the home page, "students who need a nudge" list on the admin dashboard with WhatsApp/email/copy messages, test-reminder button
- [x] **5a. Create a course with Claude (no API key):** Courses → "Create with Claude" builds a prompt to paste into claude.ai; paste the reply back to validate, preview and import it as a draft
- [ ] **5b. One-click generation:** same import format, generated server-side (needs `ANTHROPIC_API_KEY`)
