import { UserPayload } from '../interfaces';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { CustomConfigService } from 'src/config';

const jwtCookieExtractor = <T extends Request = Request>(
  req: T,
): string | null => {
  let token = null;

  if (req && req.cookies) {
    token = req.cookies['chat-app-auth'];
  }

  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(protected configService: CustomConfigService) {
    super({
      jwtFromRequest: jwtCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get('jwtSecret'),
    });
  }

  validate(payload: JwtPayload): UserPayload {
    return { userId: payload.sub, username: payload.username };
  }
}
