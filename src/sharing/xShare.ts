export function buildXShareUrl(input: {
  nickname: string;
  moveSan: string;
  shareUrl: string;
}): string {
  const text = [
    "♟️ Branch Chess",
    "",
    `${input.nickname}: ${input.moveSan}`,
    "🌿 Your move",
  ].join("\n");
  const params = new URLSearchParams({
    text,
    url: input.shareUrl,
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
