import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { SupabaseStrategy } from './strategies/supabase.strategy'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [PassportModule, UsersModule],
  providers: [SupabaseStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
