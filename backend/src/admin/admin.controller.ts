import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { TrainingService } from '../training/training.service';

interface AdminLoginBody {
  username?: string;
  password?: string;
}

interface CreateUserBody {
  email?: string;
  password?: string;
}

interface ResetPasswordBody {
  password?: string;
}

interface CreateTrainingEntryBody {
  title?: string;
  content?: string;
}

interface RunTrainingBody {
  entryId?: string;
}

interface EvalBody {
  query?: string;
  limit?: number;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly trainingService: TrainingService,
  ) {}

  @Post('login')
  login(@Body() body: AdminLoginBody) {
    return this.adminService.login(body.username ?? '', body.password ?? '');
  }

  @Get('users')
  @UseGuards(AdminGuard)
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @UseGuards(AdminGuard)
  createUser(@Body() body: CreateUserBody) {
    return this.adminService.createUser(body.email ?? '', body.password ?? '');
  }

  @Post('users/:userId/reset-password')
  @UseGuards(AdminGuard)
  resetUserPassword(
    @Param('userId') userId: string,
    @Body() body: ResetPasswordBody,
  ) {
    return this.adminService.resetUserPassword(userId, body.password ?? '');
  }

  @Delete('users/:userId')
  @UseGuards(AdminGuard)
  deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  @Get('training/entries')
  @UseGuards(AdminGuard)
  listTrainingEntries(): Promise<unknown> | unknown {
    return this.trainingService.listEntries();
  }

  @Post('training/entries')
  @UseGuards(AdminGuard)
  createTrainingEntry(@Body() body: CreateTrainingEntryBody): Promise<unknown> | unknown {
    return this.trainingService.createEntry(body.title ?? '', body.content ?? '');
  }

  @Post('training/upload')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadTrainingFile(@UploadedFile() file?: { originalname: string; mimetype?: string; buffer: Buffer }): Promise<unknown> | unknown {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException('file is required.');
    }

    return this.trainingService.createEntryFromFile(file.originalname, file.mimetype, file.buffer);
  }

  @Delete('training/entries/:entryId')
  @UseGuards(AdminGuard)
  deleteTrainingEntry(@Param('entryId') entryId: string) {
    return this.trainingService.deleteEntry(entryId);
  }

  @Get('training/runs')
  @UseGuards(AdminGuard)
  listTrainingRuns(): Promise<unknown> | unknown {
    return this.trainingService.listRuns();
  }

  @Get('training/jobs')
  @UseGuards(AdminGuard)
  listTrainingJobs(): Promise<unknown> | unknown {
    return this.trainingService.listJobs();
  }

  @Post('training/run')
  @UseGuards(AdminGuard)
  runTraining(@Body() body: RunTrainingBody): Promise<unknown> | unknown {
    return this.trainingService.enqueueTraining(body.entryId);
  }

  @Post('training/eval')
  @UseGuards(AdminGuard)
  evalTraining(@Body() body: EvalBody): Promise<unknown> | unknown {
    return this.trainingService.eval(body.query ?? '', body.limit);
  }
}
