# DeliverIt Pro — מדריך פרסום לאינטרנט

## דרישות מוקדמות
- חשבון GitHub (חינם)
- חשבון Railway (חינם / $5 חודש) — https://railway.app
- חשבון Vercel (חינם) — https://vercel.com

---

## שלב 1 — GitHub

```bash
gh auth login
cd ~/DeliverIt
gh repo create deliverit-pro --public --source=. --remote=origin --push
```

---

## שלב 2 — Railway (Backend + PostgreSQL)

1. railway.app → "New Project" → "Deploy from GitHub" → `deliverit-pro`
2. Root Directory: `backend`
3. New → Database → PostgreSQL
4. Variables → הוסף:

```
NODE_ENV=production
JWT_SECRET=<צור עם: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
DATABASE_URL=<אוטומטי מ-Railway>
CORS_ORIGIN=<URLs של Vercel מופרדים בפסיק>

# אופציונלי:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=DeliverIt <noreply@deliverit.co.il>
FRONTEND_URL=https://deliverit-dashboard.vercel.app
```

---

## שלב 3 — Vercel (Dashboard + Courier)

### Dashboard (שולחים)
1. vercel.com → "Add New Project" → Import `deliverit-pro`
2. Root Directory: `dashboard`
3. Environment Variables:
   ```
   VITE_API_URL=https://YOUR-BACKEND.railway.app/api
   ```
4. Deploy

### Courier (שליחים)
1. vercel.com → "Add New Project" → Import `deliverit-pro`
2. Root Directory: `courier`
3. Environment Variables:
   ```
   VITE_API_URL=https://YOUR-BACKEND.railway.app/api
   ```
4. Deploy

---

## שלב 4 — Seed נתוני Demo (פעם אחת)

```bash
cd ~/DeliverIt/backend
DATABASE_URL="postgresql://user:pass@host/db" NODE_ENV=production node seed.js
```

---

## שלב 5 — דומיין מותאם

### Vercel
- Settings → Domains → Add: `deliverit.co.il`
- עדכן DNS: CNAME → `cname.vercel-dns.com`

### Railway
- Settings → Domains → Custom Domain: `api.deliverit.co.il`

---

## URLs סופיים לדוגמה

| שירות | URL |
|-------|-----|
| 🏢 שולחים | https://deliverit.co.il |
| 🚚 שליחים | https://courier.deliverit.co.il |
| 🔧 API | https://api.deliverit.co.il |

---

## עדכון אחרי שינויים

```bash
cd ~/DeliverIt
git add -A
git commit -m "update: תיאור השינוי"
git push
```
Railway + Vercel מ-deploy אוטומטית בכל push!

---

## תמחור

| שירות | עלות |
|-------|------|
| Railway (backend + DB) | $5/חודש (Hobby) |
| Vercel (dashboard + courier) | חינם |
| דומיין (.co.il / .app) | ~$12/שנה |
| **סה"כ** | **~$5/חודש + דומיין** |
