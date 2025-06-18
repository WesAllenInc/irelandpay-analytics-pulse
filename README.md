# IrelandPay Analytics Pulse

## Project info

IrelandPay Analytics Pulse is a merchant analytics dashboard that provides insights into transaction volumes and net profits. The application integrates with Supabase for data storage and retrieval.

## How can I edit this code?

There are several ways of editing your application.

### Use your preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Edit a file directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Next.js 15+ with App Router
- TypeScript
- React 18
- shadcn/ui and Radix UI components
- Tailwind CSS
- Supabase (PostgreSQL database, Storage, Edge Functions, and Authentication)
- Lightweight Charts v3.8.0 and Recharts (for data visualization)
- Zustand (for state management)
- XLSX (for Excel file processing)

## Database Schema

The application uses the following database schema:

### merchants

- `mid` (TEXT, Primary Key): Merchant ID
- `datasource` (TEXT): Source of the merchant data
- `merchant_dba` (TEXT): Merchant's doing business as name

### merchant_metrics

- `mid` (TEXT): Merchant ID (Foreign Key to merchants.mid)
- `month` (DATE): Month of the data
- `total_txns` (INT): Total number of transactions
- `total_volume` (NUMERIC): Total transaction volume
- `source_file` (TEXT): Source file that provided this data
- Primary Key: (mid, month)

### residual_payouts

- `mid` (TEXT): Merchant ID (Foreign Key to merchants.mid)
- `merchant_dba` (TEXT): Merchant's doing business as name
- `payout_month` (DATE): Month of the payout
- `transactions` (INT): Number of transactions
- `sales_amount` (NUMERIC): Total sales amount
- `income` (NUMERIC): Income amount
- `expenses` (NUMERIC): Expenses amount
- `net_profit` (NUMERIC): Net profit
- `bps` (NUMERIC): Basis points
- `commission_pct` (NUMERIC): Commission percentage
- `agent_net` (NUMERIC): Agent net amount
- `source_file` (TEXT): Source file that provided this data
- Primary Key: (mid, payout_month)

## API Endpoints

### Next.js API Routes

- `/api/process-excel`: Processes Excel files for both merchant and residual data
- `/api/process-merchant-excel`: Processes merchant Excel files specifically
- `/api/process-residual-excel`: Processes residual Excel files specifically

### Supabase Edge Functions

- `processMerchantExcel`: Processes merchant Excel files uploaded to Supabase Storage
- `processResidualExcel`: Processes residual Excel files uploaded to Supabase Storage

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL of your Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anonymous key for Supabase authentication
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations (only used in secure server contexts)
- `NEXT_PUBLIC_SUPABASE_PROJECT_ID`: Project ID for Supabase (used in deployment rewrites)

## How can I deploy this project?

### Local Setup & Development

1. Copy `.env.example` to `.env.local` and populate all variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_PROJECT_ID`

1. Deploy Supabase Edge Functions:

   
```bash
npx supabase functions deploy processMerchantExcel
npx supabase functions deploy processResidualExcel
```

1. Install dependencies and start the app:

```bash
npm install
npm run dev
```

### Production Deployment (Vercel)

1. Push your code to a Git repository.
1. In Vercel dashboard, import the project and set environment variables (match `.env.example`).
1. Vercel will run `npm run build` and `npm start` automatically.
1. Ensure `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_APP_URL` are configured in Vercel settings.

## Can I connect a custom domain?

Yes, you can connect a custom domain to your deployed application by configuring it in your hosting provider settings.

For Vercel deployments:

1. Navigate to your project settings in the Vercel dashboard
2. Go to the Domains section
3. Add your custom domain and follow the verification steps
