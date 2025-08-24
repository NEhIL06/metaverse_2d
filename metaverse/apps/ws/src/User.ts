import { WebSocket } from "ws";
import { RoomManager } from "./roomManager";
import { OutgoingMessage } from "./types";
import client from "@repo/database/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export class User {
    public id: string;
    public userId?: string;
    private spaceId?: string;
    private x: number;
    private y: number;
    private ws: WebSocket;

    constructor(ws: WebSocket) {
        this.id = getRandomString(10);
        this.x = 0;
        this.y = 0;
        this.ws = ws;
        this.initHandlers()
    }

    initHandlers() {
        this.ws.on("message", async (data) => {
            console.log(data)
            const parsedData = JSON.parse(data.toString());
            console.log(parsedData)
            console.log("parsedData")
            switch (parsedData.type) {
                case "join":
                    console.log("jouin receiverdfd")
                    // we will first check weather the uesr is verified or not
                    const spaceId = parsedData.payload.spaceId;
                    const token = parsedData.payload.token;
                    const userId = (jwt.verify(token, JWT_PASSWORD) as JwtPayload).userId
                    if (!userId) {
                        this.ws.close()
                        return
                    }
                    console.log("jouin receiverdfd 2")
                    this.userId = userId
                    const space = await client.space.findFirst({
                        where: {
                            id: spaceId
                        }
                    })
                    console.log("jouin receiverdfd 3")
                    if (!space) {
                        this.ws.close()
                        return;
                    }
                    console.log("jouin receiverdfd 4")
                    this.spaceId = spaceId
                    RoomManager.getInstance().addUser(spaceId, this);
                    this.x = Math.floor(Math.random() * space.width);
                    this.y = Math.floor(Math.random() * space.height);
                    this.send({
                        type: "space-joined",
                        payload: {
                            spawn: {
                                x: this.x,
                                y: this.y
                            },
                            userId:this.userId,
                            users: RoomManager.getInstance().rooms.get(spaceId)?.filter(x => x.id !== this.id)?.map((u) => ({id: u.id})) ?? []// users ka id jo us room mei hai
                        }
                    });
                    console.log("jouin receiverdf5")
                    RoomManager.getInstance().broadcast({
                        type: "user-joined",
                        payload: {
                            userId: this.userId,
                            x: this.x,
                            y: this.y
                        }
                    }, this, this.spaceId!);
                    break;

                case "move":
                    const moveX = parsedData.payload.x;
                    const moveY = parsedData.payload.y;
                    const xDisplacement = Math.abs(this.x - moveX);
                    const yDisplacement = Math.abs(this.y - moveY);
                    if ((xDisplacement == 1 && yDisplacement== 0) || (xDisplacement == 0 && yDisplacement == 1)) {
                        this.x = moveX;
                        this.y = moveY;
                        RoomManager.getInstance().broadcast({
                            type: "movement",
                            payload: {
                                x: this.x,
                                y: this.y
                            }
                        }, this, this.spaceId!);
                        return;
                    }
                    
                    this.send({
                        type: "movement-rejected",
                        payload: {
                            x: this.x,
                            y: this.y
                        }
                    });
                    break;

                case "groupChat":
                    console.log("groupChat")   
                    const groupId = parsedData.payload.groupId;
                    const message = parsedData.payload.message;
                    RoomManager.getInstance().broadcast({
                        type: "groupChat",
                        payload: {
                            groupId,
                            message
                        }
                    }, this, this.spaceId!);
                    break;

                case "privateChat":
                    const privateChatMessage = parsedData.payload.message;
                    const privateChatUserId = parsedData.payload.userId;
                    const privateChatSpaceId = parsedData.payload.spaceId;
                    RoomManager.getInstance().sendPrivateMessage({
                        type: "privateChat",
                        payload: {
                            message: privateChatMessage,
                            userId: privateChatUserId,
                            spaceId: privateChatSpaceId
                        }
                    }, privateChatUserId, privateChatSpaceId);
                    break;

                case "user:call":
                    console.log("User call from", this.id, "to", parsedData.payload.to);
                    const to = parsedData.payload.to;
                    const offer = parsedData.payload.offer;
                    RoomManager.getInstance().sendOffer({
                        type: "incomming:call",
                        payload: {
                            from: this.id,
                            offer
                        }
                    }, to, this.spaceId!);
                    break;

                case "call:accepted":
                    console.log("Call accepted from", this.id, "to", parsedData.payload.to);
                    const acceptedTo = parsedData.payload.to;
                    const ans = parsedData.payload.ans;
                    RoomManager.getInstance().sendOffer({
                        type: "call:accepted",
                        payload: {
                            from: this.id,
                            ans
                        }
                    }, acceptedTo, this.spaceId!);
                    break;

                case "peer:nego:needed":
                    console.log("peer:nego:needed", parsedData.payload.offer);
                    const negoTo = parsedData.payload.to;
                    const negoOffer = parsedData.payload.offer;
                    RoomManager.getInstance().sendOffer({
                        type: "peer:nego:needed",
                        payload: {
                            from: this.id,
                            offer: negoOffer
                        }
                    }, negoTo, this.spaceId!);
                    break;

                case "peer:nego:done":
                    console.log("peer:nego:done", parsedData.payload.ans);
                    const negoDoneTo = parsedData.payload.to;
                    const negoDoneAns = parsedData.payload.ans;
                    RoomManager.getInstance().sendOffer({
                        type: "peer:nego:final",
                        payload: {
                            from: this.id,
                            ans: negoDoneAns
                        }
                    }, negoDoneTo, this.spaceId!);
                    break;

                case "ice:candidate":
                    console.log("ICE candidate from", this.id, "to", parsedData.payload.to);
                    const iceTo = parsedData.payload.to;
                    const candidate = parsedData.payload.candidate;
                    RoomManager.getInstance().sendOffer({
                        type: "ice:candidate",
                        payload: {
                            from: this.id,
                            candidate
                        }
                    }, iceTo, this.spaceId!);
                    break;

                default:
                    console.log("Unknown message type:", parsedData.type);
                    break;
            }
        });
    }

    destroy() {
        RoomManager.getInstance().broadcast({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        }, this, this.spaceId!);
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }

    send(payload: OutgoingMessage) {
        this.ws.send(JSON.stringify(payload));
    }
}