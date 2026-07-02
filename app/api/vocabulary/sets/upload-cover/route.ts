import { NextRequest, NextResponse } from "next/server";
import { uploadSetCoverToCloudinary } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const setName = String(formData.get("setName") ?? "").trim();
    const file = formData.get("file");

    if (!setName) {
      return NextResponse.json({ error: "Thiếu tên bộ từ" }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Bạn cần chọn file ảnh" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ảnh vượt quá 4MB" }, { status: 400 });
    }

    const mimeType = (file.type || "").toLowerCase();
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Chỉ hỗ trợ file ảnh" }, { status: 400 });
    }

    const uploaded = await uploadSetCoverToCloudinary(file, setName);

    return NextResponse.json({
      coverImageUrl: uploaded.secureUrl,
      coverImagePublicId: uploaded.publicId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải ảnh bìa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
