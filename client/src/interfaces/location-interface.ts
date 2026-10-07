export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  ipAddress?: string;
  city?: string;
  country?: string;
  hasGrantedPermission?: boolean;
}

export interface IPLocationData {
  ip: string;
  city: string;
  country_name: string;
  latitude: number;
  longitude: number;
}
