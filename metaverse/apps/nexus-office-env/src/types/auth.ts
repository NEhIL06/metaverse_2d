export interface User {
  id: string;
  username: string;
  type: 'admin' | 'user';
  avatarId?: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  type: 'admin';
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
}

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
}