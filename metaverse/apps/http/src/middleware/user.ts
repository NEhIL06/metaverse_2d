
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../constants";
import { NextFunction, Request, Response } from "express";


export const userMiddleware = (req:Request,res:Response,next:NextFunction) => {
    const header = req.headers["authorization"]; // Extracting the Auth Header here
    const token = header?.split(" ")[1];// Splitting and Getting the token from the Format:{bearer q45143123123123123}
    if(!token){
        res.status(403).json({message:"No Token"});
        return;
    }
    // checking if the token is valid?
    try {
        const decoded = jwt.verify(token,JWT_PASSWORD) as {userId:string,role:string};
        req.userId = decoded.userId;
        next()
    } catch (error) {
        res.status(401).json({message:"Invalid Token"});
        return;
    }
}