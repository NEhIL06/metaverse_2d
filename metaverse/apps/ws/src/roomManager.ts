import type { User } from "./User";
import { OutgoingMessage } from "./types";

export class RoomManager {
    rooms: Map<string, User[]> = new Map();
    static instance: RoomManager;

    private constructor() {
        this.rooms = new Map();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    public removeUser(user: User, spaceId: string) {
        if (!this.rooms.has(spaceId)) {
            return;
        }
        this.rooms.set(spaceId, (this.rooms.get(spaceId)?.filter((u) => u.userId !== user.userId) ?? []));
    }

    public addUser(spaceId: string, user: User) {
        if (!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user]);
            return;
        }
        this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);
    }

    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
        if (!this.rooms.has(roomId)) {
            return;
        }
        this.rooms.get(roomId)?.forEach((u) => {
            if (u.userId !== user.userId) {
                u.send(message);
            }
        });
    }

    public sendPrivateMessage(message: OutgoingMessage, userId: string, spaceId: string): boolean {
        // Validate inputs
        if (!spaceId || !userId) {
          console.error(`Invalid input: spaceId=${spaceId}, userId=${userId}`);
          return false;
        }
    
        // Check if the room exists
        const room = this.rooms.get(spaceId);
        if (!room) {
          console.warn(`Room not found for spaceId: ${spaceId}`);
          return false;
        }
    
        // Find the target user
        let targetUser: User | undefined;
        for (const user of room) {
          if (user.userId === userId) {
            targetUser = user;
            break;
          }
        }
    
        // Check if the user was found
        if (!targetUser) {
          console.warn(`User not found: userId=${userId} in spaceId=${spaceId}`);
          return false;
        }
    
        try {
          // Serialize the message if needed (e.g., for WebSocket)
          const serializedMessage = JSON.stringify(message);
          console.log(`Sending private message to user ${userId} in space ${spaceId}:`, serializedMessage);
          
          // Send the message
          targetUser.send(serializedMessage);
          return true;
        } catch (error) {
          console.error(`Failed to send private message to user ${userId} in space ${spaceId}:`, error);
          return false;
        }
      }
    
    public sendOffer(message: OutgoingMessage, userId: string, spaceId: string) {
        if(!this.rooms.has(spaceId)) {
            return;
        }
        this.rooms.get(spaceId)?.forEach((u) => {
            if (u.userId === userId) {
                u.send(message);
            }
        });
    }
}