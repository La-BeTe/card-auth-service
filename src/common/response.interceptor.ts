import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';

export interface ResponseEnvelope<T = any> {
	success: boolean;
	statusCode: number;
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
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		return next.handle().pipe(
			map((data) => ({
				success: true,
				statusCode: response.statusCode,
				timestamp: new Date().toISOString(),
				path: request.url,
				data,
			})),
		);
	}
}
