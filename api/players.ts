import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { RowDataPacket } from 'mysql2';
import { ensureSchema, getPool, isDbConfigured } from './_db.js';

interface PlayerRow extends RowDataPacket {
  id: string;
  friend_code: string;
  name: string;
  avatar: string;
  pin: string | null;
  selected_grade: string;
  stars: number;
  completed_lessons_json: string;
  learned_words_json: string;
  wrong_words_json: string;
  created_at: Date | string;
}

interface FriendRow extends RowDataPacket {
  player_id: string;
  friend_id: string;
  friend_code: string;
  friend_name: string;
  friend_avatar: string;
  friend_grade: string;
  friend_stars: number;
  added_at: Date | string;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isDbConfigured()) {
    return res.status(503).json({
      ok: false,
      error: 'MySQL environment variables not configured',
    });
  }

  try {
    await ensureSchema();
    const db = getPool();

    if (req.method === 'GET') {
      const [playerRows] = await db.query<PlayerRow[]>(
        'SELECT * FROM players ORDER BY stars DESC, created_at ASC LIMIT 200'
      );
      const [friendRows] = await db.query<FriendRow[]>(
        'SELECT * FROM friendships ORDER BY added_at ASC'
      );

      const friendsByPlayer = new Map<string, FriendRow[]>();
      friendRows.forEach((fr) => {
        const list = friendsByPlayer.get(fr.player_id) ?? [];
        list.push(fr);
        friendsByPlayer.set(fr.player_id, list);
      });

      const players = playerRows.map((row) => ({
        id: row.id,
        friendCode: row.friend_code,
        name: row.name,
        avatar: row.avatar,
        pin: row.pin || undefined,
        progress: {
          selectedGrade: row.selected_grade,
          avatar: row.avatar,
          stars: row.stars,
          completedLessons: safeJsonParse<Record<string, number>>(row.completed_lessons_json, {}),
          learnedWords: safeJsonParse<string[]>(row.learned_words_json, []),
          wrongWords: safeJsonParse<string[]>(row.wrong_words_json, []),
        },
        friends: (friendsByPlayer.get(row.id) ?? []).map((fr) => ({
          id: fr.friend_id,
          friendCode: fr.friend_code,
          name: fr.friend_name,
          avatar: fr.friend_avatar,
          gradeId: fr.friend_grade,
          stars: fr.friend_stars,
          addedAt: new Date(fr.added_at).toISOString(),
        })),
        createdAt: new Date(row.created_at).toISOString(),
      }));

      return res.status(200).json({ ok: true, players });
    }

    if (req.method === 'POST') {
      const body = req.body as {
        player?: {
          id: string;
          friendCode?: string;
          name: string;
          avatar: string;
          pin?: string;
          progress: {
            selectedGrade: string;
            avatar: string;
            stars: number;
            completedLessons: Record<string, number>;
            learnedWords: string[];
            wrongWords: string[];
          };
          friends?: Array<{
            id: string;
            friendCode: string;
            name: string;
            avatar: string;
            gradeId: string;
            stars: number;
          }>;
        };
      };

      const p = body?.player;
      if (!p || !p.id || !p.name) {
        return res.status(400).json({ ok: false, error: 'Missing player payload' });
      }

      const avatar = p.progress.avatar || p.avatar || '🦁';

      await db.query(
        `
        INSERT INTO players (
          id, friend_code, name, avatar, pin, selected_grade, stars,
          completed_lessons_json, learned_words_json, wrong_words_json, last_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          friend_code = VALUES(friend_code),
          name = VALUES(name),
          avatar = VALUES(avatar),
          pin = VALUES(pin),
          selected_grade = VALUES(selected_grade),
          stars = VALUES(stars),
          completed_lessons_json = VALUES(completed_lessons_json),
          learned_words_json = VALUES(learned_words_json),
          wrong_words_json = VALUES(wrong_words_json),
          last_seen = NOW()
        `,
        [
          p.id,
          p.friendCode || 'KL-0000',
          p.name,
          avatar,
          p.pin || null,
          p.progress.selectedGrade || 'k1',
          p.progress.stars || 0,
          JSON.stringify(p.progress.completedLessons ?? {}),
          JSON.stringify(p.progress.learnedWords ?? []),
          JSON.stringify(p.progress.wrongWords ?? []),
        ]
      );

      // Sync friendships if provided
      if (Array.isArray(p.friends)) {
        await db.query('DELETE FROM friendships WHERE player_id = ?', [p.id]);
        for (const f of p.friends) {
          await db.query(
            `
            INSERT INTO friendships (
              player_id, friend_id, friend_code, friend_name, friend_avatar, friend_grade, friend_stars
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              p.id,
              f.id,
              f.friendCode || 'KL-0000',
              f.name,
              f.avatar || '🦁',
              f.gradeId || 'k1',
              f.stars || 0,
            ]
          );
        }
      }

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!id) {
        return res.status(400).json({ ok: false, error: 'Missing player id' });
      }
      await db.query('DELETE FROM friendships WHERE player_id = ?', [id]);
      await db.query('DELETE FROM players WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Database error',
    });
  }
}
