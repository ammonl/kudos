# Kudos

Kudos is a lightweight internal tool for recognizing team members by sending kudos. It integrates with Slack and email to notify recipients and track engagement. Built using Supabase, Vite, and React.

## Features

- 🎉 Send kudos to individuals or teams
- 🏆 Track weekly stats and leaderboard
- 🔔 Automated Slack and email notifications
- 🕒 Weekly reminder system
- 📊 Admin dashboard and user settings

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (Database + Auth + Edge Functions)
- **Notifications:** Slack API + SendGrid API (email)
- **Deployment:** Azure Static Web App (frontend) + Supabase (backend)
- **Authentication:** Google OAuth
- **Client:** Giphy + OpenAI

## Getting Started

### Prerequisites

- Node.js and npm
- Supabase project (with Database, Auth, and Edge Functions)
- Slack Bot Token (for notifications)
- SendGrid API key
- Google OAuth 2.0 Client ID (for user login)
- Giphy and OpenAI API keys (for Give Kudos page)

### Setup

	1. Clone the repository:

```bash
git clone https://github.com/ammonl/kudos.git
cd kudos

	2.	Install dependencies:

npm install

	3.	Configure environment variables:

Create an .env file in the root and populate:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_GIPHY_API_KEY=your-giphy-api-key
VITE_SLACK_CLIENT_ID=create-a-slack-client-id
VITE_APP_URL=https://kudos.ammonlarson.com

Also set these in Supabase edge function environment:

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SLACK_BOT_TOKEN=
SENDGRID_API_KEY=
APP_URL=https://kudos.ammonlarson.com

	4.	Start the dev server:

npm run dev

	5.	Deploy frontend to an Azure Static Web App.
	6.	Deploy Supabase edge functions:

supabase functions deploy process-notifications
supabase functions deploy schedule-weekly-reminders

	7.	Schedule cron jobs via Supabase SQL:

-- Every 5 minutes
select cron.schedule('*/5 * * * *', 'select process_pending_notifications();');

-- Every Monday 9am
select cron.schedule('0 9 * * 1', 'select schedule_weekly_reminders();');