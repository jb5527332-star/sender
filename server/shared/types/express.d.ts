import { IUser } from './common.types';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};