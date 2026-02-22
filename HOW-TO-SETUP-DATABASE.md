# Database setup (2 steps)

## 1. Put your database password in `.env`

Open the file **`.env`** in this folder. Find this line:

```env
DATABASE_URL=postgresql://postgres:PUT_YOUR_DB_PASSWORD_HERE@db.vqrmqgbmqlhqnjlalokd.supabase.co:5432/postgres?sslmode=require
```

Replace **`PUT_YOUR_DB_PASSWORD_HERE`** with your **Supabase database password** (the one you set in Supabase → Project Settings → Database). If you don’t remember it, use **Reset database password** on that same page.

Save the file.

## 2. Run setup

In the project folder, in PowerShell or Command Prompt:

```bash
npm run db:setup
```

You should see:

```
✅ Schema applied successfully.
✅ Demo user created: phone 9876543210, password demo1234
✅ Sample reports added.
✅ Database seed complete.
```

Done. Login with phone **9876543210**, password **demo1234**.

For **Vercel**: add the same `DATABASE_URL` (with your real password) and `JWT_SECRET` in Environment Variables, then redeploy.
