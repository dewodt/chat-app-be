export interface SessionResponseDto {
  token: string;
  user: {
    userId: string;
    username: string;
  };
}
