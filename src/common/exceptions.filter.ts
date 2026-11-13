import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		// Determine HTTP status code
		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
			console.error(exception);
		}

		// Extract message or payload
		const exceptionResponse =
			exception instanceof HttpException ? exception.getResponse() : null;

		// Normalize message into a string
		const message =
			typeof exceptionResponse === 'string'
				? exceptionResponse
				: (exceptionResponse as any)?.message ||
					'Internal server error';

		// Uniform error envelope
		response.status(status).json({
			success: false,
			path: request.url,
			timestamp: new Date().toISOString(),
			error: { message },
		});
	}
}
