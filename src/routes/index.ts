import { FastifyInstance } from 'fastify';
import { API_PREFIX } from '../common/constants.js';
import { uploadRoutes } from './upload.js';
import { assetRoutes } from './asset.js';

export async function registerRoutes(fastify: FastifyInstance) {
    await fastify.register(uploadRoutes, { prefix: API_PREFIX });
    await fastify.register(assetRoutes, { prefix: API_PREFIX });
    fastify.log.info('Routes registered');
}
