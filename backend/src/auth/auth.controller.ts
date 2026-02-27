import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';

interface AuthBody {
  email?: string;
  password?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: AuthBody) {
    return this.authService.register(body.email ?? '', body.password ?? '');
  }

  @Post('login')
  login(@Body() body: AuthBody) {
    return this.authService.login(body.email ?? '', body.password ?? '');
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser('sub') userId: string, @Req() req: Request) {
    const user = await this.authService.findUserById(userId);
    return {
      user,
      tokenPayload: (req as Request & { user?: unknown }).user,
    };
  }
}
