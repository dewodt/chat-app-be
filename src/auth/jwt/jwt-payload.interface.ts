export interface JwtPayload {
  sub: string; // Subject (the user ID)
  username: string;
  iat: number; // Issued At
  exp: number; // Expiration
}
