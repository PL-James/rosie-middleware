import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
      signOptions: {
        expiresIn: '24h',
      },
    }),
  ],
  providers: [AuthService, ApiKeyService, JwtStrategy, JwtAuthGuard, RolesGuard],
  controllers: [AuthController, ApiKeyController],
  exports: [AuthService, ApiKeyService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
