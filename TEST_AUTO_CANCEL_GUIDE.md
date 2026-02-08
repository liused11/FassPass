# วิธีใช้งาน test_auto_cancel.sql

## 📋 ข้อมูลที่ต้องมีก่อนรัน Test

Test script นี้จะใช้ข้อมูลที่มีอยู่ในฐานข้อมูลของคุณอัตโนมัติ:

```sql
-- Script จะ query IDs เหล่านี้จากฐานข้อมูล:
(SELECT id FROM parking_sites LIMIT 1)  -- ใช้ site แรก
(SELECT id FROM floors LIMIT 1)         -- ใช้ floor แรก  
(SELECT id FROM slots LIMIT 1 OFFSET n) -- ใช้ slots ต่างๆ
```

### ถ้าฐานข้อมูลว่าง จะเกิดอะไรขึ้น?

❌ Test จะ fail เพราะไม่สามารถสร้าง reservations ได้ (Foreign Key constraint)

### วิธีแก้ไข: ใช้ Static IDs

ถ้าคุณรู้ IDs ที่ใช้จริงในระบบ สามารถแก้ไขได้:

```sql
-- แทนที่:
parking_site_id: (SELECT id FROM parking_sites LIMIT 1)

-- ด้วย:
parking_site_id: 'CMU-SITE-001'  -- ID จริงของคุณ
```

## 🚀 วิธีรัน Test

### ขั้นตอนที่ 1: เปิด Supabase SQL Editor
1. เข้า Supabase Dashboard
2. ไปที่ **SQL Editor**
3. สร้าง **New Query**

### ขั้นตอนที่ 2: Copy-Paste ไฟล์ทั้งหมด
```sql
-- Copy ทั้งหมดจากไฟล์ test_auto_cancel.sql
-- Paste ลง SQL Editor
```

### ขั้นตอนที่ 3: Run
กด **Run** หรือ **Ctrl+Enter**

## 📊 ผลลัพธ์ที่คาดหวัง

### Console Output (Messages Tab):
```
=== TEST 1: Basic Functionality (20 minutes expired) ===
Before auto-cancel: Reservation status = pending
After auto-cancel: Reservation status = cancelled, updated_at = 2026-02-05...
✓ TEST 1 PASSED: Reservation was cancelled
✓ Audit log created: 1 entries

=== TEST 2: Boundary Test (14 minutes - should NOT cancel) ===
✓ TEST 2 PASSED: 14-minute reservation still pending

=== TEST 3: Boundary Test (16 minutes - SHOULD cancel) ===
✓ TEST 3 PASSED: 16-minute reservation was cancelled

=== TEST 4: Status Filter (non-pending should be ignored) ===
✓ TEST 4 PASSED: Non-pending reservations were ignored

=== SUMMARY OF ALL TEST RESERVATIONS ===
=== CLEANUP ===
✓ Test data cleaned up
=== ALL TESTS COMPLETED ===
```

### Query Results Tab:
จะเห็นตารางแสดงข้อมูล:
- ผลของ `SELECT auto_cancel_expired_pending_reservations()`
- สรุป reservations ทั้งหมด
- Audit logs

## 🔧 Troubleshooting

### Error: Foreign key violation
```
ERROR: insert or update on table "reservations" violates foreign key constraint
```

**สาเหตุ:** ฐานข้อมูลไม่มี parking_sites, floors, หรือ slots

**วิธีแก้:**
1. ตรวจสอบว่ามีข้อมูลในตาราง:
```sql
SELECT COUNT(*) FROM parking_sites;
SELECT COUNT(*) FROM floors;
SELECT COUNT(*) FROM slots;
```

2. ถ้าไม่มีข้อมูล ให้ใช้ IDs ที่มีอยู่จริง หรือสร้างข้อมูล test:
```sql
-- สร้าง test parking site
INSERT INTO parking_sites (id, name, code, status)
VALUES ('test-site', 'Test Site', 'TS01', 'active');

-- สร้าง test building
INSERT INTO buildings (id, parking_site_id, name)
VALUES ('test-bld', 'test-site', 'Test Building');

-- สร้าง test floor
INSERT INTO floors (id, building_id, name)
VALUES ('test-floor', 'test-bld', 'Floor 1');

-- สร้าง test zone
INSERT INTO zones (id, floor_id, name)
VALUES ('test-zone', 'test-floor', 'Zone A');

-- สร้าง test slots
INSERT INTO slots (id, zone_id, parking_site_id, floor_id, name, status)
VALUES 
  ('test-slot-1', 'test-zone', 'test-site', 'test-floor', 'A-001', 'available'),
  ('test-slot-2', 'test-zone', 'test-site', 'test-floor', 'A-002', 'available'),
  ('test-slot-3', 'test-zone', 'test-site', 'test-floor', 'A-003', 'available'),
  ('test-slot-4', 'test-zone', 'test-site', 'test-floor', 'A-004', 'available'),
  ('test-slot-5', 'test-zone', 'test-site', 'test-floor', 'A-005', 'available');
```

### Error: User ID not found
```
ERROR: insert or update on table "reservations" violates foreign key constraint "reservations_user_id_fkey"
```

**สาเหตุ:** User ID `00000000-0000-0000-0000-000000000001` ไม่มีในตาราง users

**วิธีแก้:**
1. ใช้ user_id ที่มีอยู่จริง:
```sql
-- หา user_id จริง
SELECT id FROM auth.users LIMIT 1;

-- แก้ไขในไฟล์ test_auto_cancel.sql:
user_id: 'YOUR-ACTUAL-USER-ID'
```

หรือ

2. สร้าง test user:
```sql
INSERT INTO public.users (id, email, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@test.com', 'active'::user_status)
ON CONFLICT DO NOTHING;
```

### Test แสดง WARNING แทน PASSED

ตรวจสอบว่า:
1. ✅ Function `auto_cancel_expired_pending_reservations()` ถูกสร้างแล้ว
2. ✅ Table `reservations_history` มีอยู่
3. ✅ Permissions ถูกต้อง

รัน:
```sql
-- ตรวจสอบ function
SELECT proname FROM pg_proc WHERE proname = 'auto_cancel_expired_pending_reservations';

-- ทดสอบ function โดยตรง
SELECT auto_cancel_expired_pending_reservations();
```

## 📝 หมายเหตุ

- ✓ Test จะ cleanup ข้อมูล test อัตโนมัติ (ถ้าต้องการเก็บไว้ ให้ comment ส่วน CLEANUP)
- ✓ สามารถรัน test ซ้ำได้ไม่จำกัด (มี `ON CONFLICT` handling)
- ✓ Test ไม่กระทบข้อมูลจริงในระบบ (ใช้ UUIDs เฉพาะ)

## 🎯 Next Steps หลังรัน Test สำเร็จ

1. ✅ Test ผ่านแล้ว → Deploy Edge Function
2. ✅ Setup GitHub Actions
3. ✅ Monitor ผลใน production
