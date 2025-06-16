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
            const parsedData = JSON.parse(data.toString());
            console.log("parsedData")
            console.log(parsedData)
            console.log("parsedData")
            switch (parsedData.type) {
                case "join":
                    console.log("joined")
                    const spaceId = parsedData.payload.spaceId;
                    const token = parsedData.payload.token;
                    const userId = (jwt.verify(token, JWT_PASSWORD) as JwtPayload).userId
                    if (!userId) {
                        console.log("userId is undefined")
                        this.ws.close()
                        return;
                    }
                    console.log("jouin receiverdfd 2")
                    this.userId = userId
                    const space = await client.space.findFirst({
                        where: {
                            id: spaceId
                        }
                    })
                    console.log("join receiverdfd 3")
                    if (!space) {
                        console.log("space is undefined")
                        this.ws.close()
                        return;
                    }
                    console.log("join receiverdfd 4")
                    this.spaceId = spaceId
                    RoomManager.getInstance().addUser(spaceId, this);
                    this.x = Math.floor(Math.random() * space?.width);
                    console.log("x:", this.x);
                    this.y = Math.floor(Math.random() * space?.height);
                    console.log("y:", this.y);
                    this.send({
                        type: "space-joined",
                        payload: {
                            spawn: {
                                x: this.x,
                                y: this.y
                            },
                            users: RoomManager.getInstance().rooms.get(spaceId)?.filter(x => x.id !== this.id)?.map((u) => ({id: u.id})) ?? []
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
                    console.log("user Broadcasted")
                    break;
                case "movement":
                    const moveX = parsedData.payload.x;
                    console.log("moveX:", moveX);
                    const moveY = parsedData.payload.y;
                    console.log("moveY:", moveY);
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
                    console.log("movement rejected");
                    this.send({
                        type: "movement-rejected",
                        payload: {
                            x: this.x,
                            y: this.y
                        }
                    });
                    console.log("movement rejected 1");
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
        RoomManager.getInstance().removeUser( this.spaceId!,this);
    }

    send(payload: OutgoingMessage) {
        this.ws.send(JSON.stringify(payload));
    }
}