import * as youtubeApi from '@/lib/youtube-api';
import { matchStreamToGame } from '@/lib/streaming-sync';

describe('CA-02 YouTube API client', () => {
  it('returns [] on error without throwing', async () => {
    const client = Object.values(youtubeApi).find((value) => typeof value === 'function') as
      | ((...args: never[]) => Promise<unknown>)
      | undefined;

    expect(client).toBeDefined();
    await expect(client!()).resolves.toEqual([]);
  });
});

describe('CA-03 Matching streaming-sync', () => {
  const matches = [
    {
      utcDate: '2026-06-20T21:00:00Z',
      homeTeam: 'Brasil',
      awayTeam: 'Argentina',
      homeTeamName: 'Brasil',
      awayTeamName: 'Argentina',
    },
  ];

  it('returns null when scheduledStartTime is outside +/-2h of every match', () => {
    expect(
      matchStreamToGame(
        { title: 'Brasil x Argentina ao vivo', scheduledStartTime: '2026-06-20T00:00:00Z' },
        matches,
      ),
    ).toBeNull();
  });

  it('returns null when no team appears in the title after normalization', () => {
    expect(
      matchStreamToGame(
        { title: 'Show de intervalo ao vivo', scheduledStartTime: '2026-06-20T21:30:00Z' },
        matches,
      ),
    ).toBeNull();
  });

  it('returns the match when time window and title validation pass', () => {
    expect(
      matchStreamToGame(
        { title: 'Brasil x Argentina | ao vivo', scheduledStartTime: '2026-06-20T22:00:00Z' },
        matches,
      ),
    ).toEqual(matches[0]);
  });
});
