import { createStorageAdapter } from '@/adapters/storage/index.js';
import { BadRequestError, NotFoundError } from '@/common/error.js';
import { errorResJson, idParamJson, IdParamType, successResJson } from '@/schemas/common.schema.js';
import { MultiFileWithBuffer, UploadedFileInfo, UploadType } from '@/types/file.types.js';
import { FileManager } from '@/utils/fileManager.js';
import { MultipartFile } from '@fastify/multipart';
import { FastifyInstance } from 'fastify';

export async function uploadRoutes(fastify: FastifyInstance) {
    const fileManager = new FileManager(createStorageAdapter());

    async function handleFileUpload(
        files: MultiFileWithBuffer[],
        type: UploadType,
        entityId: number
    ) {
        const uploadedFiles: UploadedFileInfo[] = files.map((item) => ({
            buffer: item.buffer,
            fileName: item.filename,
            mimeType: item.mimetype,
            encoding: item.encoding,
            size: item.buffer.length,
        }));

        const savedFiles = await fileManager.savefiles(uploadedFiles, type, entityId);

        return savedFiles;
    }
}
