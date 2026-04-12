# FastPass - Parking & Visitor Management System

ระบบจัดการผู้มาติดต่อและที่จอดรถ (Visitor & Parking Management)

## 💻 Tech Stack
- **Frontend:** Angular, Ionic Framework, Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Edge Functions, Auth, Storage)

## ⚙️ Prerequisites
ก่อนรันโปรเจกต์ กรุณาติดตั้งเครื่องมือดังต่อไปนี้:
- Node.js (v18+)
- Ionic CLI (`npm install -g @ionic/cli`)
- Angular CLI (`npm install -g @angular/cli`)
- Supabase CLI (สำหรับรัน Local Backend หรือ Deploy Edge Functions)

## 🚀 How to Run (Local Development)

### 1. การตั้งค่า Environment
\`\`\`typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY'
};
\`\`\`

### 2. รัน Frontend
\`\`\`bash
npm install
ionic serve
\`\`\`

### 3. การจัดการ Supabase Edge Functions
โค้ด API พิเศษจะอยู่ในโฟลเดอร์ \`supabase/functions/\` (รันด้วย Deno)
- รันฟังก์ชันจำลองบนเครื่อง: \`supabase functions serve\`
- Deploy ฟังก์ชันขึ้นเซิร์ฟเวอร์: \`supabase functions deploy <function_name>\`

## 📚 Documentation
- **[API Documentation](./docs/API_DOCS.md):** รายละเอียด Endpoint และ Payload ของ Edge Functions ทั้งหมด
- **Database Schema:** (ถ้ามีภาพ ER Diagram หรืออธิบาย table ให้ใส่ลิงก์ตรงนี้)
