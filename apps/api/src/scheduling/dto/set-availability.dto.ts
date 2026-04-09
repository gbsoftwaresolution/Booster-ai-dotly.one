import { IsArray, ValidateNested, IsEnum, IsString, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import { DayOfWeek } from '@dotly/database'

export class AvailabilityRuleDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM (24h)' })
  startTime!: string

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM (24h)' })
  endTime!: string
}

export class SetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityRuleDto)
  rules!: AvailabilityRuleDto[]
}
