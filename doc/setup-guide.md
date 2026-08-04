# Setup Guide — Mild-R Fanclub Website

คำสั่งติดตั้ง Tech Stack ตามที่กำหนดใน `.cursorrules`  
รันทีละบล็อกตามลำดับ (ยืนยันก่อนรันจริงตาม workflow ของโปรเจกต์)

> Stack: Next.js (App Router) + TypeScript · Tailwind CSS · GSAP · shadcn/ui · lucide-react

---

## 1. Create Next.js App (App Router + TypeScript + Tailwind)

จากโฟลเดอร์โปรเจกต์ปัจจุบัน (หรือสร้างใหม่แล้วย้ายไฟล์ doc / rules เข้าไป):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack
```

หมายเหตุ:
- ใช้ `.` เพื่อ scaffold ในโฟลเดอร์ปัจจุบัน (จะถามยืนยันถ้าโฟลเดอร์ไม่ว่าง)
- ได้ `src/app`, Tailwind, และ TypeScript ตาม stack

ถ้าต้องการสร้างในโฟลเดอร์ย่อยแทน:

```bash
npx create-next-app@latest mild-r-fanclub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack
cd mild-r-fanclub
```

---

## 2. Install GSAP (+ React integration)

```bash
npm install gsap @gsap/react
```

- `gsap` — core + plugins เช่น `ScrollTrigger`
- `@gsap/react` — `useGSAP` hook สำหรับ lifecycle ที่ปลอดภัยใน React / Next.js

---

## 3. Install lucide-react

```bash
npm install lucide-react
```

---

## 4. Initialize shadcn/ui

```bash
npx shadcn@latest init
```

ตอน init เลือกค่าที่เข้ากับโปรเจกต์ (แนะนำ):
- Style / base color ตามดีไซน์ที่จะทำทีหลัง
- CSS variables: **Yes**
- App Router + `src/` ตามที่ scaffold ไว้แล้ว

จากนั้นเพิ่มคอมโพเนนต์ฐานที่ใช้บ่อย:

```bash
npx shadcn@latest add button card dialog
```

เพิ่มคอมโพเนนต์อื่นทีหลังได้ตามต้องการ เช่น:

```bash
npx shadcn@latest add separator sheet navigation-menu
```

---

## 5. (Optional) Utility already expected by shadcn

shadcn มักพึ่ง `clsx` + `tailwind-merge` ผ่าน helper `cn()` ใน `src/lib/utils.ts`  
ถ้า `init` ยังไม่ติดตั้งให้ครบ:

```bash
npm install clsx tailwind-merge class-variance-authority
```

---

## 6. Verify install

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ตรวจว่า Next.js + Tailwind ทำงาน

ตรวจว่า dependency หลักอยู่ใน `package.json`:
- `next`, `react`, `react-dom`
- `gsap`, `@gsap/react`
- `lucide-react`
- packages ที่ shadcn ใช้ (`class-variance-authority`, `clsx`, `tailwind-merge`, ฯลฯ)

---

## 7. Folder stubs (หลัง scaffold)

สร้างโฟลเดอร์ตาม `doc/project-structure.md` ถ้ายังไม่มี:

```bash
mkdir -p public/assets/{layers,images,icons,fonts}
mkdir -p src/components/{ui,animations,sections,layout}
mkdir -p src/{data,hooks,lib,types}
```

วางไฟล์ mock data ที่:

```
src/data/vtuber-data.ts
```

---

## One-shot reference (after Next.js exists)

```bash
npm install gsap @gsap/react lucide-react clsx tailwind-merge class-variance-authority
npx shadcn@latest init
npx shadcn@latest add button card dialog
```

---

## Do NOT install (stack lock)

- Material UI / Chakra / Bootstrap / Ant Design
- Framer Motion (ใช้ GSAP เป็นหลักสำหรับ scrollytelling / parallax)
- CSS-in-JS ที่ไม่จำเป็นและขัดกับแนวทาง Tailwind + GSAP
