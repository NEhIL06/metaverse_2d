
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../constants";
import { NextFunction, Request, Response } from "express";


export const userMiddleware = (req:Request,res:Response,next:NextFunction) => {
    const header = req.headers["authorization"]; // Extracting the Auth Header here
    const token = header?.split(" ")[1]; // Splitting Bearer <token>
    if(!token){
        console.warn(`[AUTH USER] Missing authorization token for ${req.method} ${req.originalUrl}`);
        res.status(403).json({message:"No Token"});
        return;
    }
    // checking if the token is valid
    try {
        const decoded = jwt.verify(token,JWT_PASSWORD) as {userId:string,role:string};
        req.userId = decoded.userId;
        console.log(`[AUTH USER SUCCESS] Authenticated userId: ${decoded.userId}, role: ${decoded.role}`);
        next();
    } catch (error: any) {
        console.error(`[AUTH USER FAILED] Invalid token for ${req.method} ${req.originalUrl}:`, error?.message);
        res.status(401).json({message:"Invalid Token"});
        return;
    }
}