import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  ValidationPipe,
  UseInterceptors,
  Req,
  UploadedFile,
  Post,
  Redirect,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { omit } from 'lodash';
import { UserEntity } from './entities/user.entity';
import { UsersPageOptionsDto } from './dto/user-page-options.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IUserRequest } from '@src/interfaces';
import { FileInterceptor } from '@nestjs/platform-express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateFullFieldUserDto } from './dto/update-full-field-user.dto';
import { ROUTES } from '@src/constants';

@ApiTags('Users')
@ApiBearerAuth()
@Controller(ROUTES.USERS)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOkResponse({ type: [UserEntity] })
  @Get()
  findAll(
    @Query(new ValidationPipe({ transform: true }))
    pageOptionsDto: UsersPageOptionsDto,
  ) {
    return this.userService.findAll(pageOptionsDto);
  }

  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: UserEntity })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return omit(await this.userService.findOne(id), ['password']);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.userService.forgotPassword(forgotPasswordDto);
  }

  @Get('verify-forgot-password')
  @Redirect()
  verifyForgotPassword(@Query('token') token: string) {
    const url = this.userService.verifyForgotPassword(token);
    return {
      url: url,
    };
  }

  @ApiBody({ type: ResetPasswordDto })
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.userService.resetPassword(resetPasswordDto);
  }

  @ApiBody({ type: ChangePasswordDto })
  @Patch('/change-password')
  changePassword(
    @Req() req: IUserRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const id = req.user.id;
    return this.userService.changePassword(id, changePasswordDto);
  }

  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          nullable: true,
        },
        lastName: {
          type: 'string',
          nullable: true,
        },
        phoneNumber: {
          type: 'string',
          nullable: true,
        },
        address: {
          type: 'string',
          nullable: true,
        },
        sex: {
          type: 'string',
          enum: ['MALE', 'FEMALE', 'NONE'],
          nullable: true,
        },
        studentId: {
          type: 'number',
          nullable: true,
        },
        avatar: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar'))
  update(
    @Req() req: IUserRequest,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    const id = req.user.id;
    return this.userService.update(id, updateUserDto, avatar);
  }

  @ApiParam({ name: 'id', type: Number, example: 1 })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          nullable: true,
        },
        lastName: {
          type: 'string',
          nullable: true,
        },
        password: {
          type: 'string',
          nullable: true,
        },
        phoneNumber: {
          type: 'string',
          nullable: true,
        },
        address: {
          type: 'string',
          nullable: true,
        },
        sex: {
          type: 'string',
          enum: ['MALE', 'FEMALE', 'NONE'],
          nullable: true,
        },
        role: {
          type: 'string',
          enum: ['ADMIN', 'STUDENT', 'TEACHER'],
          nullable: true,
        },
        verify: {
          type: 'string',
          enum: ['VERIFY', 'UNVERIFY'],
          nullable: true,
        },
        studentId: {
          type: 'number',
          nullable: true,
        },
        avatar: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  updateFullField(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFullFieldUserDto: UpdateFullFieldUserDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return this.userService.updateFullField(id, updateFullFieldUserDto, avatar);
  }
}
