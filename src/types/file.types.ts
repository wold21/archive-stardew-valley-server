import { MultipartFile } from '@fastify/multipart';

export interface MultiFileWithBuffer extends MultipartFile {
    buffer: Buffer;
}
export enum UploadType {
    ASSET = 'ASSET',
}

export interface UploadConfig {
    type: UploadType;
    minFiles: number;
    maxFiles: number;
    folderName: string;
}

export interface UploadedFileInfo {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    encoding: string;
    size: number;
}

export interface SavedFileInfo {
    originalName: string;
    storedName: string;
    filePath: string;
    size: number;
    mimeType: string;
    order?: number;
}

export const UPLOAD_CONFIGS: Record<UploadType, UploadConfig> = {
    [UploadType.ASSET]: {
        type: UploadType.ASSET,
        minFiles: 1,
        maxFiles: 1,
        folderName: 'asset',
    },
};
