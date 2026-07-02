import { NextRequest, NextResponse } from "next/server";
import { uploadSetCoverToCloudinary } from "@/lib/cloudinary";
import { updateVocabularySetCover } from "@/lib/vocabulary/vocabulary-service";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu id bộ từ" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

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

    const uploaded = await uploadSetCoverToCloudinary(file, id);
    const updated = await updateVocabularySetCover(id, {
      coverImageUrl: uploaded.secureUrl,
      coverImagePublicId: uploaded.publicId,
    });

    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy bộ từ" }, { status: 404 });
    }

    return NextResponse.json({ set: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải ảnh bìa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu id bộ từ" }, { status: 400 });
    }

    const updated = await updateVocabularySetCover(id, {
      coverImageUrl: null,
      coverImagePublicId: null,
    });

    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy bộ từ" }, { status: 404 });
    }

    return NextResponse.json({ set: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xóa ảnh bìa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
