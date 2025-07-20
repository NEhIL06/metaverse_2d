// apps/ws/src/roomManager.ts
// Updated RoomManager to include a method for getting nearby users based on position.
// This is used for proximity checks in chat and voice signaling.
// We use Euclidean distance for proximity calculation, with a configurable threshold.

import { OutgoingMessage } from "./types";
import type { User } from "./User";

export class RoomManager {
    rooms: Map<string, User[]> = new Map();
    static instance:RoomManager;

    private constructor(){
        this.rooms = new Map();
    }
    static getInstance(){
        if(!this.instance){
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    public addUser(spaceId:string, user:User){
        if(!this.rooms.has(spaceId)){
            this.rooms.set(spaceId, []);
            return;
        }
        this.rooms.set(spaceId, [...(this.rooms.get(spaceId))??[], user]);
    }    

    public removeUser(spaceId:string, user:User){
        if(!this.rooms.has(spaceId)){
            return;
        }
        this.rooms.set(spaceId, (this.rooms.get(spaceId)?.filter((u) => u.id !== user.id) ?? []));
    }   

    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
    if (!this.rooms.has(roomId)) {
        console.warn(`No room found for roomId: ${roomId}`);
        return;
    }
    const users = this.rooms.get(roomId) ?? [];
    console.log(`Broadcasting ${message.type} to ${users.length} users in room ${roomId}`);
    users.forEach((u) => {
        if (u.id !== user.id) {
            console.log(`Sending ${message.type} to user ${u.id}`);
            u.send(message);
        }
    });
}

    // New method to get nearby users based on position
    // Calculates Euclidean distance and filters users within the threshold.
    // Excludes the reference user if their position matches (though caller should handle self-exclusion).
    // Threshold defaults to 5 units for proximity-based features.
    public getNearbyUsers(spaceId: string, x: number, y: number, threshold: number = 5): User[] {
        const users = this.rooms.get(spaceId) ?? [];
        return users.filter(u => {
            const dx = u.x - x;
            const dy = u.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= threshold && (u.x !== x || u.y !== y); // Exclude exact position match (self)
        });
    }
}