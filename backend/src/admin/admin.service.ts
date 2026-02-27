import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminTokenPayload {
  role: 'admin';
  username: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AdminService {
  private readonly tokenTtlSeconds = 60 * 60 * 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  login(username: string, password: string): { token: string; username: string } {
    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      throw new InternalServerErrorException('ADMIN_USERNAME and ADMIN_PASSWORD are required.');
    }

    if (username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    return {
      token: this.signToken(username),
      username,
    };
  }

  verifyToken(token: string): AdminTokenPayload {
    try {
      const payload = this.jwtService.verify<AdminTokenPayload>(token, {
        secret: this.getAdminJwtSecret(),
      });
      if (payload.role !== 'admin') {
        throw new UnauthorizedException('Invalid admin token role.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin token.');
    }
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });
  }

  async createUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new BadRequestException('Valid email is required.');
    }

    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Email is already registered.');
    }

    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { ok: true };
  }

  private signToken(username: string): string {
    return this.jwtService.sign(
      {
        role: 'admin',
        username,
      } satisfies Pick<AdminTokenPayload, 'role' | 'username'>,
      {
        secret: this.getAdminJwtSecret(),
        expiresIn: this.tokenTtlSeconds,
      },
    );
  }

  private getAdminJwtSecret(): string {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('ADMIN_JWT_SECRET is required.');
    }
    return secret;
  }
}
