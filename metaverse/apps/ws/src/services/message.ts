// message.ts
import Redis from 'ioredis';
import { WebSocket } from 'ws';
import { saveMessage } from '../db/mongodb';
import { PublicMessagePayload, PrivateMessagePayload } from '../types';
import { wss } from '..';

// Initialize Redis client
import {createClient} from "redis";
const redis = createClient({ // Don't bother I have deleted this.
    username: 'default',
    password: 'OEw0VMQ4p5X4Xv2zDUJePIOj3jlLmw7Z',
    socket: {
        host: 'redis-18925.c305.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 18925
    }
});

async function setup() {
  await redis.connect();
}
// Handle public message: broadcast to all users in the space
export async function handlePublicMessage(
  ws: WebSocket,
  roomManager: any, // Use existing RoomManager
  payload: PublicMessagePayload,
  senderId: string,
): Promise<void> {
  // Validate payload
  if (!payload.spaceId || !payload.content) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid public message payload' } }));
    return;
  }

  // Save message to MongoDB
  const message = {
    type: 'public' as const,
    spaceId: payload.spaceId,
    senderId,
    content: payload.content,
    timestamp: new Date(),
  };
  await saveMessage(message);

  // Broadcast to all users in the space using RoomManager
  roomManager.broadcast(
    {
      type: 'public-message',
      payload: message,
    },
    { id: senderId }, // Pass sender as User-like object
    payload.spaceId,
  );

  // Send to sender to confirm delivery
  ws.send(JSON.stringify({ type: 'public-message', payload: message }));
}

// Handle private message: send to sender and recipient
export async function handlePrivateMessage(
  ws: WebSocket,
  payload: PrivateMessagePayload,
  senderId: string,
): Promise<void> {
  // Validate payload
  if (!payload.recipientId || !payload.content) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid private message payload' } }));
    return;
  }

  // Save message to MongoDB
  const message = {
    type: 'private' as const,
    senderId,
    recipientId: payload.recipientId,
    content: payload.content,
    timestamp: new Date(),
  };
  await saveMessage(message);

  // Get recipient's WebSocket ID from Redis
  const recipientWsId = await redis.get(`user:${payload.recipientId}`);

  // Send to sender
  ws.send(JSON.stringify({ type: 'private-message', payload: message }));

  // Send to recipient if online
  if (recipientWsId) {
    wss.clients.forEach((client: any) => {
      const clientId = client._socket.remoteAddress + ':' + client._socket.remotePort;
      if (client.readyState === WebSocket.OPEN && clientId === recipientWsId) {
        client.send(JSON.stringify({ type: 'private-message', payload: message }));
      }
    });
  }
}
