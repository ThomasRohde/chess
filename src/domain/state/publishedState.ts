export type PublishedStateV1 = {
  version: 1;
  fen: string;
  publishedBy: string;
  lastMove: {
    uci: string;
    san: string;
  } | null;
  createdAt: string;
};

export function createPublishedState(input: {
  fen: string;
  publishedBy: string;
  lastMove: PublishedStateV1["lastMove"];
  now?: Date;
}): PublishedStateV1 {
  return {
    version: 1,
    fen: input.fen,
    publishedBy: input.publishedBy,
    lastMove: input.lastMove,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}
