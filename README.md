# PW MedEd — Faculty & Academic Calendar Platform

A clinical medical education schedule and curricular planner platform for PW MedEd, providing dual Admin and Faculty portals with automated reminder emails, multi-batch scheduling, Google Sheets integration, and 3D visual aesthetic design.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/bhaskarekka27-afk/meded-faculty-calendar)

---

## 🚀 Deploying on Render

### Option 1: One-Click Blueprint (Recommended)
1. Click the **Deploy to Render** button above or go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect `bhaskarekka27-afk/meded-faculty-calendar`.
4. Render will automatically read `render.yaml` and configure the static web service.
5. Click **Apply**.

### Option 2: Manual Static Site Setup
1. In [Render Dashboard](https://dashboard.render.com), click **New +** > **Static Site**.
2. Connect `bhaskarekka27-afk/meded-faculty-calendar`.
3. Configure settings:
   - **Name**: `meded-faculty-calendar`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Click **Create Static Site**.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build production bundle for deployment
npm run build

# Preview production build locally
npm run preview
```

---

## 🩺 Features

- **Admin Academic Dashboard** (`/admin.html`):
  - Essential metric summary (Schedule Overview, Active Faculty, Curriculum Pace).
  - Multi-cohort scheduling across MBBS 1st Year (Prarambh) and MBBS 3rd Year (Sushruta).
  - "All Batches (Select All)" combined calendar, week timetable, and timeline agenda.
  - Automated class reminder email system with configurable institutional sender and dynamic lead durations (15m, 30m, 45m, 1h, 2h, 24h).
  - Dual-role notification system for tracking sent reminders and read states.
  - Faculty Onboarding Directory with verified contact and email routing.

- **Faculty Academic Portal** (`/faculty.html`):
  - Personalized faculty schedule with instant profile switcher.
  - "All Batches" and "All Faculty" institutional views.
  - Dynamic week numbers (`This Week` / `Week 44`) and month scope badges (`October Total`).
  - Faculty notification drawer receiving styled PW MedEd HTML lecture alerts.
  - One-click Google Calendar & Apple/Outlook (.ics) export.
