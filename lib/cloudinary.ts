const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error("Thiếu CLOUDINARY_CLOUD_NAME hoặc CLOUDINARY_UPLOAD_PRESET trong .env.local");
  }

  return { cloudName, uploadPreset };
}

export async function uploadSetCoverToCloudinary(file: Blob, setKey: string) {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const safeKey = slugify(setKey) || "set";

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "vocabulary-sets/covers");
  form.append("public_id", `set-${safeKey}-${Date.now()}`);

  const response = await fetch(`${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  const data = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message ?? "Upload ảnh lên Cloudinary thất bại");
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
  };
}
