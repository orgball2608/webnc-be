import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { COURSES_MESSAGES } from '@src/constants/message';
import { IUserRequest } from '@src/interfaces';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class CourseMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: IUserRequest, res: Response, next: NextFunction) {
    const courseId = req.params.id;
    const courseIdNumber = Number(courseId);

    if (isNaN(courseIdNumber)) {
      throw new BadRequestException(COURSES_MESSAGES.INVALID_COURSE_ID);
    }

    const course = await this.prisma.course.findUnique({
      where: {
        id: courseIdNumber,
      },
    });

    if (!course) {
      throw new NotFoundException(COURSES_MESSAGES.COURSE_NOT_FOUND);
    }

    const userId = req.user.id;

    const enrollment = await this.prisma.course.findUnique({
      where: {
        id: courseIdNumber,
        OR: [
          {
            enrollments: {
              some: {
                studentId: userId,
              },
            },
          },
          {
            courseTeachers: {
              some: {
                teacherId: userId,
              },
            },
          },
        ],
      },
    });

    if (
      !enrollment &&
      !req.url.includes('checkEnrolled') &&
      !req.url.includes('enroll')
    ) {
      throw new NotFoundException(COURSES_MESSAGES.COURSE_NOT_FOUND);
    }

    req.isEnrolled = enrollment !== null;
    next();
  }
}
