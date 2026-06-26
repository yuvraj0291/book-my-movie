export interface IStorageService {
  uploadImage(fileBuffer: Buffer, folder: string): Promise<string>;
}
