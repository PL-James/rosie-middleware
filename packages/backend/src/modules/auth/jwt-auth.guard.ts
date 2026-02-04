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
    const urlPath = request.url.split('?')[0].replace(/\/$/, '');
    if (urlPath === '/api/v1/health') {
      return true;
    }

    // In development only, optionally allow unauthenticated access
    // IMPORTANT: This bypass only works in non-production environments for safety
    if (
      process.env.AUTH_REQUIRED === 'false' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return true;
    }

    return super.canActivate(context);
  }
}
