
import express from 'express';
import { systemRouter } from './systemRouter';
import { storyRouter } from './storyRouter';
import { mediaRouter } from './mediaRouter';
import { codexRouter } from './codexRouter';
import { storageRouter } from './storageRouter';

export const apiRouter = express.Router();

apiRouter.use(systemRouter);
apiRouter.use(storyRouter);
apiRouter.use(mediaRouter);
apiRouter.use(codexRouter);
apiRouter.use(storageRouter);
