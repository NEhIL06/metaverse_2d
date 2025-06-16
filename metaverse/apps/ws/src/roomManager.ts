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
}


