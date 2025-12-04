import { z, generateSchema } from '@/common/zod.js';
import { successResponseSchema, paginatedResponseSchema } from './common.schema.js';

export const getAssetsSchema = z.object({
    offset: z
        .preprocess((val) => {
            if (typeof val === 'string') return parseInt(val, 10);
            return val;
        }, z.number().min(0).default(0))
        .openapi({
            description: '페이징 오프셋',
            example: 0,
        }),
    limit: z
        .preprocess((val) => {
            if (typeof val === 'string') return parseInt(val, 10);
            return val;
        }, z.number().min(1).max(100).default(20))
        .openapi({
            description: '페이징 제한',
            example: 20,
        }),
});

export const assetSchema = z
    .object({
        id: z.number().int().positive().openapi({
            description: '자산 ID',
            example: 1,
        }),
        title: z.string().min(1).max(25).openapi({
            description: '자산 제목',
            example: 'Sample Asset',
        }),
        description: z.string().nullable().openapi({
            description: '자산 설명',
            example: 'This is a sample asset description.',
        }),
        filePath: z.string().optional().nullable().openapi({
            description: '파일 경로',
            example: '/uploads/sample-asset.png',
        }),
        fileType: z.string().optional().nullable().openapi({
            description: '파일 유형',
            example: 'image',
        }),
        createdAt: z.string().openapi({
            description: '생성 일시',
            example: '2024-01-01T12:00:00Z',
        }),
        thumbnailPath: z.string().optional().nullable().openapi({
            description: '썸네일 경로',
            example: '/uploads/thumbnails/sample-asset-thumb.png',
        }),
    })
    .openapi({ description: '자산 스키마' });

export const createAssetSchema = z.object({
    title: z.string().min(1).max(25).openapi({
        description: '자산 제목',
        example: 'Sample Asset',
    }),
    description: z.string().optional().nullable().openapi({
        description: '자산 설명',
        example: 'This is a sample asset description.',
    }),
});

export const updateAssetSchema = createAssetSchema.pick({
    title: true,
    description: true,
});

export const assetListResponseSchema = paginatedResponseSchema(assetSchema);
export const assetResponseSchema = successResponseSchema(assetSchema);

export const getAssetsJson = generateSchema(getAssetsSchema);
export const assetJson = generateSchema(assetResponseSchema);
export const assetListJson = generateSchema(assetListResponseSchema);
export const createAssetJson = generateSchema(createAssetSchema);
export const modifyAssetJson = generateSchema(updateAssetSchema);

export type AssetType = z.infer<typeof assetSchema>;
export type getAssetsType = z.infer<typeof assetListResponseSchema>;
