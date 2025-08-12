// // mongodb.ts
// import { MongoClient, Db } from 'mongodb';

// // MongoDB connection configuration
// const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://esteemshiz:c24psbJct4znQ-W@cluster0.pn2n6eu.mongodb.net/';
// let db: Db;

// // Initialize MongoDB connection
// export async function connectMongo(): Promise<void> {
//   try {
//     const client = new MongoClient(mongoUrl);
//     await client.connect();
//     db = client.db('metaverse');
//     console.log('Connected to MongoDB for chat');
//   } catch (error) {
//     console.error('MongoDB connection error:', error);
//     throw error;
//   }
// }

// // Save a message to MongoDB
// export async function saveMessage(message: {
//   type: 'public' | 'private';
//   spaceId?: string;
//   senderId: string;
//   recipientId?: string;
//   content: string;
//   timestamp: Date;
// }): Promise<void> {
//   try {
//     await db.collection('messages').insertOne(message);
//   } catch (error) {
//     console.error('Error saving message:', error);
//     throw error;
//   }
// }