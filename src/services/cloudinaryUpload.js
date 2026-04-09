const CLOUDINARY_CLOUD_NAME = "dqlbgj9pl";
const CLOUDINARY_UPLOAD_PRESET = "parcel_upload";
const CLOUDINARY_FOLDER = "youdash_express/orders";

/**
 * Unsigned upload to Cloudinary (preset must allow unsigned uploads).
 * @param {File} file
 * @returns {Promise<string>} secure_url
 */
export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", CLOUDINARY_FOLDER);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error?.message || data?.error || `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  if (!data.secure_url) {
    throw new Error("Upload did not return an image URL");
  }
  return data.secure_url;
}
