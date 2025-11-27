import { z, generateSchema } from '@/common/zod.js';
import { off } from 'process';
import { nullable } from 'zod';

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
        file_path: z.string().optional().nullable().openapi({
            description: '파일 경로',
            example: '/uploads/sample-asset.png',
        }),
        file_type: z.string().optional().nullable().openapi({
            description: '파일 유형',
            example: 'image',
        }),
        created_at: z.string().openapi({
            description: '생성 일시',
            example: '2024-01-01T12:00:00Z',
        }),
        thumbnail_path: z.string().optional().nullable().openapi({
            description: '썸네일 경로',
            example: '/uploads/thumbnails/sample-asset-thumb.png',
        }),
    })
    .openapi({ description: '자산 스키마' });

export const assetListSchema = z
    .object({
        assets: z.array(assetSchema).openapi({
            description: '자산 목록',
        }),
        total: z.number().int().nonnegative().openapi({
            description: '총 자산 수',
            example: 100,
        }),
        offset: z.number().int().nonnegative().openapi({
            description: '페이징 오프셋',
            example: 0,
        }),
        limit: z.number().int().positive().openapi({
            description: '페이징 제한',
            example: 20,
        }),
    })
    .openapi({ description: '자산 목록 응답 스키마' });

export const assetJson = generateSchema(assetSchema);
export const assetListJson = generateSchema(assetListSchema);

export type AssetType = z.infer<typeof assetSchema>;
export type AssetListType = z.infer<typeof assetListSchema>;
