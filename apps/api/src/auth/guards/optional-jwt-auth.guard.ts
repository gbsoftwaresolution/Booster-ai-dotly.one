import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly delegate = new (AuthGuard('jwt'))()

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers?: { authorization?: string }; user?: unknown }>()
    const authHeader = req.headers?.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      req.user = undefined
      return true
    }

    try {
      const result = this.delegate.canActivate(context)
      if (result instanceof Promise) {
        await result
      }
      return true
    } catch {
      req.user = undefined
      return true
    }
  }
}
