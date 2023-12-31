import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { COURSES_MESSAGES, GRADE_COMPOSITION_MESSAGES } from '@src/constants';
import { NextFunction, Response } from 'express';

import { IGradeCompositionRequest } from '@src/interfaces';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class GradeCompositionMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: IGradeCompositionRequest, res: Response, next: NextFunction) {
    console.log('GradeCompositionMiddleware');
    const gradeCompositionId = req.params.compositionId || req.params.id;
    const gradeCompositionIdNumber = Number(gradeCompositionId);

    if (isNaN(gradeCompositionIdNumber)) {
      throw new BadRequestException(
        GRADE_COMPOSITION_MESSAGES.INVALID_GRADE_COMPOSITION_ID,
      );
    }

    const gradeComposition = await this.prisma.gradeComposition.findUnique({
      where: {
        id: gradeCompositionIdNumber,
      },
    });

    if (!gradeComposition) {
      throw new BadRequestException(
        GRADE_COMPOSITION_MESSAGES.GRADE_COMPOSITION_NOT_FOUND,
      );
    }

    if (req.user.id !== req.course.createdBy.id) {
      throw new NotFoundException(COURSES_MESSAGES.YOU_ARE_NOT_COURSE_OWNER);
    }

    req.gradeComposition = gradeComposition;

    next();
  }
}
