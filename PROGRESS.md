# Wellio Backend — Progress Audit (2025-12-26)
Scope: Node.js/Express API in this repository. Status reflects actual code, not planned scope.

Legend: ✅ v1 done · 🚧 Partial · ⏳ TODO

## Authentication & Security
- ✅ Email + OTP login and verification (email delivery via Nodemailer; temp 1F token).
- ✅ Google OAuth ID token login followed by OTP.
- 🚧 Secure sessions: JWT access/refresh with blacklist; super-admin sessions tracked; no per-device session list for regular users; no refresh rotation enforcement beyond blacklist.
- 🚧 Phone verification endpoint accepts Firebase ID token; relies on external Firebase setup; not used to drive login.
- ⏳ Biometric authentication (mobile) not implemented.

## User Profile & Settings
- ✅ Profile CRUD: phone, address, weight/height with units; profile completion flag.
- 🚧 Missing age, BMI calculator, body type, activity level, goals, dietary preferences, allergies/restrictions.
- 🚧 Notification preferences (email/SMS timing, smart notifications), language options, dark mode, cloud backup not present.

## Admin, Company & Policies
- ✅ Super admin setup/login/recovery with security question, session revocation, lockout on failed attempts.
- ✅ Company info CRUD with logo upload (ImgBB), phones/emails/social links.
- ✅ Privacy policy & Terms CRUD + public fetch endpoints.

## Diet Plan Management
- ✅ User diet plan CRUD with 7-day schedule, meals (time, items, estimated calories, prep notes), active-plan handling, copy-week.
- ✅ Template library with goals and admin CRUD; users can apply templates to create plans.
- 🚧 No meal swap suggestions, weekend/weekday variants, vacation mode, grocery list, meal prep calculator, restaurant mode, or plan sharing.

## Meal Logging & Dashboard Data
- ✅ Meal logs tied to active plan: statuses (completed/skipped/not_yet), calories required when completed, same-day-only edits; fetch by date or range.
- 🚧 No dashboard aggregations (calorie progress bar, macro breakdown, adherence score, next meal, motivational quotes).
- 🚧 No scheduled meal reminders or predictive prompts; push service exists but not wired to meals.
- ⏳ Best/worst day, streak tracking, PDF export, progress photos, body measurements, weight timeline absent.

## Water & Supplements
- ✅ Water intake entries with daily totals and per-user daily goal update.
- 🚧 No quick-add presets, reminders, or monthly habit overview for water.
- ✅ Supplement schedules (name, time, days, notes), CRUD, intake logs, monthly log retrieval.
- ✅ Cron-driven supplement push reminders; uses stored push tokens.
- 🚧 No supplement habit analytics or goal tracking.

## Push Notifications
- ✅ Push token storage (OneSignal-style), mute/unmute, delete, history, manual send to token/user.
- ✅ Supplement reminders auto-send.
- 🚧 No meal reminder scheduling; no smart notification logic; SMS reminders absent.

## AI Assistant
- ✅ AI chat sessions/messages persisted; OpenRouter LLM with diet-focused system prompt; title generation; session list and delete.
- 🚧 Endpoints are unauthenticated (require userId in body/query); not linked to user diet/meal data; no calorie-deficit calculator, smart meal suggestions from remaining macros, or habit insights.

## Progress & Analytics
- 🚧 Raw data available (meal logs, water, supplements) but no analytics endpoints for historical calories, compliance %, charts, streaks, progress photos, measurements, or exports.

## Food Library
- ⏳ No food database, barcode scan, recipe builder, favorites/recent, AI food recognition, or portion guides.

## Integrations & Smart Features
- ⏳ No integrations with Google Fit / Apple Health / Strava; no offline mode or real-time clock sync.
- ⏳ Cheat meal tracker, calorie bank, weekend/weekday split plans, vacation mode, grocery list generation, shareable progress cards, coach portal all missing.

## Gamification & Motivation
- ⏳ Achievement badges, daily challenges, milestone celebrations, comparison insights not implemented.

## Monetization
- ⏳ No free/premium tiering, feature gating, or billing hooks.

## Email Subscription & Broadcast (v2)
- ✅ Public subscription API: idempotent email subscription with validation/normalization, uniqueness enforced at DB level.
- ✅ Admin template management: HTML email templates with metadata (name, subject, createdAt, updatedAt), CRUD operations.
- ✅ Admin broadcast system: batch email sending (max batchSize: 30, min delay: 3s), async processing with fault tolerance, status tracking (pending/in-progress/completed/failed), metrics (sent/failed counts, success rate).
- ✅ Admin observability: subscriber count, broadcast status polling, batch configuration, sent vs failed metrics.

## Technical Notes
- ✅ Express + MongoDB (Mongoose), Helmet/CORS/Morgan, Joi validation, rate limiting, Swagger docs, health/welcome endpoints.
- 🚧 AI and some routes lack auth middleware; ensure protection before production use.
