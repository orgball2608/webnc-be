import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TOKEN_MESSAGES, USERS_MESSAGES } from '@src/constants/message';
import { generateHash, validateHash } from '@src/common/utils';

import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { PageDto } from '@src/common/dto/page.dto';
import { PageMetaDto } from '@src/common/dto/page-meta.dto';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { StorageService } from '@src/shared/storage/services/storage.service';
import { TokenInvalidException } from '@src/exceptions';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import { UserEntity } from './entities/user.entity';
import { UsersPageOptionsDto } from './dto/user-page-options.dto';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    pageOptionsDto: UsersPageOptionsDto,
  ): Promise<PageDto<UserEntity>> {
    const { skip, take, order } = pageOptionsDto;

    const itemCount = await this.prisma.user.count();
    const users = await this.prisma.user.findMany({
      skip,
      take,
      orderBy: {
        createdAt: order,
      },
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    const filteredUsers = users.map((user) =>
      _.omit(user, [
        'password',
        'status',
        'forgotPasswordToken',
        'verifyEmailToken',
        'verify',
      ]),
    );

    return new PageDto(filteredUsers, pageMetaDto);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException(USERS_MESSAGES.USER_NOT_FOUND);

    return user;
  }

  private signForgotPasswordToken({ userId }: { userId: number }) {
    return this.jwtService.sign(
      { userId },
      {
        secret: this.config.getOrThrow<string>('auth.jwtForgotPasswordSecret'),
        expiresIn: `${this.config.getOrThrow<string>(
          'auth.jwtForgotPasswordExpires',
        )}s`,
      },
    );
  }

  private sendForgotPasswordMail({
    email,
    token,
    name,
  }: {
    email: string;
    token: string;
    name: string;
  }) {
    const apiPrefix =
      this.config.getOrThrow<string>('app.apiPrefix') +
      '/' +
      this.config.getOrThrow<string>('app.apiVersion');

    const resetLink = `${this.config.getOrThrow(
      'app.appURL',
    )}/${apiPrefix}/users/verify-forgot-password?token=${token}`;

    return this.mailerService.sendMail({
      to: email,
      from: 'elearningapp@gmail.com',
      subject: 'Email reset forgot password for leaning app',
      template: './forgot-password',
      context: {
        name,
        resetLink: resetLink,
      },
    });
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) throw new NotFoundException(USERS_MESSAGES.USER_NOT_FOUND);

    const token = this.signForgotPasswordToken({
      userId: user.id,
    });

    await this.prisma.user.update({
      where: {
        email,
      },
      data: {
        forgotPasswordToken: token,
      },
    });

    const name = user.firstName + user.lastName;

    await this.sendForgotPasswordMail({ email, token, name });

    return {
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD,
    };
  }

  verifyForgotPassword(token: string) {
    const frontendURL = this.config.get('app.frontendURL');
    return `${frontendURL}/reset-password?token=${token}`;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, password } = resetPasswordDto;
      const payload: {
        userId: number;
      } = this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>('auth.jwtForgotPasswordSecret'),
        ignoreExpiration: false,
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
      });

      if (!user) throw new NotFoundException(USERS_MESSAGES.USER_NOT_FOUND);

      if (user.forgotPasswordToken != token)
        throw new BadRequestException(
          USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_INVALID,
        );

      await this.prisma.user.update({
        where: {
          email: user.email,
        },
        data: {
          password: generateHash(password),
          forgotPasswordToken: null,
        },
      });

      return {
        message: USERS_MESSAGES.RESET_PASSWORD_SUCCESSFUL,
      };
    } catch (error) {
      throw new TokenInvalidException(TOKEN_MESSAGES.TOKEN_IS_INVALID);
    }
  }

  /**
   * Changes the password of a user.
   * @param id - The ID of the user whose password needs to be changed.
   * @param changePasswordDto - An object containing the old password, new password, and confirm password.
   * @returns An object with a success message.
   * @throws NotFoundException if the user is not found or the passwords do not match.
   */
  async changePassword(id: number, changePasswordDto: ChangePasswordDto) {
    const { newPassword, oldPassword, confirmPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(USERS_MESSAGES.USER_NOT_FOUND);
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(USERS_MESSAGES.PASSWORD_NOT_MATCH);
    }

    if (!(await validateHash(oldPassword, user.password))) {
      throw new BadRequestException(USERS_MESSAGES.PASSWORD_NOT_MATCH);
    }

    const hashedNewPassword = generateHash(newPassword);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
      },
    });

    return {
      message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESSFULLY,
    };
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    avatar: Express.Multer.File,
  ) {
    let user: User;

    await this.prisma.$transaction(async (tx) => {
      const key = uuidv4();

      const avatarURL = await this.storageService.uploadFile({
        key,
        file: avatar,
      });

      user = await tx.user.update({
        where: { id },
        data: {
          ...updateUserDto,
          avatar: avatarURL,
        },
      });
    });

    if (!user) throw new NotFoundException(USERS_MESSAGES.USER_NOT_FOUND);

    return {
      message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESSFULLY,
      data: _.omit(user, [
        'password',
        'status',
        'verifyEmailToken',
        'forgotPasswordToken',
        'verify',
        'googleId',
        'facebookId',
        'role',
        'status',
      ]),
    };
  }

  async remove(id: number) {
    const user = await this.prisma.user.delete({ where: { id } });

    if (!user) {
      throw new NotFoundException(USERS_MESSAGES.USER_NOT_FOUND);
    }

    return {
      message: USERS_MESSAGES.DELETE_USER_SUCCESSFULLY,
    };
  }
}
