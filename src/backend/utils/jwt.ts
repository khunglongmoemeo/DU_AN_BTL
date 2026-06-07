import { Request } from 'express';
import jwt from 'jsonwebtoken';
import type { AdmissionJwtPayload } from '../types/admission';

export interface AuthenticatedRequest extends Request {
	user?: AdmissionJwtPayload;
}

export const readBearerToken = (authorizationHeader?: string) => {
	if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
		return null;
	}

	return authorizationHeader.slice('Bearer '.length).trim();
};

export const verifyAccessToken = (token: string) => {
	return jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key') as AdmissionJwtPayload;
};
