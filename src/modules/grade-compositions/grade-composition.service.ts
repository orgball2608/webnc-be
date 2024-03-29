import {
  ApiResponseEntity,
  ApiResponseOmitDataEntity,
} from '@src/common/entity/response.entity';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Course, User } from '@prisma/client';
import {
  EMIT_MESSAGES,
  GRADE_COMPOSITION_MESSAGES,
  Order,
} from '@src/constants';

import { CreateGradeCompositionDto } from './dto/create-grade-composition.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GradeCompositionEntity } from './entities/grade-composition.entity';
import { INotification } from '@src/interfaces';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { SimpleUserEntity } from '@src/common/entity/simple-user.entity';
import { UpdateGradeCompositionDto } from './dto/update-grade-composition.dto';

@Injectable()
export class GradeCompositionService {
  private readonly logger = new Logger(GradeCompositionService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly emitterEvent: EventEmitter2,
  ) {}

  async create(
    user: User,
    courseId: number,
    { name, scale }: CreateGradeCompositionDto,
  ): Promise<ApiResponseEntity<GradeCompositionEntity>> {
    const gradeCompositions = await this.prisma.gradeComposition.findMany({
      where: {
        courseId,
      },
    });

    const totalScale = gradeCompositions.reduce(
      (total, gradeComposition) => total + gradeComposition.scale,
      0,
    );

    const maxIndex = Math.max(...gradeCompositions.map((gc) => gc.index), 0);

    console.log(totalScale, scale, maxIndex);

    if (
      totalScale + scale > 100 ||
      gradeCompositions.find(
        (gradeComposition) =>
          gradeComposition.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new BadRequestException(
        GRADE_COMPOSITION_MESSAGES.INVALID_GRADE_COMPOSITION,
      );
    }

    const gradeComposition = await this.prisma.gradeComposition.create({
      data: {
        course: {
          connect: {
            id: courseId,
          },
        },
        createdBy: {
          connect: {
            id: user.id,
          },
        },
        name,
        scale,
        index: maxIndex + 1,
      },
    });

    return {
      message: GRADE_COMPOSITION_MESSAGES.CREATE_GRADE_COMPOSITION_SUCCESSFULLY,
      data: gradeComposition,
    };
  }

  async findAllByCourseId(courseId: number) {
    const gradeCompositions = await this.prisma.gradeComposition.findMany({
      where: {
        courseId: courseId,
      },
      orderBy: {
        index: 'asc',
      },
    });
    return {
      message:
        GRADE_COMPOSITION_MESSAGES.GET_GRADE_COMPOSITION_BY_COURSE_ID_SUCCESSFULLY,
      data: gradeCompositions,
    };
  }

  async findOne(
    id: number,
  ): Promise<ApiResponseEntity<GradeCompositionEntity>> {
    const gradeComposition = await this.prisma.gradeComposition.findUnique({
      where: {
        id,
      },
      include: {
        createdBy: true,
      },
    });

    return {
      message: GRADE_COMPOSITION_MESSAGES.GET_GRADE_COMPOSITION_SUCCESSFULLY,
      data: {
        ...gradeComposition,
        createdBy: new SimpleUserEntity(gradeComposition.createdBy),
      },
    };
  }

  async update(
    id: number,
    updateGradeCompositionDto: UpdateGradeCompositionDto,
  ): Promise<ApiResponseEntity<GradeCompositionEntity>> {
    const { name, scale } = updateGradeCompositionDto;
    const gradeComposition = await this.prisma.gradeComposition.update({
      where: {
        id,
      },
      data: {
        name,
        scale,
      },
    });

    return {
      message: GRADE_COMPOSITION_MESSAGES.UPDATE_GRADE_COMPOSITION_SUCCESSFULLY,
      data: gradeComposition,
    };
  }

  async remove(id: number): Promise<ApiResponseOmitDataEntity> {
    await this.prisma.$transaction(async (tx) => {
      const deletedGradeComposition = await tx.gradeComposition.delete({
        where: {
          id,
        },
      });

      const gradeCompositions = await tx.gradeComposition.findMany({
        where: {
          index: {
            gt: deletedGradeComposition.index,
          },
          courseId: deletedGradeComposition.courseId,
        },
        orderBy: {
          index: Order.ASC,
        },
      });

      for (const gradeComposition of gradeCompositions) {
        await tx.gradeComposition.update({
          where: {
            id: gradeComposition.id,
          },
          data: {
            index: {
              decrement: 1,
            },
          },
        });
      }
    });

    return {
      message: GRADE_COMPOSITION_MESSAGES.DELETE_GRADE_COMPOSITION_SUCCESSFULLY,
    };
  }

  async switchGradeCompositionIndex(switchedId: number, switchToId: number) {
    if (switchedId === switchToId) {
      throw new BadRequestException(
        GRADE_COMPOSITION_MESSAGES.INVALID_SWITCH_TO_INDEX,
      );
    }

    const switchedIndex = await this.prisma.gradeComposition.findUnique({
      where: {
        id: switchedId,
      },
      select: {
        index: true,
        courseId: true,
      },
    });

    if (!switchedIndex) {
      throw new BadRequestException(
        GRADE_COMPOSITION_MESSAGES.INVALID_GRADE_COMPOSITION,
      );
    }

    const switchToIndex = await this.prisma.gradeComposition.findUnique({
      where: {
        id: switchToId,
      },
      select: {
        index: true,
      },
    });

    if (!switchToIndex) {
      throw new BadRequestException(
        GRADE_COMPOSITION_MESSAGES.INVALID_GRADE_COMPOSITION,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gradeComposition.update({
        where: {
          id: switchedId,
        },
        data: {
          index: null,
        },
      });

      if (switchedIndex.index > switchToIndex.index) {
        const updateIndexes = await tx.gradeComposition.findMany({
          where: {
            courseId: switchedIndex.courseId,
            index: {
              gte: switchToIndex.index,
              lt: switchedIndex.index,
            },
          },
          orderBy: {
            index: 'desc',
          },
        });

        await Promise.all(
          updateIndexes.map(async (item) => {
            await tx.gradeComposition.update({
              where: {
                id: item.id,
              },
              data: {
                index: item.index + 1,
              },
            });
          }),
        );
      } else {
        const updateIndexes = await tx.gradeComposition.findMany({
          where: {
            courseId: switchedIndex.courseId,
            index: {
              gt: switchedIndex.index,
              lte: switchToIndex.index,
            },
          },
          orderBy: {
            index: 'asc',
          },
        });

        await Promise.all(
          updateIndexes.map(async (item) => {
            await tx.gradeComposition.update({
              where: {
                id: item.id,
              },
              data: {
                index: item.index - 1,
              },
            });
          }),
        );
      }

      await tx.gradeComposition.update({
        where: {
          id: switchedId,
        },
        data: {
          index: switchToIndex.index,
        },
      });
    });

    const gradeCompositions = await this.prisma.gradeComposition.findMany({
      where: {
        courseId: switchedIndex.courseId,
        index: {
          not: null,
        },
      },
      orderBy: {
        index: 'asc',
      },
    });

    return {
      message:
        GRADE_COMPOSITION_MESSAGES.SWITCH_GRADE_COMPOSITION_INDEX_SUCCESSFULLY,
      data: gradeCompositions,
    };
  }

  async markFinalize(
    id: number,
    course: Course & { createdBy: SimpleUserEntity },
    value: boolean,
  ) {
    const gradeComposition = await this.prisma.gradeComposition.update({
      where: {
        id,
      },
      data: {
        isFinalized: value,
      },
    });

    if (!value) {
      return {
        message: GRADE_COMPOSITION_MESSAGES.MARK_AS_UN_FINALIZED_SUCCESSFULLY,
        data: gradeComposition,
      };
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId: course.id,
      },
    });

    enrollments.forEach((enrollment) => {
      const notificationData: INotification = {
        userId: enrollment.userId,
        creatorId: course.createdBy.id,
        title: 'Grade composition finalized',
        body: `Grade composition ${gradeComposition.name} of course ${course.name} is finalized!, check it out`,
      };

      this.emitterEvent.emit(EMIT_MESSAGES.NOTIFICATION_CREATED, {
        userId: enrollment.userId,
        notificationData,
      });
    });

    return {
      message: GRADE_COMPOSITION_MESSAGES.MARK_AS_FINALIZED_SUCCESSFULLY,
      data: gradeComposition,
    };
  }
}
