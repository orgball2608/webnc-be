import {
  Course,
  Grade,
  GradeComposition,
  GradeReview,
  User,
} from '@prisma/client';

import type { Request as ExpressRequest } from 'express';
import { Profile as FaceBookProfile } from 'passport-facebook';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import type { Request as NestRequest } from '@nestjs/common';
import { SimpleUserEntity } from '@src/common/entity/simple-user.entity';

export interface IOAuthRequestUser {
  profile: GoogleProfile | FaceBookProfile;
}

type CombinedRequest = ExpressRequest & typeof NestRequest;
export interface IUserRequest extends CombinedRequest {
  user: User;
  isEnrolled?: boolean;
}

export interface ICourseRequest extends IUserRequest {
  course: Course & { createdBy: SimpleUserEntity };
}

export interface IGradeCompositionRequest extends ICourseRequest {
  gradeComposition: GradeComposition;
}

export interface IGradeReviewRequest extends IGradeCompositionRequest {
  gradeReview: GradeReview;
}

export interface IGradeRequest extends IGradeCompositionRequest {
  grade: Grade;
}

export interface IOAuthRequest extends CombinedRequest {
  user: IOAuthRequestUser;
}
