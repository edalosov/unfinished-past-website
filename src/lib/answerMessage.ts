export function buildAnswerMessage(params: {
  tokenId: string;
  questionText: string;
  answerText: string;
  sharePreference: string;
  timestamp: number;
}) {
  return [
    "Unfinished Past Gallery — Answer Submission",
    "",
    `Token: #${params.tokenId}`,
    `Question: "${params.questionText}"`,
    `Answer: "${params.answerText}"`,
    `Share preference: ${params.sharePreference}`,
    `Timestamp: ${new Date(params.timestamp).toISOString()}`,
  ].join("\n");
}
