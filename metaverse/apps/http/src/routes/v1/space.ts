import { Router } from "express";
import {CreateSpaceSchema,AddElementSchema, DeleteElementSchema } from "../../types";
import { PrismaClient } from "@prisma/client"
import { userMiddleware  } from "../../middleware/user";
import { adminMiddleware } from "../../middleware/admin";
export const spaceRouter = Router();
const client = new PrismaClient();

spaceRouter.get("/all",adminMiddleware,async(req,res)=>{
    console.log("asdasfsagafdasd") ;

    try {
        const spaces = await client.space.findMany({
            where: {
                creatorId: req.userId!
            }
        });
        console.log("spaces found", spaces.length);
        res.json({
            spaces: spaces.map(s => ({
                id: s.id,
                name: s.name,
                thumbnail: s.thumbnail,
                dimensions: `${s.width}x${s.height}`,
            }))
        })
    } catch (error) {
        console.log(error)
        res.status(400).json({message:"Internal server error"})
    }

    console.log("fdsfgdhgfdfgffsdgdfgfg");
})

spaceRouter.post("/",adminMiddleware,async(req,res)=>{
    const parsedData = CreateSpaceSchema.safeParse(req.body) // simple ZOD validation 
    if(!parsedData.success){
        console.log("parsed data incorrect")
        res.status(400).json(parsedData.error);
        return;
    }
    if(!parsedData.data.mapId){  // Empty Space is being Created
        console.log("empty space being created")
        const space = await client.space.create({
            data: {
                name: parsedData.data.name,
                width: parseInt(parsedData.data.dimensions.split("x")[0]),
                height: parseInt(parsedData.data.dimensions.split("x")[1]),
                creatorId: req.userId as string
            }
        }) 
        console.log("Empty space created")
        res.send({ spaceId: space.id })
        return;
    }
    // Checking if the map exists and Getting the Map elements and Ids from the Database to create the Space
    console.log("Finding a match on MAP ID")
    const map = await client.map.findUnique({ 
        where: {
            id: parsedData.data.mapId
        },select:{
            mapElements:true,
            width: true,
            height: true
        }
    })    
    if(!map){
        console.log("Map not found")
        res.status(400).json({message:"Map not found"})
        return;
    }
    console.log("Map found Initializing Transaction")
    // A transaction is created to create the space and the elements both simulatenously if either fails neither the space is created nor the space Elements
    let space = await client.$transaction(async() => {
        console.log("Transaction for first operation started")
        const space = await client.space.create({
            data: {
                name: parsedData.data.name,
                width: map.width,
                height: map.height,
                creatorId: req.userId as string
            }
        })
        console.log("Space created")
        await client.spaceElements.createMany({
            data: map.mapElements.map(e=>{
                return {
                    spaceId: space.id,
                    elementId: e.elementId,
                    x: e.x!,
                    y: e.y!
                }
            })
        })
        console.log("Space Elements created")   
        return space; 
    })   
    console.log("Transaction completed")
    res.send({ spaceId: space.id });
})


spaceRouter.delete("/:spaceId",userMiddleware,async(req,res)=>{
    const spaceId = req.params.spaceId;
    if(!spaceId){
        res.status(400).json({message:"Space not found"})
        return;
    }
    const space = await client.space.findUnique({
        where: {
            id: req.params.spaceId
        },select:{
            creatorId: true
        }
    })
    if(!space){ 
        res.status(400).json({message:"Space not found"})
        return;
    }
    if(req.userId !== space.creatorId ){
        console.log("Unauthorized")
        res.status(403).json({message:"Unauthorized"})
        return;
    }
    await client.space.delete({
        where: {
            id: req.params.spaceId
        }
    })
    res.status(200).json({message:"Success"})

})

spaceRouter.get("/:spaceId",userMiddleware,async(req,res)=>{
    const space = await client.space.findUnique({
        where: {
            id: req.params.spaceId
        },include:{
            elements:{
                include:{
                    element:true
                }
            }
        }
    })

    if(!space?.height || !space?.width){
        res.status(400).json({message:"Space not found"})
        return;
    }
    res.json({
        dimensions: `${space.width}x${space.height}`,
        elements: space.elements.map(e=>({
            id: e.id,
            elements:{
                id: e.element.id,
                imageUrl: e.element.imageUrl,
                width: e.element.width,
                height: e.element.height,   
                static: e.element.static
            },
            x: e.x,
            y: e.y,
        }))
    })
})

spaceRouter.post("/element",userMiddleware,async(req,res)=>{
    const parsedData = AddElementSchema.safeParse(req.body);
    console.log(parsedData)
    if(!parsedData.success){
        res.status(400).json(parsedData.error);
        return;
    }
    console.log("parsed data correct")
    const space = await client.space.findUnique({ // client in space take search for Unique Like this Is how this thing Happends
        where: {
            id: req.body.spaceId,
            creatorId: req.userId
        },select:{
            width: true,
            height: true,
        }
    })
    console.log("space found")
    if(!space){
        res.status(400).json({message:"Space not found"})
        return;
    }
    const elementRes = await client.spaceElements.create({
        data:{
            elementId: parsedData.data.elementId,
            spaceId: parsedData.data.spaceId,
            x: parsedData.data.x,
            y: parsedData.data.y,     
        }
    })
    console.log("element added " + elementRes.id)
    console.log("element added")
    res.status(200).json({message:"Element added"});
})

spaceRouter.delete("/element",adminMiddleware,async(req,res)=>{
    const parsedData = DeleteElementSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(400).json(parsedData.error);
        return;
    }
    const spaceElements = await client.spaceElements.findFirst({
        where: {
            id:parsedData.data.id,
        },include:{
            space:true
        }
    })
    if( !spaceElements?.space.creatorId || spaceElements.space.creatorId !== req.userId){
        res.status(403).json({message:"Unauthorized"})
        return;
    }
    await client.spaceElements.delete({
        where:{
            id:parsedData.data.id
        }
    })
    res.status(200).json({message:"Element deleted"})
})




