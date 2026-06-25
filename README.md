This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Web Push Notifications (PWA)

App da ho tro Web Push de nhac khi so tu den han on tap lon hon 50.

### 1) Tao VAPID keys

```bash
npx web-push generate-vapid-keys
```

Them vao `.env.local`:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

Tu chon bao mat cron:

```bash
PUSH_CRON_SECRET=your-secret
```

### 2) Chay migration

```bash
npm run db:migrate
```

Migration moi: `drizzle/0001_push_subscriptions.sql`

### 3) Cron de gui push nen

Da cau hinh cron Vercel trong `vercel.json`:

- `*/30 * * * *` goi `GET /api/cron/push-due-reminder`

Neu ban set `PUSH_CRON_SECRET` hoac `CRON_SECRET`, endpoint cron can secret qua:

- Header `Authorization: Bearer <secret>`
- Hoac header `x-cron-secret: <secret>`
- Hoac query `?secret=<secret>`

### 4) Dang ky push tren client

Client se:

- dang ky `public/sw.js`
- xin quyen thong bao (permission)
- tao push subscription va gui len server

Khi push den, service worker se hien thong bao va mo `"/review"` khi nguoi dung bam vao thong bao.
