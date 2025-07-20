// User.ts
import { WebSocket } from 'ws';
import { RoomManager } from './roomManager';
import { OutgoingMessage, MessageType, JoinPayload, MovePayload, PublicMessagePayload, PrivateMessagePayload, VoiceOfferPayload, VoiceAnswerPayload, VoiceIceCandidatePayload } from './types';
import client from '@repo/database/client';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_PASSWORD } from './config';
import { handlePublicMessage, handlePrivateMessage } from './services/message';
import { handleVoiceOffer, handleVoiceAnswer, handleVoiceIceCandidate } from './services/voice';

import {createClient} from "redis";
const redis = createClient({ // Don't bother I have deleted this
    
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
//const redis = new Redis(process.env.REDIS_URL || 'redis://default:OEw0VMQ4p5X4Xv2zDUJePIOj3jlLmw7Z@redis-18925.c305.ap-south-1-1.ec2.redns.redis-cloud.com:18925');

function getRandomString(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export class User {
  public id: string; // Unique connection ID
  public userId?: string; // Authenticated user ID from JWT
  public spaceId?: string; // Current space ID
  public x: number; // X position in space
  public y: number; // Y position in space
  public ws: WebSocket; // WebSocket connection

  constructor(ws: WebSocket) {
    this.id = getRandomString(10);
    this.x = 0;
    this.y = 0;
    this.ws = ws;
    this.initHandlers();
    
  }

  initHandlers() {
    this.ws.on('message', async (data) => {
      try {
        const parsedData: { type: MessageType; payload: any } = JSON.parse(data.toString());
        console.log('Received message:', parsedData);

        switch (parsedData.type) {
          case 'join':
            // Handle user joining a space
            const { spaceId, token } = parsedData.payload as JoinPayload;
            const decoded = jwt.verify(token, JWT_PASSWORD) as JwtPayload;
            if (!decoded.userId) {
              console.log('Invalid userId in token');
              this.ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid token' } }));
              this.ws.close();
              return;
            }
            this.userId = decoded.userId;
            const space = await client.space.findFirst({
              where: { id: spaceId },
            });
            if (!space) {
              console.log('Space not found:', spaceId);
              this.ws.send(JSON.stringify({ type: 'error', payload: { message: 'Space not found' } }));
              this.ws.close();
              return;
            }
            this.spaceId = spaceId;
            // Store WebSocket connection in Redis
            await redis.set(`user:${this.userId}`, this.id);
            await redis.sAdd(`space:${spaceId}:users`, this.userId!);
            // Randomly assign position within space dimensions
            this.x = Math.floor(Math.random() * space.width);
            this.y = Math.floor(Math.random() * space.height);
            // Store position in Redis for proximity checks
            await redis.set(`position:${this.userId}`, JSON.stringify({ x: this.x, y: this.y }));
            // Add user to RoomManager
            RoomManager.getInstance().addUser(spaceId, this);
            // Send space-joined response
            this.send({
              type: 'space-joined',
              payload: {
                spawn: { x: this.x, y: this.y },
                users: RoomManager.getInstance()
                  .rooms.get(spaceId)
                  ?.filter((u) => u.id !== this.id)
                  ?.map((u) => ({ id: u.userId })) ?? [],
              },
            });
            // Broadcast user-joined to others
            RoomManager.getInstance().broadcast(
              {
                type: 'user-joined',
                payload: { userId: this.userId, x: this.x, y: this.y },
              },
              this,
              this.spaceId!,
            );
            break;

          case 'movement':
            // Handle user movement
            const { x: moveX, y: moveY } = parsedData.payload as MovePayload;
            const xDisplacement = Math.abs(this.x - moveX);
            const yDisplacement = Math.abs(this.y - moveY);
            // Validate movement: single block and within space bounds
            const spaceData = await client.space.findFirst({ where: { id: this.spaceId } });
            if (
              !spaceData ||
              moveX >= spaceData.width ||
              moveY >= spaceData.height ||
              (xDisplacement === 1 && yDisplacement !== 0) ||
              (yDisplacement === 1 && xDisplacement !== 0) ||
              (xDisplacement > 1 || yDisplacement > 1)
            ) {
              console.log('Movement rejected:', { moveX, moveY, x: this.x, y: this.y });
              this.send({
                type: 'movement-rejected',
                payload: { x: this.x, y: this.y },
              });
              return;
            }
            this.x = moveX;
            this.y = moveY;
            // Update position in Redis
            await redis.set(`position:${this.userId}`, JSON.stringify({ x: this.x, y: this.y }));
            // Broadcast movement
            RoomManager.getInstance().broadcast(
              {
                type: 'movement',
                payload: { userId: this.userId, x: this.x, y: this.y },
              },
              this,
              this.spaceId!,
            );
            break;

          case 'public-message':
            // Handle public chat message
            await handlePublicMessage(
              this.ws,
              RoomManager.getInstance(),
              parsedData.payload as PublicMessagePayload,
              this.userId!,
            );
            break;

          case 'private-message':
            // Handle private chat message
            await handlePrivateMessage(
              this.ws,
              parsedData.payload as PrivateMessagePayload,
              this.userId!,
            );
            break;

          case 'voice-offer':
            // Handle WebRTC voice offer
            await handleVoiceOffer(
              this.ws,
              RoomManager.getInstance(),
              parsedData.payload as VoiceOfferPayload,
              this.userId!,
              this.x,
              this.y,
            );
            break;

          case 'voice-answer':
            // Handle WebRTC voice answer
            await handleVoiceAnswer(
              this.ws,
              parsedData.payload as VoiceAnswerPayload,
              this.userId!,
            );
            break;

          case 'voice-ice-candidate':
            // Handle WebRTC ICE candidate
            await handleVoiceIceCandidate(
              this.ws,
              parsedData.payload as VoiceIceCandidatePayload,
              this.userId!,
            );
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        this.ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
      }
    });
  }

  destroy() {
    // Clean up when user disconnects
    if (this.userId && this.spaceId) {
      RoomManager.getInstance().broadcast(
        {
          type: 'user-left',
          payload: { userId: this.userId },
        },
        this,
        this.spaceId,
      );
      RoomManager.getInstance().removeUser(this.spaceId, this);
      // Remove from Redis
      redis.del(`user:${this.userId}`);
      redis.del(`position:${this.userId}`);
      redis.sRem(`space:${this.spaceId}:users`, this.userId);
    }
  }

  send(payload: OutgoingMessage) {
    // Send message to this user's WebSocket
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}
