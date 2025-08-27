import { Router } from "express";
import { userRouter } from "./user";
import { spaceRouter } from "./space";
import { adminRouter } from "./admin";
import { SigninSchema, SignupSchema } from "../../types";
import { PrismaClient } from "@prisma/client"
import {hash,compare} from "../../scrypt"
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../constants";

const client = new PrismaClient();


export const router = Router();

router.post("/signup", async (req, res) => {
    console.log("inside signup")
    // check the user

    const parsedData = SignupSchema.safeParse(req.body)
    console.log("parsed data",parsedData)
    if (!parsedData.success) {
        console.log("parsed data incorrect")
        res.status(400).json({message: "Validation failed"})
        return;
    }

    const hashedPassword = await hash(parsedData.data.password)
    console.log("hashed password")

    try {
         const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.type === "admin" ? "Admin" : "User",
            }
        })
        console.log("user created",user)
        res.status(200).json({
            message: "User created successfully",
            username: user.username,
            role: user.role,
            userId: user.id
        })
        return;
    } catch(e) {
        console.log("erroer thrown")
        console.log(e)
        res.status(400).json({message: "User already exists"})
    }
})

router.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(403).json({message: "Validation failed"})
        return;
    }

    try {
        const user = await client.user.findUnique({
            where: {
                username: parsedData.data.username
            }
        })
        
        if (!user) {
            res.status(403).json({message: "User not found"})
            return;
        }
        const isValid = await compare(parsedData.data.password, user.password)

        if (!isValid) {
            res.status(403).json({message: "Invalid password"})
            return;
        }

        const token = jwt.sign({
            userId: user.id,
            role: user.role
        }, JWT_PASSWORD);

        res.json({
            token
        })
        return;
    } catch(e) {
        res.status(400).json({message: "Internal server error"})
    }
})

router.get("/elements", async (req, res) => {
    const elements = await client.element.findMany()

    res.json(elements.map(e=>({
        id: e.id,
        imageUrl: e.imageUrl,
        width: e.width,
        height: e.height,
        static: e.static
    })))
})

router.get("/avatars", async (req, res) => {
    const avatars = await client.avatar.findMany()

    res.json({
        avatars: avatars.map(a=>({
            id: a.id,
            name: a.name,
            imageUrl: a.imageUrl
        }))
    })
})

router.get("/health",(req,res) => {
    res.status(200).json({
        status: "ok"
    })
})

router.use("/user", userRouter)
router.use("/space", spaceRouter)
router.use("/admin", adminRouter)