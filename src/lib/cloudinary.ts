import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dummy",
  api_key: process.env.CLOUDINARY_API_KEY || "dummy",
  api_secret: process.env.CLOUDINARY_API_SECRET || "dummy",
  secure: true,
});

export { cloudinary };
