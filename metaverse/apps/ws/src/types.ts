// types.ts
export type MessageType =
  | 'join'
  | 'movement'
  | 'space-joined'
  | 'user-joined'
  | 'user-left'
  | 'movement-rejected'
  | 'public-message' // Chat: Public message in a space
  | 'private-message' // Chat: Private message to a user
  | 'voice-offer' // WebRTC: Offer for voice chat
  | 'voice-answer' // WebRTC: Answer for voice chat
  | 'voice-ice-candidate' // WebRTC: ICE candidate exchange
  | 'error';

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
}

export interface JoinPayload {
  spaceId: string;
  token: string;
}

export interface MovePayload {
  x: number;
  y: number;
}

export interface PublicMessagePayload {
  spaceId: string;
  content: string;
}

export interface PrivateMessagePayload {
  recipientId: string;
  content: string;
}

export interface VoiceOfferPayload {
  spaceId: string;
  sdp: string; // WebRTC offer SDP
}

export interface VoiceAnswerPayload {
  recipientId: string;
  sdp: string; // WebRTC answer SDP
}

export interface VoiceIceCandidatePayload {
  recipientId: string;
  candidate: string; // WebRTC ICE candidate
}

export interface MessageData {
  type: 'public' | 'private';
  spaceId?: string;
  senderId: string;
  recipientId?: string;
  content: string;
  timestamp: Date;
}

export interface OutgoingMessage {
  type: MessageType;
  payload: any;
}