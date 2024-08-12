import { JwtPayload } from './jwt-payload.interface';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { ConfigService } from 'src/config';

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
  constructor(protected configService: ConfigService) {
    super({
      jwtFromRequest: jwtCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get('jwtSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, username: payload.username };
  }
}
