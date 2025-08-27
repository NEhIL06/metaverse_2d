# 🚀 Render Deployment Checklist

## ✅ Pre-deployment
- [ ] Code pushed to GitHub
- [ ] PostgreSQL database created on Render
- [ ] Database connection string copied

## 🔧 Service 1: HTTP API
- [ ] Create Web Service
- [ ] Name: `metaverse-http-api`
- [ ] Root Directory: `metaverse/apps/http`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Environment Variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3000`
  - [ ] `JWT_PASSWORD=<secure-random-string>`
  - [ ] `DATABASE_URL=<your-postgres-url>`
- [ ] Deploy and note URL

## 🔧 Service 2: WebSocket
- [ ] Create Web Service
- [ ] Name: `metaverse-websocket`
- [ ] Root Directory: `metaverse/apps/ws`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Environment Variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=8000`
  - [ ] `JWT_PASSWORD=<same-as-http>`
  - [ ] `DATABASE_URL=<your-postgres-url>`
- [ ] Deploy and note URL

## 🔧 Service 3: Frontend
- [ ] Create Static Site
- [ ] Name: `metaverse-frontend`
- [ ] Root Directory: `metaverse/apps/nexus-office-env`
- [ ] Build Command: `npm install && npm run build`
- [ ] Publish Directory: `dist`
- [ ] Environment Variables:
  - [ ] `VITE_API_URL=https://<http-api-url>/api/v1`
  - [ ] `VITE_WS_URL=wss://<websocket-url>`
- [ ] Deploy and note URL

## 🧪 Verification
- [ ] HTTP API health check: `GET /api/v1/health`
- [ ] Frontend loads without errors
- [ ] Sign up/sign in works
- [ ] WebSocket connects in browser console
- [ ] Database migrations completed

## 📝 Notes
- Use same JWT_PASSWORD for both backend services
- Update frontend env vars after backend URLs are known
- Check service logs for any errors
- Monitor database connections
