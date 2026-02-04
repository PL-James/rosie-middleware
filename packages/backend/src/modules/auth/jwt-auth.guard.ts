import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Skip authentication for health check endpoint
    const request = context.switchToHttp().getRequest();
    if (request.url === '/api/v1/health') {
      return true;
    }

    // In development, optionally allow unauthenticated access
    if (process.env.AUTH_REQUIRED === 'false') {
      return true;
    }

    return super.canActivate(context);
  }
}
