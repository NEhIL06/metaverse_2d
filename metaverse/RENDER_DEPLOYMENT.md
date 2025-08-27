# Deploy Metaverse Services on Render

This guide will help you deploy each service (HTTP API, WebSocket, Frontend) separately on Render with your PostgreSQL database.

## Prerequisites

- ✅ Render account
- ✅ PostgreSQL database created on Render
- ✅ Your code pushed to GitHub
- ✅ Database connection string: `postgresql://metaverse_or64_user:9CrDeuHDJdZP3PkS3jdbTef8laibzTLj@dpg-d2n1lrndiees73bg376g-a/metaverse_or64`

## Database Setup

1. **Verify Database Connection**
   - Go to Render Dashboard → Your PostgreSQL database
   - Copy the **Internal Database URL** (you already have this)
   - Test connection if needed

2. **Database Migrations**
   - Migrations will run automatically during service builds
   - Each service has its own Prisma schema and will create tables

## Service 1: HTTP API

### Create Web Service
1. **New Web Service**
   - **Name**: `metaverse-http-api`
   - **Repository**: Your GitHub repo
   - **Root Directory**: `metaverse/apps/http`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Environment Variables
```
NODE_ENV=production
PORT=3000
JWT_PASSWORD=your-secure-jwt-secret-here
DATABASE_URL=postgresql://metaverse_or64_user:9CrDeuHDJdZP3PkS3jdbTef8laibzTLj@dpg-d2n1lrndiees73bg376g-a/metaverse_or64
```

### Deploy
- Click **Create Web Service**
- Wait for build to complete (includes Prisma client generation and migrations)
- Note the service URL (e.g., `https://metaverse-http-api.onrender.com`)

## Service 2: WebSocket Server

### Create Web Service
1. **New Web Service**
   - **Name**: `metaverse-websocket`
   - **Repository**: Your GitHub repo
   - **Root Directory**: `metaverse/apps/ws`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Environment Variables
```
NODE_ENV=production
PORT=8000
JWT_PASSWORD=your-secure-jwt-secret-here
DATABASE_URL=postgresql://metaverse_or64_user:9CrDeuHDJdZP3PkS3jdbTef8laibzTLj@dpg-d2n1lrndiees73bg376g-a/metaverse_or64
```

### Deploy
- Click **Create Web Service**
- Wait for build to complete (includes Prisma client generation and migrations)
- Note the service URL (e.g., `https://metaverse-websocket.onrender.com`)

## Service 3: Frontend

### Create Static Site
1. **New Static Site**
   - **Name**: `metaverse-frontend`
   - **Repository**: Your GitHub repo
   - **Root Directory**: `metaverse/apps/nexus-office-env`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### Environment Variables
```
VITE_API_URL=https://metaverse-http-api.onrender.com/api/v1
VITE_WS_URL=wss://metaverse-websocket.onrender.com
```

### Deploy
- Click **Create Static Site**
- Wait for build to complete
- Note the site URL (e.g., `https://metaverse-frontend.onrender.com`)

## Important Notes

### JWT Secret
- **Use the same JWT_PASSWORD** for both HTTP API and WebSocket services
- Generate a secure random string (e.g., use a password generator)
- Never commit this to Git

### Database URL
- Use the **Internal Database URL** from Render
- This ensures services can connect to the database within Render's network

### CORS Configuration
- The HTTP API is configured to allow your frontend domain
- Updated to automatically allow Render subdomains

### Build Process
- Each service now has its own Prisma schema
- Build process includes: `prisma generate`, `prisma migrate deploy`, and `esbuild`
- No more workspace dependency issues

## Verification Steps

1. **HTTP API Health Check**
   ```
   GET https://metaverse-http-api.onrender.com/api/v1/health
   Expected: {"status": "ok"}
   ```

2. **Frontend Loads**
   - Visit your frontend URL
   - Should see the sign-in page

3. **Database Connection**
   - Check service logs for database connection success
   - Look for "Prisma Client" initialization messages
   - Verify tables are created

4. **WebSocket Connection**
   - Sign up/sign in on frontend
   - Create or join a space
   - Check browser console for WebSocket connection

## Troubleshooting

### Build Failures
- Check that all dependencies are in `package.json`
- Verify Node.js version (>=18)
- Check build logs for specific errors
- Ensure DATABASE_URL is correct

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is running
- Ensure migrations have run (check build logs)

### CORS Errors
- Verify frontend URL is in CORS configuration
- Check environment variables are set correctly

### WebSocket Connection Issues
- Verify WebSocket URL uses `wss://` in production
- Check WebSocket service is running
- Ensure JWT tokens are valid

## Service URLs Summary

After deployment, you should have:

- **Frontend**: `https://metaverse-frontend.onrender.com`
- **HTTP API**: `https://metaverse-http-api.onrender.com`
- **WebSocket**: `https://metaverse-websocket.onrender.com`
- **Database**: `postgresql://metaverse_or64_user:...`

## Next Steps

1. Deploy all three services
2. Test the complete flow:
   - Sign up/sign in
   - Create spaces
   - Join spaces
   - Real-time chat and movement
3. Monitor service logs for any errors
4. Set up monitoring and alerts if needed

## Cost Optimization

- **Free Tier**: Services sleep after 15 minutes of inactivity
- **Paid Plans**: Services stay running 24/7
- **Database**: Consider upgrading for persistent storage and better performance
