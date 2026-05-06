import { randomUUID } from 'crypto';
import { openDb, today } from '../db.js';

export const toolDefs = [
  {
    name: 'get_task_notes',
    description: 'Get all notes/comments on a task — includes agent job results posted back after execution and any human notes.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to fetch notes for' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'add_task_note',
    description: 'Add a note/comment to a task.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        body:    { type: 'string', description: 'Note content (markdown ok)' },
        author:  { type: 'string', description: 'Author label (defaults to "ai")' },
      },
      required: ['task_id', 'body'],
    },
  },
  {
    name: 'get_daily_note',
    description: 'Get the daily note for a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD (defaults to today)' },
      },
    },
  },
  {
    name: 'update_daily_note',
    description: 'Write or update the daily note for a date. Replaces the full content.',
    inputSchema: {
      type: 'object',
      required: ['content'],
      properties: {
        date:    { type: 'string',  description: 'YYYY-MM-DD (defaults to today)' },
        content: { type: 'string',  description: 'Markdown content for the note' },
      },
    },
  },
  {
    name: 'get_week_notes',
    description: 'Get daily notes for the 7 days ending on a given date. Useful for weekly review.',
    inputSchema: {
      type: 'object',
      properties: {
        end_date: { type: 'string', description: 'YYYY-MM-DD (defaults to today)' },
      },
    },
  },
];

export const handlers = {
  get_task_notes(args) {
    const db = openDb();
    const notes = db.prepare(
      `SELECT n.*, aj.status as job_status
       FROM notes n
       LEFT JOIN agent_jobs aj ON aj.id = n.agent_job_id
       WHERE n.task_id = ?
       ORDER BY n.created_at ASC`
    ).all(args.task_id);
    return { task_id: args.task_id, count: notes.length, notes };
  },

  add_task_note(args) {
    const db = openDb();
    const id = randomUUID();
    db.prepare(`INSERT INTO notes (id, task_id, body, author) VALUES (?, ?, ?, ?)`)
      .run(id, args.task_id, args.body, args.author ?? 'ai');
    return { ok: true, note_id: id };
  },

  get_daily_note(args) {
    const date = args.date ?? today();
    const db = openDb();
    const row = db.prepare('SELECT * FROM daily_notes WHERE date = ?').get(date);
    return { date, content: row?.content ?? '' };
  },

  update_daily_note(args) {
    const date = args.date ?? today();
    const db = openDb();
    db.prepare(`
      INSERT INTO daily_notes (date, content, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = datetime('now')
    `).run(date, args.content ?? '');
    return { ok: true, date };
  },

  get_week_notes(args) {
    const end = args.end_date ?? today();
    const db = openDb();
    // Get the 7 days ending on end_date
    const rows = db.prepare(`
      SELECT date, content FROM daily_notes
      WHERE date <= ? AND date >= date(?, '-6 days')
      ORDER BY date DESC
    `).all(end, end);
    return { notes: rows };
  },
};
