import { IsString, MaxLength, MinLength, Matches } from 'class-validator'

export class SendEmailDto {
  /**
   * Email subject line.
   * CRLF sequences (\r and \n) are rejected to prevent SMTP header injection.
   * While both Mailgun and SES serialize via API (not raw SMTP), this guard
   * ensures the DTO is safe regardless of the underlying transport.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[^\r\n]*$/, { message: 'subject must not contain newline characters' })
  subject!: string

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string
}
