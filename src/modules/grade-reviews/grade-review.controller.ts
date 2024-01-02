import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { GradeReviewService } from './grade-review.service';
import { CreateGradeReviewDto } from './dto/create-grade-review.dto';
import { UpdateGradeReviewDto } from './dto/update-grade-review.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ROUTES } from '@src/constants';
import { IGradeRequest } from '@src/interfaces';
import {
  ApiFindAll,
  ApiFindOne,
  ApiCreate,
  ApiUpdate,
  ApiDelete,
} from '@src/decorators';
import { GradeReview } from './entities/grade-review.entity';

@ApiTags('Grade reviews')
@ApiBearerAuth()
@Controller(ROUTES.GRADE_REVIEWS)
export class GradeReviewController {
  constructor(private readonly gradeReviewService: GradeReviewService) {}

  @Post()
  @ApiParam({ name: 'courseId', type: Number, example: 1 })
  @ApiParam({ name: 'compositionId', type: Number, example: 1 })
  @ApiParam({ name: 'gradeId', type: Number, example: 1 })
  @ApiCreate(CreateGradeReviewDto, GradeReview)
  create(
    @Req() req: IGradeRequest,
    @Body() createGradeReviewDto: CreateGradeReviewDto,
  ) {
    return this.gradeReviewService.create(
      req.user.id,
      req.grade.id,
      createGradeReviewDto,
    );
  }

  @Get()
  @ApiFindAll(GradeReview)
  findAll() {
    return this.gradeReviewService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'courseId', type: Number, example: 1 })
  @ApiParam({ name: 'compositionId', type: Number, example: 1 })
  @ApiParam({ name: 'gradeId', type: Number, example: 1 })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiFindOne(GradeReview)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gradeReviewService.findOne(id);
  }

  @Patch(':id')
  @ApiParam({ name: 'courseId', type: Number, example: 1 })
  @ApiParam({ name: 'compositionId', type: Number, example: 1 })
  @ApiParam({ name: 'gradeId', type: Number, example: 1 })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiUpdate(UpdateGradeReviewDto, GradeReview)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGradeReviewDto: UpdateGradeReviewDto,
  ) {
    return this.gradeReviewService.update(id, updateGradeReviewDto);
  }

  @Delete(':id')
  @ApiParam({ name: 'courseId', type: Number, example: 1 })
  @ApiParam({ name: 'compositionId', type: Number, example: 1 })
  @ApiParam({ name: 'gradeId', type: Number, example: 1 })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiDelete()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gradeReviewService.remove(id);
  }
}
