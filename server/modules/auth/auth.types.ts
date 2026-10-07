export interface ILoginDTO {
  email: string;
  password: string;
}

export interface IRegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface IAuthResponse {
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshTokenDTO {
  refreshToken: string;
}

// ADD THIS NEW INTERFACE
export interface ILocationDTO {
  latitude: number;
  longitude: number;
  accuracy?: number;
  ipAddress?: string;
  city?: string;
  country?: string;
}