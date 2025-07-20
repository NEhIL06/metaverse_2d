// index.ts
import { WebSocketServer } from 'ws';
import { User } from './User';
import { connectMongo } from './db/mongodb';
import {createClient} from "redis";
const redis = createClient({
    username: 'default',
    password: 'OEw0VMQ4p5X4Xv2zDUJePIOj3jlLmw7Z',
    socket: {
        host: 'redis-18925.c305.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 18925
    }
});

async function setup() {
  await redis.connect();
};
setup();

// Initialize WebSocket server
export const wss = new WebSocketServer({ port: 8080 });

// Connect to MongoDB for chat
connectMongo().catch((err) => console.error('MongoDB connection failed:', err));

wss.on('connection', (wss) => {
  // Create new User instance for each connection
  const user = new User(wss);
  wss.on('error', console.error);
  wss.on('close', () => {
    user.destroy();
  });
});

console.log('WebSocket server running on ws://localhost:8080');