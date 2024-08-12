export declare global {
  // Extend the Express.User interface to include the JwtPayload interface
  namespace Express {
    interface User {
      userId: string;
      username: string;
    }
  }
}