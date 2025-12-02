import { IStorageAdapter } from '@/adapters/storage';
import { BadRequestError } from '@/common/error.js';
import { SavedFileInfo, UPLOAD_CONFIGS, UploadedFileInfo, UploadType } from '@/types/file.types.js';
import { randomUUID } from 'crypto';
import path from 'path';
import { getCompactKoreaTimestamp } from './time.js';
import sharp from 'sharp';
import Ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';

export class FileManager {
    private storage: IStorageAdapter;
    private allowedMimeTypes: string[];
    private maxFileSize: number;

    constructor(storage: IStorageAdapter) {
        this.storage = storage;
        this.allowedMimeTypes = process.env.ALLOWED_IMAGE_MIME
            ? process.env.ALLOWED_IMAGE_MIME.split(',')
            : ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'];
        this.maxFileSize = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '104857600');
        Ffmpeg.setFfmpegPath(ffmpegPath.path);
        Ffmpeg.setFfprobePath(ffprobePath.path);
    }

    /**
     * 파일 검증
     * @param file 업로드한 파일
     */
    validateFile(file: UploadedFileInfo): void {
        // MIME 타입
        if (!this.allowedMimeTypes.includes(file.mimeType)) {
            throw new BadRequestError(`허용되지 않는 파일 형식입니다: ${file.mimeType}`);
        }

        // 파일 크기
        if (file.size > this.maxFileSize) {
            throw new BadRequestError(
                `파일 크기가 너무 큽니다. 최대 허용 크기: ${this.maxFileSize} bytes`
            );
        }
    }

    /**
     * 파일명 생성
     * @param originalName 원본 파일명
     * @returns 저장할 파일명
     */
    generateFileName(originalName: string): string {
        const ext = path.extname(originalName);
        const timestamp = getCompactKoreaTimestamp();
        const uuid = randomUUID();
        return `${timestamp}_${uuid}${ext}`;
    }

    /**
     * 업로드 경로
     * @param type 업로드 타입(예: avatar, poster, club_review)
     * @param entityId 엔티티 ID -> 파일의 부모 폴더 명으로 사용됨
     * @returns 업로드 경로
     */
    getUploadPath(type: UploadType, entityId: string | number): string {
        const config = UPLOAD_CONFIGS[type];
        return `${config.folderName}/${entityId}`;
    }

    /**
     * 파일 개수 검증
     * @param files 업로드한 파일들
     * @param type 업로드 타입
     */
    validateFileCount(files: UploadedFileInfo[], type: UploadType): void {
        const config = UPLOAD_CONFIGS[type];
        if (files.length < config.minFiles) {
            throw new BadRequestError(`최소 ${config.minFiles}개의 파일을 업로드해야 합니다.`);
        }

        if (files.length > config.maxFiles) {
            throw new BadRequestError(`최대 ${config.maxFiles}개의 파일만 업로드할 수 있습니다.`);
        }
    }

    /**
     * 다건 파일 저장
     */
    async savefiles(
        files: UploadedFileInfo[],
        type: UploadType,
        entityId: string | number
    ): Promise<SavedFileInfo[]> {
        // 파일 개수 검증
        this.validateFileCount(files, type);

        // 파일 검증
        files.forEach((file) => this.validateFile(file));

        // 기존 폴더 삭제
        // 한장씩 수정가능하게 두는 것보다 업로드 시 기존 사진을 삭제하며 관리하는 편이 좋을 듯함.
        // 사용자가 리뷰 수정 시 기존 이미지가 날아가는 단점이 있음.
        // 기존 폴더가 있는지 확인 후 삭제
        const folderPath = this.getUploadPath(type, entityId);
        const isExist = await this.storage.exists(folderPath);
        if (isExist) {
            await this.storage.deleteFolder(folderPath);
        }

        // 파일 저장
        const savedFiles: SavedFileInfo[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i]!;
            const storedName = this.generateFileName(file.fileName);
            const fileType = this.getFileType(file.mimeType);
            const filePath = `${folderPath}/${storedName}`;

            // 썸네일 작업
            const thumbnailPath = `${folderPath}/thumbnails/${storedName.replace(/\.[^/.]+$/, '.webp')}`;
            if (fileType === 'image') {
                await this.createImageThumbnail(file.buffer, thumbnailPath);
            } else if (fileType === 'video') {
                await this.createVideoThumbnail(file.buffer, thumbnailPath);
            }

            try {
                await this.storage.save(file.buffer, filePath);
                savedFiles.push({
                    originalName: file.fileName,
                    storedName,
                    filePath,
                    size: file.size,
                    mimeType: file.mimeType,
                    thumbnailPath: thumbnailPath,
                    order: i,
                });
            } catch (error: any) {
                await this.rollbackFiles(savedFiles);
                throw new Error(`파일 저장에 실패하였습니다: ${error.message}`);
            }
        }
        return savedFiles;
    }

    private async rollbackFiles(files: SavedFileInfo[]): Promise<void> {
        for (const file of files) {
            try {
                await this.storage.delete(file.filePath);
            } catch (error) {
                throw new Error(`파일 롤백에 실패하였습니다: ${error}`);
            }
        }
    }

    async deleteFolder(type: UploadType, entityId: number | string): Promise<void> {
        const folderPath = this.getUploadPath(type, entityId);
        await this.storage.deleteFolder(folderPath);
    }

    private getFileType(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        return 'other';
    }

    private async createImageThumbnail(buffer: Buffer, thumbnailPath: string): Promise<void> {
        try {
            const thumbnailBuffer = await sharp(buffer).webp({ quality: 30 }).toBuffer();
            await this.storage.save(thumbnailBuffer, thumbnailPath);
        } catch (error) {
            throw new Error(`이미지 썸네일 생성에 실패하였습니다: ${error}`);
        }
    }

    private async getVideoMetadata(filePath: string): Promise<Ffmpeg.FfprobeData> {
        console.log('메타데이터 생성');
        return new Promise((resolve, reject) => {
            Ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(metadata);
                }
            });
            console.log('메타데이터 생성 완료' + filePath);
        });
    }

    private async createVideoThumbnail(buffer: Buffer, thumbnailPath: string): Promise<void> {
        const timestamp = Date.now();
        const tempVideoPath = `temp_video_${timestamp}.mp4`;
        const tempThumbPath = `temp_thumb_${timestamp}.png`;

        try {
            const savedVideoPath = await this.storage.save(buffer, tempVideoPath);
            const metadata = (await this.getVideoMetadata(tempVideoPath)) as Ffmpeg.FfprobeData;
            const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

            if (!videoStream) {
                throw new Error('비디오 스트림을 찾을 수 없습니다.');
            }

            await new Promise<void>((resolve, reject) => {
                Ffmpeg(savedVideoPath)
                    .screenshots({
                        timestamps: ['50%'],
                        filename: tempThumbPath,
                        folder: path.dirname(savedVideoPath),
                    })
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });
            const fullThumbPath = path.join(
                path.dirname(savedVideoPath),
                `temp_thumb_${timestamp}.png`
            );
            const thumbnailBuffer = await sharp(fullThumbPath).webp({ quality: 30 }).toBuffer();

            await this.storage.save(thumbnailBuffer, thumbnailPath);
        } catch (error) {
            throw new Error(`비디오 썸네일 생성에 실패하였습니다: ${error}`);
        } finally {
            await this.storage.delete(tempVideoPath);
            await this.storage.delete(tempThumbPath);
        }
    }
}
