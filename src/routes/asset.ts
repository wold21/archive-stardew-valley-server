import { BadRequestError } from '@/common/error.js';
import { assetJson, assetListJson, getAssetsJson } from '@/schemas/asset.schema.js';
import { errorResJson, idParamJson, IdParamType, successResJson } from '@/schemas/common.schema.js';
import { assetService } from '@/services/asset.service.js';
import { UploadedFileInfo } from '@/types/file.types.js';
import { FastifyInstance } from 'fastify';

export async function assetRoutes(fastify: FastifyInstance) {
    const service = new assetService(fastify.prisma);

    fastify.get(
        '/assets',
        {
            schema: {
                tags: ['Asset'],
                summary: '에셋 목록 조회',
                querystring: getAssetsJson,
                response: {
                    200: assetListJson,
                    400: errorResJson,
                    500: errorResJson,
                },
            },
        },
        async (request, reply) => {
            const { offset = 0, limit = 50 } = request.query as any;
            const assets = await service.getAssets(offset, limit);
            return reply.send({ data: assets });
        }
    );

    fastify.get(
        '/assets/:entityId',
        {
            schema: {
                tags: ['Asset'],
                summary: '에셋 상세 조회',
                params: idParamJson,
                response: {
                    200: assetJson,
                    400: errorResJson,
                    500: errorResJson,
                },
            },
        },
        async (request, reply) => {
            const { entityId } = request.params as IdParamType;
            const assets = await service.getAsset(entityId);
            return reply.send({ data: assets });
        }
    );

    fastify.post(
        '/assets',
        {
            schema: {
                tags: ['Asset'],
                summary: '에셋 등록',
                consumes: ['multipart/form-data'],
                response: {
                    201: successResJson,
                    400: errorResJson,
                    500: errorResJson,
                },
            },
        },
        async (request, reply) => {
            const parts = request.parts();

            const files: UploadedFileInfo[] = [];
            const titles: string[] = [];
            const descriptions: (string | undefined)[] = [];

            for await (const part of parts) {
                if (part.type === 'file') {
                    const buffer = await part.toBuffer();
                    files.push({
                        fileName: part.filename,
                        mimeType: part.mimetype,
                        encoding: part.encoding,
                        size: buffer.length,
                        buffer,
                    });
                } else {
                    // 단수형(title, description)과 복수형(titles, descriptions) 모두 지원
                    if (part.fieldname === 'title' || part.fieldname === 'titles') {
                        titles.push(part.value as string);
                    }
                    if (part.fieldname === 'description' || part.fieldname === 'descriptions') {
                        descriptions.push(part.value as string);
                    }
                }
            }

            if (files.length === 0) {
                throw new BadRequestError('최소 1개의 파일이 필요합니다.');
            }

            if (titles.length !== files.length) {
                throw new BadRequestError('파일 개수와 제목 개수가 일치하지 않습니다.');
            }

            const assetData = files.map((file, index) => {
                const title = titles[index];
                if (!title) {
                    throw new BadRequestError(`${index + 1}번째 파일의 제목이 필요합니다.`);
                }

                return {
                    file,
                    title,
                    ...(descriptions[index] && { description: descriptions[index] }),
                };
            });

            await service.createAssetsBulk(assetData);

            return reply.status(201).send({
                data: {
                    success: true,
                    operation: 'created',
                    message: '에셋이 성공적으로 생성되었습니다.',
                },
            });
        }
    );
}
