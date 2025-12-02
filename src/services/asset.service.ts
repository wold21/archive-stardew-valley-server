import { createStorageAdapter } from '@/adapters/storage/index.js';
import { NotFoundError } from '@/common/error.js';
import { AssetType } from '@/schemas/asset.schema.js';
import { UploadedFileInfo, UploadType } from '@/types/file.types.js';
import { FileManager } from '@/utils/fileManager.js';
import { PrismaClient } from '@prisma/client';

export class assetService {
    constructor(private prisma: PrismaClient) {}

    private getFileType(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        return 'other';
    }

    async getAssets(offset: number, limit: number): Promise<any> {
        const [assets, total] = await Promise.all([
            this.prisma.assets_tb.findMany({
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.assets_tb.count(),
        ]);

        return {
            items: assets.map((asset) => ({
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

    async deleteAsset(id: number): Promise<void> {
        const asset = await this.prisma.assets_tb.findUnique({
            where: { id },
        });
        if (!asset) {
            throw new NotFoundError('에셋이 없습니다.');
        }
        await this.prisma.assets_tb.delete({
            where: { id },
        });
        if (asset.file_path) {
            const fileManager = new FileManager(createStorageAdapter());
            await fileManager.deleteFolder(UploadType.ASSET, id);
        }
    }

    async createAssetsBulk(
        assetData: Array<{
            file: UploadedFileInfo;
            title: string;
            description?: string;
        }>
    ): Promise<void> {
        const createdIds: number[] = [];

        try {
            for (const item of assetData) {
                const asset = await this.prisma.assets_tb.create({
                    data: {
                        title: item.title,
                        description: item.description || null,
                    },
                });

                createdIds.push(asset.id);

                const fileManager = new FileManager(createStorageAdapter());
                const savedFiles = await fileManager.savefiles(
                    [item.file],
                    UploadType.ASSET,
                    asset.id
                );
                const savedFile = savedFiles[0];

                if (!savedFile) {
                    throw new Error('파일 저장에 실패하였습니다.');
                }

                await this.prisma.assets_tb.update({
                    where: { id: asset.id },
                    data: {
                        file_path: savedFile.filePath,
                        file_type: this.getFileType(savedFile.mimeType),
                        file_size: savedFile.size,
                        original_name: savedFile.originalName,
                        thumbnail_path: savedFile.thumbnailPath || null,
                    },
                });
            }
        } catch (error) {
            for (const id of createdIds) {
                await this.prisma.assets_tb
                    .delete({
                        where: { id },
                    })
                    .catch(() => {});
            }
            throw error;
        }
    }
}
