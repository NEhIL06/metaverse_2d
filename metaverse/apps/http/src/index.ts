import express from 'express';
import { router } from './routes/v1';
import { PrismaClient } from '../../../packages/database/src/generated/prisma'; 
const app = express();
app.use(express.json());
app.use("/api/v1",router)   
app.listen(process.env.PORT || 3000)