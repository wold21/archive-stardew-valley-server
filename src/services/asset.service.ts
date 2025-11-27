import { NotFoundError } from '@/common/error.js';
import { AssetListType, AssetType } from '@/schemas/asset.schema.js';
import { PrismaClient } from '@prisma/client';

export class assetService {
    constructor(private prisma: PrismaClient) {}

    async getAssets(offset: number, limit: number): Promise<AssetListType> {
        const [assets, total] = await Promise.all([
            this.prisma.assets_tb.findMany({
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.assets_tb.count(),
        ]);
        return {
            assets: assets.map((asset) => ({
                id: asset.id,
                title: asset.title,
                description: asset.description || null,
                file_path: asset.file_path || null,
                file_type: asset.file_type || null,
                created_at:
                    asset.created_at instanceof Date
                        ? asset.created_at.toISOString()
                        : asset.created_at,
                thumbnail_path: asset.thumbnail_path || null,
            })),
            total,
            offset,
            limit,
        };
    }

    async getAsset(id: number): Promise<AssetType> {
        const asset = await this.prisma.assets_tb.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                file_path: true,
                file_type: true,
                created_at: true,
                thumbnail_path: true,
            },
        });
        if (!asset) {
            throw new NotFoundError('에셋이 없습니다.');
        }
        return {
            id: asset.id,
            title: asset.title,
            description: asset.description || null,
            file_path: asset.file_path || null,
            file_type: asset.file_type || null,
            created_at:
                asset.created_at instanceof Date
                    ? asset.created_at.toISOString()
                    : asset.created_at,
            thumbnail_path: asset.thumbnail_path || null,
        };
    }
}
