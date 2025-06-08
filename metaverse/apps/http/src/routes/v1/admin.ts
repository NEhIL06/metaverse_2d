import { Router } from "express";
import { adminMiddleware } from "../../middleware/admin";
import { CreateElementSchema, UpdateElementSchema,CreateAvatarSchema,CreateMapSchema} from "../../types";
import client from "@repo/database/client";
import { userMiddleware } from "../../middleware/user";
export const adminRouter = Router();

adminRouter.post("/element",adminMiddleware,async (req,res)=>{
    const parsedData = CreateElementSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(400).json(parsedData.error);
        return;
    }

    const element = await client.element.create({
        data:{
            imageUrl: parsedData.data.imageUrl,
            width: parsedData.data.width,
            height: parsedData.data.height,
            static: parsedData.data.static,
        }
    })
    
    res.json({id: element.id}) 
})

adminRouter.put("/element/:elementId",adminMiddleware,async (req,res)=>{
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(400).json(parsedData.error);
        return;
    }

    await client.element.update({
        where: {
            id: req.params.elementId
        },
        data: {
            imageUrl: parsedData.data.imageUrl,
        }
    })

    res.status(200).json({message:"Success"})
})

adminRouter.post("/avatar",userMiddleware, async (req, res) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body)
    if (!parsedData.success) {
        console.log("parsed data incorrect")
        res.status(400).json({message: "Validation failed"})
        return
    }
    const avatar = await client.avatar.create({
        data: {
            name: parsedData.data.name,
            imageUrl: parsedData.data.imageUrl
        }
    })
    console.log("AvatarId:" + avatar.id)
    res.json({avatarId: avatar.id})
})

adminRouter.post("/map",adminMiddleware,async (req,res)=>{
    const parsedData = CreateMapSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(400).json(parsedData.error);
        return;
    }

    const map = await client.map.create({
        data:{
            name: parsedData.data.name,
            thumbnail: parsedData.data.thumbnail,
            width: parseInt(parsedData.data.dimensions.split("x")[0]),
            height: parseInt(parsedData.data.dimensions.split("x")[1]),
            mapElements: {
                create: parsedData.data.defaultElements.map(e=>({
                    elementId: e.elementId,
                    x: e.x,
                    y: e.y
                }))
            }
        }
    })

    res.json({id: map.id})
})