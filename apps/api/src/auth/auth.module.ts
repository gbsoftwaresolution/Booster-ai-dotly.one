import { Module, forwardRef } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { ObservabilityModule } from '../common/observability/observability.module'
import { UsersModule } from '../users/users.module'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { AuthController } from './auth.controller'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    forwardRef(() => UsersModule),
    EmailModule,
    ObservabilityModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
