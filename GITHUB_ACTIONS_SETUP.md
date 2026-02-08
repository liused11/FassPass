# GitHub Actions Setup - Updated for Service Role Key

## 🔑 GitHub Secrets ที่ต้องเพิ่ม

ไปที่ GitHub Repository → **Settings** → **Secrets and variables** → **Actions**

### Secret 1: SUPABASE_SERVICE_ROLE_KEY

**ค่า:** Service Role Key จาก Supabase

**วิธีหา:**
1. เปิด Supabase Dashboard
2. Settings → API
3. มองหา **Project API keys**
4. Copy `service_role` key (ขึ้นต้นด้วย `eyJ...`)

**เพิ่ม Secret:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Secret: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc...` (service_role key ของคุณ)

### Secret 2: SUPABASE_FUNCTION_URL

**ค่า:** URL ของ Edge Function

- Name: `SUPABASE_FUNCTION_URL`
- Secret: `https://unxcjdypaxxztywplqdv.supabase.co/functions/v1/auto-cancel-reservations`

---

## ✅ Checklist

- [ ] เพิ่ม `SUPABASE_SERVICE_ROLE_KEY` secret
- [ ] เพิ่ม `SUPABASE_FUNCTION_URL` secret
- [ ] Commit และ Push workflow file ที่อัปเดตแล้ว
- [ ] ทดสอบ manual trigger

---

## 🧪 ทดสอบ Manual Trigger

1. GitHub → Actions tab
2. เลือก "Auto-Cancel Expired Reservations"
3. คลิก "Run workflow"
4. ดู logs ว่า success (สีเขียว)

---

## 📝 หมายเหตุ

**ทำไมเปลี่ยนจาก CRON_SECRET เป็น service_role key?**

- ✅ Service role key ทำงานได้ทันที (ทดสอบแล้ว)
- ✅ ไม่ต้อง set environment variable
- ✅ Supabase จัดการ key ให้เอง
- ✅ ปลอดภัยเท่ากัน (เก็บใน GitHub Secrets)

**CRON_SECRET ยังใช้ได้ไหม?**

ถ้าต้องการใช้ CRON_SECRET อนาคต ยังสามารถใช้ได้ แต่ต้อง debug ว่าทำไม env variable ไม่ work
