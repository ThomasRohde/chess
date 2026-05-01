export function buildXShareUrl(input: {
  nickname: string;
  moveSan: string;
  shareUrl: string;
}): string {
  const text = [
    "♟️ Branch Chess",
    "",
    `${input.nickname} played ${input.moveSan}.`,
    "🌿 A new branch is live.",
    "",
    "Your move:",
  ].join("\n");
  const params = new URLSearchParams({
    hashtags: "BranchChess,Chess",
    text,
    url: input.shareUrl,
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
