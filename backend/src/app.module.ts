import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './prisma/prisma.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [PrismaModule, AuthModule, TrainingModule, ChatModule, AdminModule],
})
export class AppModule {}
