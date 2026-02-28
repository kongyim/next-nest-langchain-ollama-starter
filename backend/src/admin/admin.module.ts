import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { TrainingModule } from '../training/training.module';

@Module({
  imports: [AuthModule, TrainingModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
