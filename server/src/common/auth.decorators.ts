import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { RoleName } from './business-rules';
import { Permission } from './permissions';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSION_KEY = 'permission';

export interface AuthUser {
  id: number;
  email: string;
  role: RoleName;
  fullName: string;
}

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Can = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest().user;
});
