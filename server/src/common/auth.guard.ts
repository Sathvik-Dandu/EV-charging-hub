import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, IS_PUBLIC_KEY, PERMISSION_KEY } from './auth.decorators';
import { can, Permission } from './permissions';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const request = context.switchToHttp().getRequest();
    const [type, token] = (request.headers.authorization ?? '').split(' ');

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      if (type === 'Bearer' && token) {
        request.user = await this.jwt.verifyAsync<AuthUser>(token, { secret: process.env.JWT_ACCESS_SECRET }).catch(() => undefined);
      }
      return true;
    }

    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Login required');
    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('Session expired, please login again');
    }

    const permission = this.reflector.getAllAndOverride<Permission>(PERMISSION_KEY, targets);
    if (permission && !can(request.user.role, permission)) {
      throw new ForbiddenException('You do not have permission for this action');
    }
    return true;
  }
}
