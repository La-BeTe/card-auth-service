import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

export interface ResponseEnvelope<T = any> {
	success: boolean;
	timestamp: string;
	path: string;
	data: T;
}

@Injectable()
export class ResponseInterceptor<T>
	implements NestInterceptor<T, ResponseEnvelope<T>>
{
	intercept(
		context: ExecutionContext,
		next: CallHandler<T>,
	): Observable<ResponseEnvelope<T>> {
		const ctx = context.switchToHttp();
		const request = ctx.getRequest<Request>();

		return next.handle().pipe(
			map((data) => ({
				success:
					typeof (data as any)?.approved === 'boolean'
						? (data as any).approved
						: true,
				path: request.url,
				timestamp: new Date().toISOString(),
				data,
			})),
		);
	}
}
