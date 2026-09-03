export interface KnowledgeChunk {
  id: string;
  source: string;
  text: string;
  embedding?: number[];
}

export function chunkDocument(
  source: string,
  content: string,
  maxWords = 120,
): KnowledgeChunk[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: KnowledgeChunk[] = [];
  let current: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    if (
      current.length > 0 &&
      current.join(" ").split(/\s+/).length + words.length > maxWords
    ) {
      chunks.push(makeChunk(source, chunks.length, current.join("\n\n")));
      current = [];
    }
    current.push(paragraph);
  }

  if (current.length > 0) {
    chunks.push(makeChunk(source, chunks.length, current.join("\n\n")));
  }

  return chunks;
}

function makeChunk(
  source: string,
  index: number,
  text: string,
): KnowledgeChunk {
  return {
    id: `${source.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${index}`,
    source,
    text,
  };
}
