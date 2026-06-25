import { VocabularyCard } from "@/types/vocab";
import { createNewCard } from "@/lib/srs/spaced-repetition";

export const DEMO_VOCABULARY: { word: string; meaning: string }[] = [
  { word: "nutrition", meaning: "dinh dưỡng" },
  { word: "medicine", meaning: "thuốc" },
  { word: "symptom", meaning: "triệu chứng" },
  { word: "hygiene", meaning: "vệ sinh" },
  { word: "illness", meaning: "sự ốm yếu" },
  { word: "infection", meaning: "nhiễm trùng" },
  { word: "fever", meaning: "sốt" },
  { word: "diagnosis", meaning: "chẩn đoán" },
  { word: "therapy", meaning: "liệu pháp điều trị" },
  { word: "prescription", meaning: "đơn thuốc" },
  { word: "surgery", meaning: "phẫu thuật" },
  { word: "vaccination", meaning: "tiêm phòng" },
  { word: "antibiotic", meaning: "kháng sinh" },
  { word: "chronic", meaning: "mãn tính" },
  { word: "epidemic", meaning: "dịch bệnh" },
  { word: "immune", meaning: "miễn dịch" },
  { word: "anatomy", meaning: "giải phẫu học" },
  { word: "rehabilitation", meaning: "phục hồi chức năng" },
];

export function createDemoCards(): VocabularyCard[] {
  return DEMO_VOCABULARY.map(({ word, meaning }) => createNewCard(word, meaning));
}
