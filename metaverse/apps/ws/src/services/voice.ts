// voice.ts
import Redis from 'ioredis';
import { WebSocket } from 'ws';
import { VoiceOfferPayload, VoiceAnswerPayload, VoiceIceCandidatePayload } from '../types';
import { wss } from '..';

// Initialize Redis client
import {createClient} from "redis";
const redis = createClient({ // I have deleted this don't bother :)
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
setup();

// Initialize WebSocket server
// Calculate Euclidean distance between two users
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Handle WebRTC offer: Route to nearby users
export async function handleVoiceOffer(
  ws: WebSocket,
  roomManager: any,
  payload: VoiceOfferPayload,
  senderId: string,
  senderX: number,
  senderY: number,
): Promise<void> {
  // Validate payload
  if (!payload.spaceId || !payload.sdp) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid voice offer payload' } }));
    return;
  }

  // Get users in the space
  const users = roomManager.rooms.get(payload.spaceId) || [];
  const proximityThreshold = 5; // Voice chat enabled for users within 5 units

  // Store sender's position in Redis
  await redis.set(`position:${senderId}`, JSON.stringify({ x: senderX, y: senderY }));

  // Check proximity for each user in the space
  for (const user of users) {
    if (user.userId === senderId) continue; // Skip sender
    const position = await redis.get(`position:${user.userId}`);
    if (!position) continue;

    const { x: otherX, y: otherY } = JSON.parse(position);
    const distance = calculateDistance(senderX, senderY, otherX, otherY);

    if (distance <= proximityThreshold) {
      // Send offer to nearby user
      user.send({
        type: 'voice-offer',
        payload: {
          senderId,
          sdp: payload.sdp,
        },
      });
    }
  }
}

// Handle WebRTC answer: Route to sender
export async function handleVoiceAnswer(
  ws: WebSocket,
  payload: VoiceAnswerPayload,
  senderId: string,
): Promise<void> {
  // Validate payload
  if (!payload.recipientId || !payload.sdp) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid voice answer payload' } }));
    return;
  }

  // Get recipient's WebSocket ID
  const recipientWsId = await redis.get(`user:${payload.recipientId}`);
  if (recipientWsId) {
    wss.clients.forEach((client:any) => {
      const clientId = client._socket.remoteAddress + ':' + client._socket.remotePort;
      if (client.readyState === WebSocket.OPEN && clientId === recipientWsId) {
        client.send(
          JSON.stringify({
            type: 'voice-answer',
            payload: {
              senderId,
              sdp: payload.sdp,
            },
          }),
        );
      }
    });
  }
}

// Handle ICE candidate: Route to target user
export async function handleVoiceIceCandidate(
  ws: WebSocket,
  payload: VoiceIceCandidatePayload,
  senderId: string,
): Promise<void> {
  // Validate payload
  if (!payload.recipientId || !payload.candidate) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid ICE candidate payload' } }));
    return;
  }

  // Get recipient's WebSocket ID
  const recipientWsId = await redis.get(`user:${payload.recipientId}`);
  if (recipientWsId) {
    wss.clients.forEach((client:any) => {
      const clientId = client._socket.remoteAddress + ':' + client._socket.remotePort;
      if (client.readyState === WebSocket.OPEN && clientId === recipientWsId) {
        client.send(
          JSON.stringify({
            type: 'voice-ice-candidate',
            payload: {
              senderId,
              candidate: payload.candidate,
            },
          }),
        );
      }
    });
  }
}
