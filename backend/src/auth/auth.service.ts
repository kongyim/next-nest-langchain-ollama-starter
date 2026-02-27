import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly tokenTtlSeconds = 60 * 60 * 24 * 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<{ token: string; user: Pick<User, 'id' | 'email'> }> {
    const normalizedEmail = email.trim().toLowerCase();
    this.validateCredentials(normalizedEmail, password);

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new BadRequestException('Email is already registered.');
    }

    const passwordHash = this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const token = this.signAuthToken(user.id, user.email);
    return { token, user };
  }

  async login(email: string, password: string): Promise<{ token: string; user: Pick<User, 'id' | 'email'> }> {
    const normalizedEmail = email.trim().toLowerCase();
    this.validateCredentials(normalizedEmail, password);

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: {
        id: true,
        email: true,
      },
    });

    const token = this.signAuthToken(updatedUser.id, updatedUser.email);
    return {
      token,
      user: updatedUser,
    };
  }

  async findUserById(userId: string): Promise<Pick<User, 'id' | 'email'> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });
  }

  verifyAuthToken(token: string): AuthPayload {
    try {
      return this.jwtService.verify<AuthPayload>(token, {
        secret: this.getJwtSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private validateCredentials(email: string, password: string): void {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email is required.');
    }

    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const computed = scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(computed, 'hex');

    return a.length === b.length && timingSafeEqual(a, b);
  }

  private signAuthToken(userId: string, email: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        email,
      } satisfies Pick<AuthPayload, 'sub' | 'email'>,
      {
        secret: this.getJwtSecret(),
        expiresIn: this.tokenTtlSeconds,
      },
    );
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is required.');
    }
    return secret;
  }
}
