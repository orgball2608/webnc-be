import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Get,
  Body,
  Req,
  Query,
  Delete,
  Redirect,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LocalAuthGuard,
  GoogleAuthGuard,
  FacebookAuthGuard,
} from '@src/guards';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { UserEntity } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { IOAuthRequest, IUserRequest } from '@src/interfaces';
import { ResendConfirmEmailDto } from './dto/resend-confirm-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ROUTES } from '@src/constants';

@ApiTags('Authentication')
@Controller(ROUTES.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Register successful',
        },
      },
    },
  })
  @Post('/register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  loginWithFacebook() {
    return HttpStatus.OK;
  }

  @UseGuards(FacebookAuthGuard)
  @Get('facebook/redirect')
  @Redirect()
  async loginWithFacebookCallback(@Req() req: IOAuthRequest) {
    const url = await this.authService.loginFacebook(req);
    return {
      url: url,
    };
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  loginGoogle() {
    return HttpStatus.OK;
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/redirect')
  @Redirect()
  async loginWithGoogleCallback(@Req() req: IOAuthRequest) {
    const url = await this.authService.loginGoogle(req);
    return {
      url: url,
    };
  }

  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: AuthCredentialsDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Login successfully',
        },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjg1OTQ5MzI0LCJleHAiOjE2ODU5NDkzMjd9.JAFScDSW24LJjlLBrfuB2PxG7f7jaw3NVMgrCDmFjoA',
            },
            refreshToken: {
              type: 'string',
              example:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjg1OTQ5MzI0LCJleHAiOjE2ODU5NDkzMjd9.JAFScDSW24LJjlLBrfuB2PxG7f7jaw3NVMgrCDmFjoA',
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async signIn(@Req() req: IUserRequest) {
    return this.authService.login(req);
  }

  @ApiBearerAuth()
  @ApiNotFoundResponse({
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not found' },
      },
    },
  })
  @ApiOkResponse({ type: UserEntity })
  @HttpCode(HttpStatus.OK)
  @Get('/me')
  async me(@Req() req: IUserRequest) {
    return this.authService.getMe(req.user.id);
  }

  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Register successfully',
        },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjg1OTQ5MzI0LCJleHAiOjE2ODU5NDkzMjd9.JAFScDSW24LJjlLBrfuB2PxG7f7jaw3NVMgrCDmFjoA',
            },
          },
        },
      },
    },
  })
  @Post('refresh-token')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Get('verify-email')
  findOne(@Query('token') token: string) {
    return this.authService.confirmEmail(token);
  }

  @Post('resend-confirm-email')
  @ApiBody({ type: ResendConfirmEmailDto })
  resendConfirmEmail(@Body() resendConfirmEmailDto: ResendConfirmEmailDto) {
    return this.authService.resendConfirmEmail(resendConfirmEmailDto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Delete('/logout')
  async signOut() {
    return this.authService.logout();
  }
}
