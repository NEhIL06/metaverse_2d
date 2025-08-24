export interface WebSocketMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

export interface JoinSpaceMessage {
  type: 'join';
  payload: {
    spaceId: string;
    token: string;
  };
}

export interface MoveMessage {
  type: 'move';
  payload: {
    x: number;
    y: number;
  };
}

export interface GroupChatMessage {
  type: 'groupChat';
  payload: {
    message: string;
    groupId: string;
  };
}

export interface PrivateChatMessage {
  type: 'privateChat';
  payload: {
    message: string;
    userId: string;
    spaceId: string;
  };
}

export interface SpaceJoinedResponse {
  type: 'space-joined';
  payload: {
    spawn: { x: number; y: number };
    users: Array<{
      userId: string;
      x: number;
      y: number;
    }>;
  };
}

export interface UserJoinedResponse {
  type: 'user-joined';
  payload: {
    userId: string;
    x: number;
    y: number;
  };
}

export interface UserLeftResponse {
  type: 'user-left';
  payload: {
    userId: string;
  };
}

export interface MovementResponse {
  type: 'movement';
  payload: {
    userId: string;
    x: number;
    y: number;
  };
}

export interface MovementRejectedResponse {
  type: 'movement-rejected';
  payload: {
    x: number;
    y: number;
  };
}

export interface ChatMessage {
  id?: string;
  message: string;
  userId: string;
  username?: string;
  timestamp: number;
}