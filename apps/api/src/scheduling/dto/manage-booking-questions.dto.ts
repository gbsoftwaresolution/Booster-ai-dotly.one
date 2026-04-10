import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { BookingQuestionType } from '@dotly/database'

export class BookingQuestionDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  label!: string

  @IsEnum(BookingQuestionType)
  type!: BookingQuestionType

  /** For SELECT type: array of option strings */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  options?: string[]

  @IsBoolean()
  required!: boolean

  @IsInt()
  @Min(0)
  position!: number
}

export class SetBookingQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingQuestionDto)
  @ArrayMaxSize(20)
  questions!: BookingQuestionDto[]
}
