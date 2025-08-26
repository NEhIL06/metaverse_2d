# Deploying Metaverse on Render

This guide will help you deploy your Turborepo metaverse project on Render.

## Prerequisites

- A Render account
- Your code pushed to a Git repository (GitHub, GitLab, etc.)
- Node.js 18+ and pnpm installed locally for testing

## Architecture

The deployment consists of 3 services:

1. **HTTP API** - Express.js REST API (Port 3000)
2. **WebSocket Server** - Real-time communication (Port 8000)  
3. **Frontend** - Vite + React static site
4. **Database** - PostgreSQL (managed by Render)

## Step 1: Create the Database

1. Go to Render Dashboard → New → PostgreSQL
2. Name: `metaverse-db`
3. Database: `metaverse`
4. User: `metaverse`
5. Note down the connection string

## Step 2: Deploy Services

### Option A: Using Render Blueprint (Recommended)

1. Connect your repository to Render
2. Create a new **Blueprint** instance
3. Render will automatically detect the `render.yaml` file
4. All services will be created automatically

### Option B: Manual Deployment

#### HTTP API Service

1. **New Web Service**
   - **Name**: `metaverse-http-api`
   - **Repository**: Your Git repo
   - **Root Directory**: `metaverse`
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm --filter http start`

2. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_PASSWORD=<generate-secure-random-string>
   DATABASE_URL=<your-postgres-connection-string>
   ```

#### WebSocket Service

1. **New Web Service**
   - **Name**: `metaverse-websocket`
   - **Repository**: Your Git repo
   - **Root Directory**: `metaverse`
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm --filter ws start`

2. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=8000
   JWT_PASSWORD=<same-as-http-api>
   DATABASE_URL=<your-postgres-connection-string>
   ```

#### Frontend Service

1. **New Static Site**
   - **Name**: `metaverse-frontend`
   - **Repository**: Your Git repo
   - **Root Directory**: `metaverse`
   - **Build Command**: `pnpm install && pnpm --filter nexus-office-env build`
   - **Publish Directory**: `apps/nexus-office-env/dist`

2. **Environment Variables**:
   ```
   VITE_API_URL=https://metaverse-http-api.onrender.com
   VITE_WS_URL=wss://metaverse-websocket.onrender.com
   ```

## Step 3: Update Environment Variables

After all services are deployed, update the frontend environment variables with the actual service URLs:

1. Go to your frontend service settings
2. Update the environment variables:
   ```
   VITE_API_URL=https://your-http-api-service.onrender.com
   VITE_WS_URL=wss://your-websocket-service.onrender.com
   ```
3. Redeploy the frontend service

## Step 4: Database Migration

The database migrations will run automatically during the build process via the `postbuild` script.

If you need to run migrations manually:

```bash
# From the monorepo root
pnpm --filter @repo/database migrate
```

## Step 5: Verify Deployment

1. **Frontend**: Visit your frontend URL
2. **API Health Check**: `https://your-api-url.onrender.com/api/v1/health`
3. **Database**: Check Render dashboard for database status

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version (>=18)
   - Check build logs for specific errors

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check database is running
   - Ensure migrations have run

3. **CORS Errors**
   - Verify frontend URL is in CORS configuration
   - Check environment variables are set correctly

4. **WebSocket Connection Issues**
   - Verify WebSocket URL uses `wss://` in production
   - Check WebSocket service is running
   - Ensure JWT tokens are valid

### Logs

Check service logs in Render dashboard:
- Build logs show compilation errors
- Runtime logs show application errors
- Database logs show connection issues

## Security Notes

1. **JWT Secret**: Use a strong, randomly generated secret
2. **Database**: Use Render's managed PostgreSQL
3. **Environment Variables**: Never commit secrets to Git
4. **CORS**: Only allow your frontend domain

## Scaling

- **Free Tier**: Services sleep after 15 minutes of inactivity
- **Paid Plans**: Services stay running 24/7
- **Database**: Upgrade to paid plan for persistent storage

## Monitoring

- Use Render's built-in monitoring
- Set up health checks for your services
- Monitor database connections and performance

## Cost Optimization

- Use free tier for development/testing
- Upgrade only when needed for production
- Monitor usage in Render dashboard

