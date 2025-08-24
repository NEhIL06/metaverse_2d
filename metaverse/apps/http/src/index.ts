import express from 'express';
import { router } from './routes/v1';
import { PrismaClient } from '../../../packages/database/src/generated/prisma'; 
import cors from 'cors';
const app = express();

app.use(cors({
    origin: ['http://localhost:8080','http://localhost:5173'], // Allow your frontend's origin
}));
app.use(express.json());

app.use("/api/v1",router)   

app.listen(3000)