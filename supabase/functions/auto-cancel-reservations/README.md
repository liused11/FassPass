# Auto-Cancel Reservations Edge Function

## Overview
This Supabase Edge Function automatically cancels parking reservations that remain in `pending` status for more than 15 minutes after their `start_time`.

## Deployment

### 1. Deploy the Function
```bash
# Make sure you're in the project root
cd d:\FastPass\DEMOFastPass\DEMOFastPass

# Login to Supabase (if not already)
supabase login

# Link to your project (replace with your project ref)
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy auto-cancel-reservations
```

### 2. Set Environment Variables
In Supabase Dashboard → Edge Functions → auto-cancel-reservations:
- `CRON_SECRET`: A secret key for scheduled cron calls (generate a random string)

Or via CLI:
```bash
supabase secrets set CRON_SECRET=your-random-secret-key
```

## Scheduling Options

### Option A: GitHub Actions (Recommended)
Create `.github/workflows/auto-cancel-cron.yml`:

```yaml
name: Auto-Cancel Expired Reservations

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  trigger-auto-cancel:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            -H "x-api-key: ${{ secrets.CRON_SECRET }}" \
            https://your-project-ref.supabase.co/functions/v1/auto-cancel-reservations
```

Add `CRON_SECRET` to GitHub Secrets.

### Option B: Vercel Cron / Cloudflare Workers
Use any external cron service to call:
```
POST https://your-project-ref.supabase.co/functions/v1/auto-cancel-reservations
Headers:
  x-api-key: your-cron-secret
```

### Option C: Manual Trigger (for testing)
```bash
curl -X POST \
  -H "x-api-key: your-cron-secret" \
  https://your-project-ref.supabase.co/functions/v1/auto-cancel-reservations
```

## Testing

### Local Testing
```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve auto-cancel-reservations

# Test in another terminal
curl -X POST \
  -H "x-api-key: test-secret" \
  http://localhost:54321/functions/v1/auto-cancel-reservations
```

### Test with Sample Data
See `test_auto_cancel.sql` for creating test reservations.

## Monitoring

Check function logs:
```bash
supabase functions logs auto-cancel-reservations
```

Or in Supabase Dashboard → Edge Functions → Logs

## Security Notes
- The function uses `service_role` key internally (elevated privileges)
- External calls must provide `x-api-key` matching `CRON_SECRET`
- Keep `CRON_SECRET` secure and rotate periodically
