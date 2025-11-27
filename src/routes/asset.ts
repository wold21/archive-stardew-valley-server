import { FastifyInstance } from 'fastify';

export async function assetRoutes(fastify: FastifyInstance) {
    fastify.get('/assets', async (request, reply) => {
        return { status: 'ok' };
    });
}
