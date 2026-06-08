#!/bin/bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🚀 DeliverIt Pro — מפעיל..."
echo ""

# עצור תהליכים קודמים
pkill -f "node.*server\.js" 2>/dev/null
pkill -f "vite.*--port 30" 2>/dev/null
sleep 1

# ── Seed — רק בפעם הראשונה (אם אין משתמשים) ───────────────────────────────
USER_COUNT=$(node -e "
  require('dotenv').config({path:'$DIR/backend/.env'});
  const {sequelize,User}=require('$DIR/backend/src/models');
  sequelize.sync().then(async()=>{
    const c=await User.count();
    console.log(c);
    process.exit(0);
  }).catch(()=>{console.log(0);process.exit(0);});
" 2>/dev/null)

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "🌱 יוצר נתוני Demo..."
  node "$DIR/backend/seed.js" > /tmp/di-seed.log 2>&1
  echo "✅ Demo נטען"
fi

# ── Backend ──────────────────────────────────────────────────────────────────
echo "⏳ מפעיל Backend..."
nohup node "$DIR/backend/src/server.js" > /tmp/di-backend.log 2>&1 &

# המתן לbackend
for i in {1..20}; do
  sleep 1
  if curl -s http://localhost:5000/health > /dev/null 2>&1; then break; fi
  if [ $i -eq 20 ]; then
    echo "❌ Backend נכשל! לוגים:"
    tail -20 /tmp/di-backend.log
    exit 1
  fi
done
echo "✅ Backend      → http://localhost:5000"

# ── Frontend apps ────────────────────────────────────────────────────────────
nohup npm run dev --prefix "$DIR/dashboard" -- --port 3002 > /tmp/di-sender.log 2>&1 &
sleep 3 && echo "✅ שולחים       → http://localhost:3002"

nohup npm run dev --prefix "$DIR/courier" -- --port 3004 > /tmp/di-courier.log 2>&1 &
sleep 3 && echo "✅ שליחים       → http://localhost:3004"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🏢 פורטל שולחים:   http://localhost:3002"
echo "     📧 demo@deliverit.com   🔑 demo1234"
echo ""
echo "  🚚 פורטל שליחים:   http://localhost:3004"
echo "     📧 yosi@courier.com     🔑 courier123"
echo ""
echo "  🔑 פנל ניהול (admin): http://localhost:3002"
echo "     📧 admin@deliverit.com  🔑 admin123"
echo ""
echo "  🔧 API + Health:   http://localhost:5000/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  לעצור: Ctrl+C | לוגים: tail -f /tmp/di-backend.log"
echo ""

# פתח בדפדפן
open "http://localhost:3002" 2>/dev/null
sleep 1
open "http://localhost:3004" 2>/dev/null

trap 'echo ""; echo "🛑 עוצר..."; pkill -f "node.*server\.js" 2>/dev/null; pkill -f "vite.*--port 30" 2>/dev/null; exit 0' INT TERM
wait
