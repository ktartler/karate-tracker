import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id VARCHAR(50) PRIMARY KEY,
        active_profile VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        current_belt VARCHAR(50),
        program_name VARCHAR(100),
        leadership_start VARCHAR(50),
        bbc_start VARCHAR(50),
        app_theme VARCHAR(50) DEFAULT 'dark',
        heatmap_theme VARCHAR(50) DEFAULT 'default'
      );

      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_theme VARCHAR(50) DEFAULT 'dark';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS heatmap_theme VARCHAR(50) DEFAULT 'default';


      CREATE TABLE IF NOT EXISTS belts (
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        belt_id VARCHAR(50),
        earned VARCHAR(50),
        promoted VARCHAR(50),
        ceremony_note TEXT,
        stripes_done INTEGER DEFAULT 0,
        sparring_done BOOLEAN DEFAULT FALSE,
        sparring_count INTEGER DEFAULT 0,
        PRIMARY KEY (profile_id, belt_id)
      );

      CREATE TABLE IF NOT EXISTS sparring_logs (
        id VARCHAR(100) PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        date VARCHAR(50),
        notes TEXT,
        belt VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS profile_notes (
        id VARCHAR(100) PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        date VARCHAR(50),
        text TEXT
      );

      CREATE TABLE IF NOT EXISTS training_logs (
        id VARCHAR(100) PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        date VARCHAR(50),
        duration INTEGER,
        focus TEXT,
        felt INTEGER,
        notes TEXT,
        from_calendar BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS goals (
        id VARCHAR(100) PRIMARY KEY,
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        text TEXT,
        belt_id VARCHAR(50),
        done BOOLEAN DEFAULT FALSE,
        created_date VARCHAR(50),
        done_date VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS heatmaps (
        profile_id VARCHAR(100) REFERENCES profiles(id) ON DELETE CASCADE,
        date VARCHAR(50),
        status VARCHAR(50),
        PRIMARY KEY (profile_id, date)
      );

      CREATE TABLE IF NOT EXISTS techniques (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        category VARCHAR(100),
        belt VARCHAR(50),
        learned_date VARCHAR(50),
        notes TEXT,
        mastered BOOLEAN DEFAULT FALSE
      );
    `);

    // Check if we need to migrate existing data.json
    const res = await client.query('SELECT COUNT(*) FROM profiles');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('No profiles found in DB, attempting to migrate data.json...');
      try {
        const dataPath = path.resolve(process.cwd(), 'data.json');
        const fileContent = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        await client.query(
          'INSERT INTO app_settings (id, active_profile) VALUES ($1, $2)',
          ['singleton', data.activeProfile || 'kathrin']
        );

        for (const [profId, prof] of Object.entries(data.profiles || {})) {
          await client.query(
            `INSERT INTO profiles (id, name, type, current_belt, program_name, leadership_start, bbc_start, app_theme, heatmap_theme)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [prof.id, prof.name, prof.type, prof.currentBelt, prof.programName || '', prof.leadershipStart || null, prof.bbcStart || null, prof.appTheme || 'dark', prof.heatmapTheme || 'default']
          );

          for (const [beltId, beltData] of Object.entries(prof.belts || {})) {
            await client.query(
              `INSERT INTO belts (profile_id, belt_id, earned, promoted, ceremony_note, stripes_done, sparring_done, sparring_count)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [prof.id, beltId, beltData.earned || null, beltData.promoted || null, beltData.ceremonyNote || '', beltData.stripesDone || 0, beltData.sparringDone || false, beltData.sparringCount || 0]
            );
          }
          
          for (const log of (prof.sparringLog || [])) {
            await client.query(
              'INSERT INTO sparring_logs (id, profile_id, date, notes, belt) VALUES ($1, $2, $3, $4, $5)',
              [log.id, prof.id, log.date, log.notes || '', log.belt]
            );
          }

          for (const note of (prof.notes || [])) {
            await client.query(
               'INSERT INTO profile_notes (id, profile_id, date, text) VALUES ($1, $2, $3, $4)',
               [note.id, prof.id, note.date, note.text]
            );
          }

          for (const log of (prof.trainingLog || [])) {
             await client.query(
               'INSERT INTO training_logs (id, profile_id, date, duration, focus, felt, notes, from_calendar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
               [log.id, prof.id, log.date, log.duration || 60, log.focus || '', log.felt || 3, log.notes || '', log.fromCalendar || false]
             );
          }

          for (const goal of (prof.goals || [])) {
             await client.query(
               'INSERT INTO goals (id, profile_id, text, belt_id, done, created_date, done_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
               [goal.id, prof.id, goal.text, goal.beltId || '', goal.done || false, goal.createdDate || null, goal.doneDate || null]
             );
          }
          
          for (const [dateString, status] of Object.entries(prof.heatmap || {})) {
             await client.query(
               'INSERT INTO heatmaps (profile_id, date, status) VALUES ($1, $2, $3)',
               [prof.id, dateString, status]
             );
          }
        }
        
        for (const tech of (data.techniques || [])) {
           await client.query(
              `INSERT INTO techniques (id, name, category, belt, learned_date, notes, mastered)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [tech.id, tech.name, tech.category, tech.belt, tech.learnedDate, tech.notes || '', tech.mastered || false]
           );
        }

        console.log('Migration complete!');
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.error('Migration failed:', e);
        } else {
          console.log('No data.json found. Started with empty DB.');
        }
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error in initDB:', e);
  } finally {
    client.release();
  }
}


app.get('/api/load', async (req, res) => {
  try {
    const settingsRes = await pool.query('SELECT * FROM app_settings WHERE id = $1', ['singleton']);
    const activeProfile = settingsRes.rows.length > 0 ? settingsRes.rows[0].active_profile : 'kathrin';

    const profilesRes = await pool.query('SELECT * FROM profiles');
    const profiles = {};

    for (const p of profilesRes.rows) {
      const pId = p.id;
      profiles[pId] = {
        id: pId,
        name: p.name,
        type: p.type,
        currentBelt: p.current_belt,
        programName: p.program_name,
        leadershipStart: p.leadership_start,
        bbcStart: p.bbc_start,
        appTheme: p.app_theme || 'dark',
        heatmapTheme: p.heatmap_theme || 'default',
        belts: {},
        sparringLog: [],
        notes: [],
        trainingLog: [],
        goals: [],
        heatmap: {}
      };

      const beltsRes = await pool.query('SELECT * FROM belts WHERE profile_id = $1', [pId]);
      for (const b of beltsRes.rows) {
        profiles[pId].belts[b.belt_id] = {
          earned: b.earned,
          promoted: b.promoted,
          ceremonyNote: b.ceremony_note,
          stripesDone: Number(b.stripes_done),
          sparringDone: b.sparring_done,
          sparringCount: Number(b.sparring_count)
        };
      }

      const slRes = await pool.query('SELECT * FROM sparring_logs WHERE profile_id = $1 ORDER BY date DESC', [pId]);
      profiles[pId].sparringLog = slRes.rows.map(sl => ({
        id: sl.id, date: sl.date, notes: sl.notes, belt: sl.belt
      }));

      const pnRes = await pool.query('SELECT * FROM profile_notes WHERE profile_id = $1 ORDER BY date DESC', [pId]);
      profiles[pId].notes = pnRes.rows.map(n => ({
        id: n.id, date: n.date, text: n.text
      }));

      const tlRes = await pool.query('SELECT * FROM training_logs WHERE profile_id = $1 ORDER BY date DESC', [pId]);
      profiles[pId].trainingLog = tlRes.rows.map(tl => ({
        id: tl.id, date: tl.date, duration: tl.duration, focus: tl.focus, felt: tl.felt, notes: tl.notes, fromCalendar: tl.from_calendar
      }));
      
      const glRes = await pool.query('SELECT * FROM goals WHERE profile_id = $1 ORDER BY created_date DESC', [pId]);
      profiles[pId].goals = glRes.rows.map(g => ({
        id: g.id, text: g.text, beltId: g.belt_id, done: g.done, createdDate: g.created_date, doneDate: g.done_date
      }));

      const hmRes = await pool.query('SELECT * FROM heatmaps WHERE profile_id = $1', [pId]);
      for (const h of hmRes.rows) {
        profiles[pId].heatmap[h.date] = h.status;
      }
    }

    const techRes = await pool.query('SELECT * FROM techniques');
    const techniques = techRes.rows.map(t => ({
      id: t.id, name: t.name, category: t.category, belt: t.belt, learnedDate: t.learned_date, notes: t.notes, mastered: t.mastered
    }));

    res.json({
      activeProfile,
      profiles,
      techniques
    });

  } catch (e) {
    console.error('Error in /api/load:', e);
    res.status(500).json({ error: 'Server error loading data' });
  }
});


app.post('/api/save', async (req, res) => {
  const data = req.body;
  if (!data || !data.profiles) return res.status(400).json({ error: 'Invalid data format' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // UPSERT APP SETTINGS
    await client.query(
      `INSERT INTO app_settings (id, active_profile) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET active_profile = EXCLUDED.active_profile`,
      ['singleton', data.activeProfile || 'kathrin']
    );

    // PROCESS PROFILES AND SUB-COLLECTIONS
    for (const [profId, prof] of Object.entries(data.profiles)) {
      await client.query(
        `INSERT INTO profiles (id, name, type, current_belt, program_name, leadership_start, bbc_start, app_theme, heatmap_theme)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, type = EXCLUDED.type, current_belt = EXCLUDED.current_belt,
          program_name = EXCLUDED.program_name, leadership_start = EXCLUDED.leadership_start,
          bbc_start = EXCLUDED.bbc_start, app_theme = EXCLUDED.app_theme, heatmap_theme = EXCLUDED.heatmap_theme`,
        [prof.id, prof.name, prof.type, prof.currentBelt, prof.programName || '', prof.leadershipStart || null, prof.bbcStart || null, prof.appTheme || 'dark', prof.heatmapTheme || 'default']
      );

      for (const [beltId, beltData] of Object.entries(prof.belts || {})) {
        await client.query(
          `INSERT INTO belts (profile_id, belt_id, earned, promoted, ceremony_note, stripes_done, sparring_done, sparring_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (profile_id, belt_id) DO UPDATE SET
            earned = EXCLUDED.earned, promoted = EXCLUDED.promoted, ceremony_note = EXCLUDED.ceremony_note,
            stripes_done = EXCLUDED.stripes_done, sparring_done = EXCLUDED.sparring_done, sparring_count = EXCLUDED.sparring_count`,
          [prof.id, beltId, beltData.earned || null, beltData.promoted || null, beltData.ceremonyNote || '', beltData.stripesDone || 0, beltData.sparringDone || false, beltData.sparringCount || 0]
        );
      }

      // Arrays are simpler to just delete and recreate for a sync.
      // This is safe because we wrap it all in a BEGIN/COMMIT block!
      await client.query('DELETE FROM sparring_logs WHERE profile_id = $1', [prof.id]);
      for (const log of (prof.sparringLog || [])) {
        await client.query(
          'INSERT INTO sparring_logs (id, profile_id, date, notes, belt) VALUES ($1, $2, $3, $4, $5)',
          [log.id, prof.id, log.date, log.notes || '', log.belt]
        );
      }

      await client.query('DELETE FROM profile_notes WHERE profile_id = $1', [prof.id]);
      for (const note of (prof.notes || [])) {
        await client.query(
           'INSERT INTO profile_notes (id, profile_id, date, text) VALUES ($1, $2, $3, $4)',
           [note.id, prof.id, note.date, note.text]
        );
      }

      await client.query('DELETE FROM training_logs WHERE profile_id = $1', [prof.id]);
      for (const log of (prof.trainingLog || [])) {
         await client.query(
           'INSERT INTO training_logs (id, profile_id, date, duration, focus, felt, notes, from_calendar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
           [log.id, prof.id, log.date, log.duration || 60, log.focus || '', log.felt || 3, log.notes || '', log.fromCalendar || false]
         );
      }

      await client.query('DELETE FROM goals WHERE profile_id = $1', [prof.id]);
      for (const goal of (prof.goals || [])) {
         await client.query(
           'INSERT INTO goals (id, profile_id, text, belt_id, done, created_date, done_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
           [goal.id, prof.id, goal.text, goal.beltId || '', goal.done || false, goal.createdDate || null, goal.doneDate || null]
         );
      }
      
      await client.query('DELETE FROM heatmaps WHERE profile_id = $1', [prof.id]);
      for (const [dateString, status] of Object.entries(prof.heatmap || {})) {
         await client.query(
           'INSERT INTO heatmaps (profile_id, date, status) VALUES ($1, $2, $3)',
           [prof.id, dateString, status]
         );
      }
    }

    // PROCESS TECHNIQUES
    await client.query('DELETE FROM techniques'); // simple sync since we have the full array
    for (const tech of (data.techniques || [])) {
       await client.query(
          `INSERT INTO techniques (id, name, category, belt, learned_date, notes, mastered)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tech.id, tech.name, tech.category, tech.belt, tech.learnedDate, tech.notes || '', tech.mastered || false]
       );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error in /api/save:', e);
    res.status(500).json({ error: 'Server error saving data' });
  } finally {
    client.release();
  }
});

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
});
