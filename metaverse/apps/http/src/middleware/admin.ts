
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../constants";
import { NextFunction, Request, Response } from "express";

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const adminMiddleware = (req:Request,res:Response,next:NextFunction) => {
    const header = req.headers["authorization"];
    const token = header?.split(" ")[1];
    
    if (!token) {
        console.warn(`[AUTH ADMIN] Missing authorization token for ${req.method} ${req.originalUrl}`);
        res.status(403).json({message: "Unauthorized"});
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_PASSWORD) as { role: string, userId: string };
        if (decoded.role !== "Admin") {
            console.warn(`[AUTH ADMIN REJECTED] User ${decoded.userId} has role '${decoded.role}', but 'Admin' required`);
            res.status(403).json({message: "Unauthorized"});
            return;
        }
        req.userId = decoded.userId;
        console.log(`[AUTH ADMIN SUCCESS] Authenticated admin userId: ${decoded.userId}`);
        next();
    } catch(e: any) {
        console.error(`[AUTH ADMIN FAILED] Token verification failed for ${req.method} ${req.originalUrl}:`, e?.message);
        res.status(401).json({message: "Unauthorized"});
        return;
    }
}