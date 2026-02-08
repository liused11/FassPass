# Auto-Cancellation Feature - Deployment Guide

## 📋 Overview
ระบบยกเลิกการจองอัตโนมัติสำหรับการจองที่มีสถานะ `pending` เกิน 15 นาทีหลังจาก `start_time`

## 🚀 การติดตั้ง (Deployment Steps)

### ขั้นตอนที่ 1: Deploy Database Function

1. เปิด **Supabase Dashboard** → SQL Editor
2. รันไฟล์ `migration_auto_cancel.sql`:
   ```sql
   -- Copy และ paste เนื้อหาจากไฟล์ migration_auto_cancel.sql
   ```
3. ตรวจสอบว่า function ถูกสร้างสำเร็จ:
   ```sql
   SELECT auto_cancel_expired_pending_reservations();
   -- ควร return 0 (ถ้าไม่มีการจองที่หมดเวลา)
   ```

### ขั้นตอนที่ 2: Deploy Supabase Edge Function

1. ติดตั้ง Supabase CLI (ถ้ายังไม่มี):
   ```powershell
   # Windows
   scoop install supabase
   # หรือ
   npm install -g supabase
   ```

2. Login และ Link Project:
   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Deploy Edge Function:
   ```powershell
   cd d:\FastPass\DEMOFastPass\DEMOFastPass
   supabase functions deploy auto-cancel-reservations
   ```

4. Set Environment Variables:
   ```powershell
   # สร้าง random secret key สำหรับ CRON_SECRET
   supabase secrets set CRON_SECRET=YOUR_RANDOM_SECRET_KEY_HERE
   ```

### ขั้นตอนที่ 3: Setup GitHub Actions Scheduling

1. เปิด GitHub Repository → Settings → Secrets and variables → Actions
2. เพิ่ม Secrets ต่อไปนี้:
   - `CRON_SECRET`: ค่าเดียวกับที่ set ใน Supabase
   - `SUPABASE_FUNCTION_URL`: 
     ```
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-cancel-reservations
     ```

3. Commit และ Push ไฟล์ `.github/workflows/auto-cancel-cron.yml`

4. ตรวจสอบ Workflow:
   - ไปที่ GitHub → Actions tab
   - จะเห็น workflow "Auto-Cancel Expired Reservations"
   - สามารถ trigger manually ได้ที่ "Run workflow"

## ✅ การทดสอบ (Testing)

### ทดสอบ Manual

1. รันไฟล์ `test_auto_cancel.sql` ใน Supabase SQL Editor
2. ตรวจสอบผลลัพธ์:
   - ✓ การจองที่หมดเวลา 20 นาทีถูกยกเลิก
   - ✓ การจองที่หมดเวลา 14 นาทียังคงเป็น pending
   - ✓ การจองที่หมดเวลา 16 นาทีถูกยกเลิก
   - ✓ Audit log ถูกสร้างใน `reservations_history`

### ทดสอบผ่าน Angular App

```typescript
// ใน component หรือ service
async testAutoCancel() {
  const count = await this.reservationService.cleanupExpiredReservations();
  console.log(`Cancelled ${count} reservations`);
}
```

### ทดสอบ Edge Function

```powershell
# ทดสอบ via curl
curl -X POST `
  -H "x-api-key: YOUR_CRON_SECRET" `
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-cancel-reservations
```

Expected Response:
```json
{
  "success": true,
  "cancelled_count": 0,
  "timestamp": "2026-02-04T16:59:44.000Z",
  "message": "Successfully cancelled 0 expired pending reservation(s)"
}
```

## 📊 Monitoring

### ดู Logs ของ Edge Function
```powershell
supabase functions logs auto-cancel-reservations
```

หรือดูใน Supabase Dashboard → Edge Functions → Logs

### ดู History ของ GitHub Actions
1. GitHub → Actions
2. เลือก workflow "Auto-Cancel Expired Reservations"
3. ดู run history และ logs

### ตรวจสอบการยกเลิกในฐานข้อมูล
```sql
-- ดูการจองที่ถูกยกเลิกล่าสุด
SELECT 
    r.id,
    r.slot_id,
    r.start_time,
    r.updated_at,
    rh.description
FROM reservations r
JOIN reservations_history rh ON r.id = rh.reservation_id
WHERE r.status = 'cancelled'
  AND rh.description LIKE '%Auto-cancelled%'
ORDER BY r.updated_at DESC
LIMIT 10;
```

## 🔧 Configuration

### ปรับความถี่ของ Auto-Cancel

แก้ไขไฟล์ `.github/workflows/auto-cancel-cron.yml`:

```yaml
on:
  schedule:
    - cron: '*/5 * * * *'  # ทุก 5 นาที
    # - cron: '*/10 * * * *'  # ทุก 10 นาที
    # - cron: '0 * * * *'  # ทุกชั่วโมง
```

### ปรับเวลาหมดอายุ

แก้ไขไฟล์ `auto_cancel_expired_pending_reservations.sql`:

```sql
WHERE status = 'pending'
  AND start_time + INTERVAL '15 minutes' < NOW()
  -- เปลี่ยนเป็น '30 minutes', '10 minutes' ตามต้องการ
```

จากนั้นรัน migration ใหม่

## 🔐 Security Notes

- `CRON_SECRET` ควรเป็น random string ยาวอย่างน้อย 32 characters
- อย่า commit secrets ลง Git
- Function ใช้ `SECURITY DEFINER` เพื่อรันด้วย elevated privileges
- Edge Function ตรวจสอบ authentication ก่อนทำงาน

## ❓ Troubleshooting

### Problem: Edge Function ไม่ทำงาน
```powershell
# ตรวจสอบ logs
supabase functions logs auto-cancel-reservations --tail

# ตรวจสอบ secrets
supabase secrets list
```

### Problem: GitHub Actions ไม่ trigger
1. ตรวจสอบว่า workflow file อยู่ใน `.github/workflows/`
2. ตรวจสอบ Secrets ใน GitHub
3. ลอง trigger manually ก่อน

### Problem: Database Function ไม่พบ
```sql
-- ตรวจสอบว่า function มีอยู่
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'auto_cancel_expired_pending_reservations';
```

## 📝 Files Created

- `auto_cancel_expired_pending_reservations.sql` - Database function
- `migration_auto_cancel.sql` - Complete migration script
- `test_auto_cancel.sql` - Comprehensive tests
- `supabase/functions/auto-cancel-reservations/index.ts` - Edge function
- `supabase/functions/auto-cancel-reservations/README.md` - Edge function docs
- `.github/workflows/auto-cancel-cron.yml` - GitHub Actions workflow
- `DEPLOYMENT.md` - This file

## ✨ Features Implemented

✅ Auto-cancel pending reservations after 15 minutes
✅ Audit logging to `reservations_history`
✅ Scheduled execution via GitHub Actions (every 5 minutes)
✅ Manual trigger via Angular service
✅ Secure authentication for Edge Function
✅ Comprehensive testing suite
✅ Monitoring and logging
