import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest() as { user?: Record<string, unknown> };
    const user = req.user ?? {};
    return field ? user[field] : user;
  },
);
