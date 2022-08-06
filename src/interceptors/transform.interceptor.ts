import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  ok: boolean;
  data?: T[] | T;
  metadata?: { [key: string]: any };
}

const handlersToExclude = ['tonAuthRequest', 'tonLogin', 'tonHubAuthRequest'];

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const handler = context.getHandler().name;

    if (handlersToExclude.indexOf(handler) !== -1) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => ({ ok: true, data: data })));
  }
}
