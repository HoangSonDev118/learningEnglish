type GeneratedExample = {
  sentence: string;
  translation: string;
  source: string;
};

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export async function generateExamplesForWord(
  word: string,
  meaning: string
): Promise<GeneratedExample[]> {
  const w = word.trim();
  const t = titleCase(w);

  // Deterministic fallback examples so the feature works without an AI key.
  return [
    {
      sentence: `${t} is important for a healthy life.`,
      translation: `${meaning} rất quan trọng cho một cuộc sống khỏe mạnh.`,
      source: "fallback-template",
    },
    {
      sentence: `The teacher explained the word \"${w}\" in class today.`,
      translation: `Giáo viên đã giải thích từ \"${w}\" trong lớp hôm nay.`,
      source: "fallback-template",
    },
    {
      sentence: `I want to improve my understanding of ${w}.`,
      translation: `Tôi muốn cải thiện sự hiểu biết của mình về ${w}.`,
      source: "fallback-template",
    },
    {
      sentence: `She used ${w} correctly in her presentation.`,
      translation: `Cô ấy đã dùng ${w} đúng trong bài thuyết trình của mình.`,
      source: "fallback-template",
    },
    {
      sentence: `Learning ${w} in context helps me remember it longer.`,
      translation: `Học ${w} theo ngữ cảnh giúp tôi nhớ lâu hơn.`,
      source: "fallback-template",
    },
  ];
}
