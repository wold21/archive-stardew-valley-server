import fastifyMultipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';

export async function registerMultipart(fastify: FastifyInstance) {
    await fastify.register(fastifyMultipart, {
        limits: {
            fileSize: 100 * 1024 * 1024, // 100MB
            files: 100,
        },
        attachFieldsToBody: false,
    });
}
