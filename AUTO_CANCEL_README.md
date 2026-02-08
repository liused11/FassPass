# FastPass Auto-Cancellation Feature

## 📋 Quick Start

ระบบยกเลิกการจองอัตโนมัติสำหรับการจองที่ค้างอยู่เกิน 15 นาที

### Files Overview

```
DEMOFastPass/
├── auto_cancel_expired_pending_reservations.sql  # Database function
├── migration_auto_cancel.sql                     # Migration script
├── test_auto_cancel.sql                          # Test suite
├── DEPLOYMENT.md                                 # Deployment guide (Thai)
│
├── supabase/functions/auto-cancel-reservations/
│   ├── index.ts                                  # Edge Function
│   └── README.md                                 # Edge Function docs
│
├── .github/workflows/
│   └── auto-cancel-cron.yml                      # GitHub Actions scheduler
│
└── src/app/services/
    └── reservation.service.ts                    # Angular service (updated)
```

### Quick Deploy

```powershell
# 1. Database
# Run migration_auto_cancel.sql in Supabase SQL Editor

# 2. Edge Function
supabase functions deploy auto-cancel-reservations
supabase secrets set CRON_SECRET=your-random-secret

# 3. GitHub Actions
# Add secrets: CRON_SECRET, SUPABASE_FUNCTION_URL
# Push .github/workflows/auto-cancel-cron.yml

# 4. Test
# Run test_auto_cancel.sql
```

### Testing

```sql
-- Quick test
SELECT auto_cancel_expired_pending_reservations();
```

```powershell
# Test Edge Function
curl -X POST -H "x-api-key: YOUR_SECRET" https://YOUR_PROJECT.supabase.co/functions/v1/auto-cancel-reservations
```

### Documentation

- 📖 [DEPLOYMENT.md](file:///d:/FastPass/DEMOFastPass/DEMOFastPass/DEPLOYMENT.md) - Full deployment guide (Thai)
- 📝 [Walkthrough](file:///C:/Users/atsad/.gemini/antigravity/brain/71b20733-9654-4637-8596-ad6ccbac0126/walkthrough.md) - Architecture & implementation details
- 🧪 [test_auto_cancel.sql](file:///d:/FastPass/DEMOFastPass/DEMOFastPass/test_auto_cancel.sql) - Comprehensive tests

### How It Works

1. **GitHub Actions** runs every 5 minutes
2. Calls **Supabase Edge Function** with authentication
3. Edge Function triggers **database function**
4. Database function cancels pending reservations 15+ minutes past start_time
5. Logs all cancellations to `reservations_history`

### Monitoring

```sql
-- Check recent cancellations
SELECT * FROM reservations WHERE status = 'cancelled' ORDER BY updated_at DESC LIMIT 10;

-- View audit log
SELECT * FROM reservations_history WHERE description LIKE '%Auto-cancelled%' ORDER BY timestamp DESC;
```

```powershell
# View Edge Function logs
supabase functions logs auto-cancel-reservations
```

---

**Status:** ✅ Ready for deployment
**Architecture:** Serverless (Supabase Edge Functions + GitHub Actions)
**Security:** API key authentication, audit logging
