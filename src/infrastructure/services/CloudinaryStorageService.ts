import { IStorageService } from "@/core/services/IStorageService";
import { cloudinary } from "@/lib/cloudinary";

export class CloudinaryStorageService implements IStorageService {
  async uploadImage(fileBuffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // If cloudinary is unconfigured, return a mock URL in dev mode
      if (
        (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === "dummy") &&
        process.env.NODE_ENV !== "production"
      ) {
        console.warn("Cloudinary not configured. Returning mock image URL.");
        resolve(`https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800`);
        return;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload failed:", error);
            reject(new Error("Failed to upload image to Cloudinary"));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error("Empty response from Cloudinary upload"));
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }
}
