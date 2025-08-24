export interface Space {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
  creatorId: string;
  elements: SpaceElement[];
  users?: User[];
}

export interface SpaceElement {
  id: string;
  elementId: string;
  x: number;
  y: number;
  element: Element;
}

export interface Element {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
  name?: string;
}

export interface MapTemplate {
  id: string;
  name: string;
  dimensions: string;
  thumbnail: string;
  defaultElements: DefaultElement[];
}

export interface DefaultElement {
  elementId: string;
  x: number;
  y: number;
}

export interface CreateSpaceRequest {
  name: string;
  dimensions: string;
  mapId?: string;
}

export interface UserPosition {
  userId: string;
  x: number;
  y: number;
  username?: string;
  avatarId?: string;
}

export interface User {
  id: string;
  username: string;
  avatarId?: string;
}