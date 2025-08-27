import express from 'express';
import { router } from './routes/v1';
import { PrismaClient } from '../../../packages/database/src/generated/prisma'; 
import cors from 'cors';
import { PORT, NODE_ENV } from './constants';

const app = express();

// Configure CORS for production
const corsOrigins = NODE_ENV === 'production' 
  ? [
      'https://metaverse-frontend.onrender.com',
      'https://*.onrender.com' // Allow any Render subdomain
    ] 
  : ['http://localhost:8080', 'http://localhost:5173'];

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(express.json());

app.use("/api/v1", router);

app.listen(PORT, () => {
    console.log(`HTTP API server running on port ${PORT}`);
    console.log(`CORS origins: ${corsOrigins.join(', ')}`);
});