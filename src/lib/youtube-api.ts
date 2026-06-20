export async function getCazetvStreams(): Promise<
  { videoId: string; title: string; scheduledStartTime: string; url: string }[]
> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const CHANNEL_ID = "UCrTnMxHCILuNiHsivGHaBJA";
  const BASE = "https://www.googleapis.com/youtube/v3";

  try {
    const ids: string[] = [];
    const titles: Record<string, string> = {};

    for (const eventType of ["upcoming", "live"]) {
      const url = `${BASE}/search?channelId=${CHANNEL_ID}&eventType=${eventType}&type=video&part=snippet&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
      };
      for (const item of data.items ?? []) {
        const videoId = item.id?.videoId;
        if (videoId && !ids.includes(videoId)) {
          ids.push(videoId);
          titles[videoId] = item.snippet?.title ?? "";
        }
      }
    }

    if (ids.length === 0) return [];

    const url = `${BASE}/videos?id=${ids.join(",")}&part=liveStreamingDetails&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: {
        id?: string;
        snippet?: { title?: string };
        liveStreamingDetails?: { scheduledStartTime?: string };
      }[];
    };

    return (data.items ?? []).map((item) => ({
      videoId: item.id ?? "",
      title: titles[item.id ?? ""] ?? item.snippet?.title ?? "",
      scheduledStartTime: item.liveStreamingDetails?.scheduledStartTime ?? "",
      url: `https://www.youtube.com/watch?v=${item.id}`,
    }));
  } catch {
    return [];
  }
}
