import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  Matches,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class BookingAnswerDto {
  @IsString()
  questionId!: string

  @IsString()
  @MaxLength(5000)
  value!: string
}

export class CreateBookingDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  guestName!: string

  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(254)
  guestEmail!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  guestNotes?: string

  /** ISO-8601 datetime string for the chosen slot start */
  @IsDateString()
  startAt!: string

  /** Answers to custom booking questions */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingAnswerDto)
  @ArrayMaxSize(20)
  answers?: BookingAnswerDto[]

  @IsOptional()
  @IsString()
  @MaxLength(100)
  depositPaymentId?: string

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'depositTxHash must be a valid 32-byte hex transaction hash prefixed with 0x',
  })
  depositTxHash?: string
}
