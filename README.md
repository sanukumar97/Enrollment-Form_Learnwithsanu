# Enrollment Form — LearnWithSanu IIT

Public-facing multi-step enrollment form for the **LearnWithSanu IIT** coaching platform. No login required — students fill in their details, choose a plan, pay via UPI, and submit.

## Form Flow

5-step wizard with session persistence (resumable if the browser is closed mid-way):

1. **Personal Details** — Name, email, phone, city
2. **Plan Selection** — Active plans fetched live from Supabase
3. **Payment Details** — UPI QR code and UPI ID fetched from Supabase; student uploads payment screenshot
4. **Other Details** — Additional info collected per plan
5. **Remarks** — Any final notes from the student

## Tech Stack

React 18 + TypeScript · Vite 6 · Tailwind CSS v4 · shadcn/ui · Supabase

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the dev server:

```bash
pnpm run dev
```

## Database

Migrations are in `supabase/migrations/`. Run all of them in order in the Supabase SQL Editor before using this form.

The form saves enrollment data incrementally via the `save_enrollment_step` RPC and submits finally via `submit_enrollment` RPC. Plans are read from the `plans` table and UPI details from `payment_settings`.

## Deployment

Deploy to Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings.


