import { query } from '../db.js';

export async function listCategories(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, COUNT(e.id)::int AS event_count
        FROM categories c
        LEFT JOIN events e ON e.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name`,
    );
    res.json({
      data: rows.map((r) => ({ id: r.id, name: r.name, eventCount: r.event_count })),
      meta: { total: rows.length },
    });
  } catch (err) {
    next(err);
  }
}
