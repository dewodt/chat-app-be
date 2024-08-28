import { User } from '../entities';

export interface UserResponseDto {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  about: string | null;
}

export class UserResponseFactory {
  static createUserDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      about: user.about,
    };
  }

  static createUserDtoList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.createUserDto(user));
  }
}
