const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();

// On Railway, data is persisted in a mounted volume at /app.
// Locally it lives right in the project folder.
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/parish_data.sqlite`
  : './parish_data.sqlite';
const db = new sqlite3.Database(DB_PATH);

app.use(bodyParser.json());
app.use(express.static('public'));

// ── INITIALIZE TABLES ──────────────────────────────────────────────────────
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS teachers (email TEXT PRIMARY KEY, password TEXT, name TEXT, assigned_group TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS students (email TEXT PRIMARY KEY, password TEXT, name TEXT, parish_group TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, parish_group TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS progress (student_email TEXT, lesson_title TEXT, status TEXT, date TEXT, t_comment TEXT, s_comment TEXT)");
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_email TEXT NOT NULL, lesson_title TEXT NOT NULL,
    author_email TEXT NOT NULL, author_name TEXT NOT NULL,
    role TEXT NOT NULL, comment_text TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS groups (name TEXT PRIMARY KEY, sort_order INTEGER DEFAULT 99)`);

  db.run(`CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    opt_a TEXT NOT NULL, opt_b TEXT NOT NULL,
    opt_c TEXT DEFAULT '', opt_d TEXT DEFAULT '',
    correct TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_email TEXT NOT NULL,
    lesson_id INTEGER NOT NULL,
    answers TEXT NOT NULL,
    auto_score INTEGER,
    manual_score INTEGER,
    teacher_note TEXT DEFAULT '',
    submitted_at TEXT NOT NULL
  )`);
  // Migrations — safe to run every time
  db.run("ALTER TABLE lessons ADD COLUMN body_text TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE lessons ADD COLUMN video_url TEXT DEFAULT ''", () => {});
  db.run("ALTER TABLE lessons ADD COLUMN quiz_enabled INTEGER DEFAULT 0", () => {});

  // Seed default groups if table is empty
  db.get("SELECT count(*) as c FROM groups", (err, row) => {
    if (row && row.c === 0) {
      const defaults = [
        ['Grade 1',1],['Grade 2',2],['Grade 3',3],['Grade 4',4],
        ['Grade 5',5],['Grade 6',6],['Grade 7',7],['Grade 8',8],['Adult',9]
      ];
      const stmt = db.prepare("INSERT OR IGNORE INTO groups (name, sort_order) VALUES (?, ?)");
      defaults.forEach(g => stmt.run(g));
      stmt.finalize();
    }
  });
});

// ── SETUP & AUTH ───────────────────────────────────────────────────────────
app.get('/api/check-setup', (req, res) => {
  db.get("SELECT count(*) as count FROM teachers", (err, row) => {
    res.json({ needsSetup: !row || row.count === 0 });
  });
});

app.post('/api/setup', (req, res) => {
  const { parishName, motto, adminEmail, adminPassword, recoveryPhrase, orgType, loadSamples } = req.body;
  db.serialize(() => {
    db.run("INSERT OR REPLACE INTO config VALUES ('parish_name', ?)", [parishName]);
    db.run("INSERT OR REPLACE INTO config VALUES ('motto', ?)", [motto || '']);
    db.run("INSERT OR REPLACE INTO config VALUES ('recovery_phrase', ?)", [recoveryPhrase || '']);
    db.run("INSERT OR REPLACE INTO config VALUES ('org_type', ?)", [orgType || 'other']);
    db.run("INSERT OR IGNORE INTO teachers (email, password, name, assigned_group) VALUES (?, ?, 'Admin', 'All')", [adminEmail, adminPassword]);

    if (loadSamples) {
      const sampleLessons = [
        ["Why Life","","Adult"],["Life is from God","","Adult"],["Made in the Divine Image","","Adult"],
        ["Change: Creation is Not Finished","","Adult"],["We Are Called to Fulfill God's Plan","","Adult"],
        ["A Broken World","","Adult"],["It is So from the Beginning","","Adult"],["The Sin of Adam","","Adult"],
        ["The Forces of Evil","","Adult"],["Jesus Is the Word of God","","Adult"],["I Am the Way","","Adult"],
        ["The Cross: Christ's Way to Life","","Adult"],["We Are Sharers in Jesus' Victory","","Adult"],
        ["Repentance: the Journey to Victory","","Adult"],["We Wait in Hope","","Adult"],["From Glory to Glory","","Adult"],
        ["Facing Death","","Adult"],["Life after Death","","Adult"],["The Life of the World to Come","","Adult"],
        ["Man and Woman: He Created Them","","Adult"],["The Apostles: Witness to Christ","","Adult"],
        ["The Apostolic Church","","Adult"],["The Church is Persecuted","","Adult"],["The Church is Freed","","Adult"],
        ["The Church in Council","","Adult"],["The Church Reaches Out","","Adult"],["The Church Suffers","","Adult"],
        ["The Church in the New Age","","Adult"],["The Church in a New World","","Adult"],
        ["Nativity: Humanity Re-Created","","Adult"],["Theophany: Creation Renewed","","Adult"],
        ["The Pascha of Christ","215-220","Adult"],["The Entrance into Jerusalem and Holy Week","221-224","Adult"],
        ["The Passion of Christ","226-227","Adult"],["The Resurrection and the Descent into Hades","223-234","Adult"],
        ["The Ascension: Human Nature Raised to Divine Glory","236-237","Adult"],
        ["The Second Coming and the Presence of the Risen Christ","238-242","Adult"],
        ["The Union of Earthly and Heavenly Creation","243-244","Adult"],["The Resurrection of the Dead","245-247","Adult"],
        ["Divine Judgment, Purification, and Hell","248-251","Adult"],
        ["God All in All: Heaven and the Transfigured World","252-254","Adult"],
        ["Christ in Our Midst","403-404","Adult"],["Seven Sacraments","405","Adult"],
        ["Christian Initiation","408","Adult"],["Baptism","409-423","Adult"],
        ["Chrismation","424-430","Adult"],["Eucharist","431-446","Adult"],
        ["Healing","447-448","Adult"],["Repentance","449-467","Adult"],
        ["Holy Annointing","468-469","Adult"],["Marriage","471-484","Adult"],
        ["Holy Orders","485-499","Adult"],["Sunday, the Resurrection, and the Lord's Day","559-839","Adult"],
        ["The Virtues of Faith, Hope, and Love","834-849","Adult"],["The Spiritual Life and Divinization","850-855","Adult"],
        ["Care for Parents and the Christian Understanding of Death","898-910","Adult"],
        ["The State, Civic Duty, and Love for Country","954-974","Adult"],
        ["The Family as a Domestic Church and the Gift of Sexuality","856-861","Adult"],
        ["Marital Fidelity, Fruitfulness, and Responsible Parenthood","866-872","Adult"],
        ["The Defence of Human Life: From Conception to Natural Death","880-904","Adult"],
        ["The Church, Civil Society, and Social Virtues","918-935","Adult"],
        ["Justice, Truth, and Morality in the Mass Media","942-945","Adult"],
        ["The Economy, Human Labour, and the Value of Rest","975-984","Adult"],
        ["Preserving Peace in the Modern World","986-988","Adult"],
        ["Responsibility for God's Creation and the Environment","991-997","Adult"],
        ["The New Heaven and the New Earth","999-1000","Adult"],
        ["Catechetical Truths","pg 313","Adult"],["Virtues","pg 314","Adult"],
        ["Fasts and Exemptions","pg 315","Adult"],["Sins","pg 316","Adult"],["Social Directives","pg 317","Adult"],
        ["1. Our Church Family","","Grade 1"],["2. Our Church Family Worships God","","Grade 1"],
        ["3. God Is Holy","","Grade 1"],["4. God Created the World","","Grade 1"],["5. God Created Us","","Grade 1"],
        ["6. God's Word","","Grade 1"],["7. God's Love","","Grade 1"],["8. Jesus Is God's Son","","Grade 1"],
        ["9. Jesus Taught Us that God is Our Father","","Grade 1"],["10. Jesus Taught Us to Love","","Grade 1"],
        ["11. Jesus Taught Us to Ask Forgiveness","","Grade 1"],["12. We Love Each Other","","Grade 1"],
        ["13. We Make Mistakes","","Grade 1"],["14. We are Forgiven","","Grade 1"],["15. We Learn to Forgive","","Grade 1"],
        ["16. God's Family Loves God","","Grade 1"],["17. God's Family Sings Psalms","","Grade 1"],
        ["18. We Call Our Priests \"Father\"","","Grade 1"],["19. We Call Jesus \"Lord\"","","Grade 1"],
        ["20. We Worship the Trinity","","Grade 1"],["21. We Receive Holy Communion","","Grade 1"],
        ["22. We Share in Church","","Grade 1"],["23. Nativity of Our Lord","","Grade 1"],
        ["24. Theophany","","Grade 1"],["25. The Great Fast","","Grade 1"],
        ["26. Palm Sunday","","Grade 1"],["27. Pascha","","Grade 1"],
        ["1. God the Father, Son and Holy Spirit","","Grade 2"],["2. God Our Creator Loves Us.","","Grade 2"],
        ["3. Jesus is Sent to Lead Us to the Father","","Grade 2"],["4. The Mother of God Says \"Yes\"","","Grade 2"],
        ["5. The Disciples Say \"Yes\"","","Grade 2"],["6. I Say \"Yes\"","","Grade 2"],["7. I am Baptized","","Grade 2"],
        ["8. Signs of New Life","","Grade 2"],["9. Jesus Promises the Holy Spirit","","Grade 2"],
        ["10. I Am Chrismated","","Grade 2"],["11. Jesus Feeds the Five Thousand","","Grade 2"],
        ["12. The Bread of Life","","Grade 2"],["13. I Receive the Bread of Life","","Grade 2"],
        ["14. Now We can Pray \"Our Father\"","","Grade 2"],["15. We are Called \"God's People\"","","Grade 2"],
        ["16. In the Divine Liturgy We Remember","","Grade 2"],["17. In the Divine Liturgy We Receive","","Grade 2"],
        ["18. We Say \"Yes\" When We Pray, Fast, and Follow","","Grade 2"],
        ["19. We Love God When We Keep the Lord's Day","","Grade 2"],
        ["20. We Love God and Keep the Commandments","","Grade 2"],["21. We Love God and Our Neighbor","","Grade 2"],
        ["22. When I Say \"No\"","","Grade 2"],["23. The Holy Spirit: Calls Me Back","","Grade 2"],
        ["24. The Holy Spirit: Comes to Us","","Grade 2"],["25. We Share What We Have","","Grade 2"],
        ["26. We Share God's Word","","Grade 2"],["27. We Share Our Faith","","Grade 2"],
        ["1. Our New Life with God","","Grade 3"],["2. Jesus is Our Savior","","Grade 3"],
        ["3. Jesus Calls All People to Be Saved","","Grade 3"],["4. Our Church Follows Jesus","","Grade 3"],
        ["5. God's People Are the Church","","Grade 3"],["6. The Church has Leaders","","Grade 3"],
        ["7. God Is with Us in Our Church","","Grade 3"],
        ["8. We Meet the Lord Jesus in the Holy Place","","Grade 3"],
        ["9. We Meet the Lord Jesus in Icons","","Grade 3"],
        ["10. As Church, We Prepare for the Nativity","","Grade 3"],
        ["11. As Church, We Believe","","Grade 3"],["12. As Church, We Worship","","Grade 3"],
        ["13. As Church, We Show Our Love","","Grade 3"],["14. As Church, We Serve","","Grade 3"],
        ["15. As Church, We Receive","","Grade 3"],["16. The Great Fast: A Holy Season","","Grade 3"],
        ["17. Prayer, Fasting, and Almsgiving","","Grade 3"],
        ["18. When We Turn Away from God's Love, We Sin","","Grade 3"],
        ["19. We Ask God to Forgive Us","","Grade 3"],
        ["20. Jesus Helps Us Prepare for Pascha","","Grade 3"],
        ["21. Jesus Gives Himself Totally for Us","","Grade 3"],
        ["22. The Saints Are with God","","Grade 3"],["23. The Theotokos Prays for Us","","Grade 3"],
        ["24. The Nativity of Jesus Christ","","Grade 3"],["25. Pascha","","Grade 3"],
        ["26. The Ascension","","Grade 3"],["27. Pentecost","","Grade 3"],
        ["1. God Promises to Send a Savior","","Grade 4"],["2. Jesus Sends the Holy Spirit","","Grade 4"],
        ["3. The Bible: God Speaks to Us","","Grade 4"],["4. Wisdom: Let Us Be Attentive","","Grade 4"],
        ["5. We Meet the Lord Jesus in the New Testament","","Grade 4"],
        ["6. God Chooses a Leader","","Grade 4"],["7. God Save His People","","Grade 4"],
        ["8. God's Chosen People","","Grade 4"],["9. Love of God","","Grade 4"],
        ["10. Love of Neighbor","","Grade 4"],["11. God Remains Faithful","","Grade 4"],
        ["12. What is Imposssible for Man is Possible for God","","Grade 4"],
        ["13. God Sends Us a Savior","","Grade 4"],["14. Jesus is the Son of God","","Grade 4"],
        ["15. Jesus Fulfills the Law","","Grade 4"],["16. Jesus Calls People to Follow Him","","Grade 4"],
        ["17. Jesus Teaches Us How to Live As God's Children","","Grade 4"],
        ["18. Jesus Teaches Us True Happiness","","Grade 4"],["19. Jesus is the Way","","Grade 4"],
        ["20. Living in God's Love","","Grade 4"],["21. To Sin is to Turn Away","","Grade 4"],
        ["22. Jesus Is Always Faithful","","Grade 4"],["23. The Lord Gives Us Peace","","Grade 4"],
        ["24. The Encounter of Our Lord in the Temple","","Grade 4"],
        ["25. The Great Fast","","Grade 4"],["26. Pascha","","Grade 4"],
        ["27. The Transfiguration of Christ","","Grade 4"],
        ["1. Called to the New Covenant","","Grade 5"],
        ["2. Baptism: The Lord Enters Our Lives","","Grade 5"],
        ["3. Chrismation: The Lord Seals This New Relationship","","Grade 5"],
        ["4. Alive in Christ","","Grade 5"],["5. A Christian Is","","Grade 5"],
        ["6. The Church is God's People","","Grade 5"],
        ["7. The Church Building Helps Us \"See\" The Church","","Grade 5"],
        ["8. The Liturgy Enables Us to \"Be\" The Church","","Grade 5"],
        ["9. Marrigage Helps Us Understand The Church","","Grade 5"],
        ["10. The Church Is Christ's Body","","Grade 5"],["11. I am Part of This Body","","Grade 5"],
        ["12. Growing Up in Christ","","Grade 5"],
        ["13. Those Who Gave Their Life for Christ","","Grade 5"],
        ["14. Those Who Are Shepherds and Teachers","","Grade 5"],
        ["15. Those Who Can Help Others","","Grade 5"],["16. Those Who Are Sent","","Grade 5"],
        ["17. Those Who Announce God's Kingdom","","Grade 5"],
        ["18. Those Who Have the Gift of Healing","","Grade 5"],
        ["19. Those Who Shared Wisdom","","Grade 5"],["20. Those Who Defend the Weak","","Grade 5"],
        ["21. Those Who Praise God in Paint and Song","","Grade 5"],
        ["22. Let Us Celebrate God's Gifts","","Grade 5"],
        ["23. Theophany","","Grade 5"],["24. Annunciation/Visitation","","Grade 5"],
        ["25. The Great Fast","","Grade 5"],["26. Pascha/Myrrhbearers","","Grade 5"],
        ["27. Pentecost","","Grade 5"],
        ["1. We Are Called to Grow Closer To God","","Grade 6"],
        ["2. We Are Called to Grow in the Church","","Grade 6"],
        ["3. Salvation History: God Acting in the World","","Grade 6"],
        ["4. The Bible: Our Record of Salvation History","","Grade 6"],
        ["5. The Life and Times of God's People","","Grade 6"],["6. Abraham: Father of Faith","","Grade 6"],
        ["7. Joseph: Man of Endurance","","Grade 6"],["8. Moses: Steadfast before the Lord","","Grade 6"],
        ["9. Ruth: Example of Self-Sacrifice","","Grade 6"],["10. David: Ancestor of Christ","","Grade 6"],
        ["11. Jeremiah: God's Prophet","","Grade 6"],["12. Esther: Instrument of God's Promise","","Grade 6"],
        ["13. John the Baptist: Forerunner of the Messiah","","Grade 6"],
        ["14. Jesus: Son of David, Son of Abraham","","Grade 6"],
        ["15. Apostles: Witnesses to Christ","","Grade 6"],["16. The Apostolic Church","","Grade 6"],
        ["17. The Church is Persecuted","","Grade 6"],["18. The Church is Freed","","Grade 6"],
        ["19. The Church in Council","","Grade 6"],["20. The Church Reaches Out","","Grade 6"],
        ["21. The Church Suffers","","Grade 6"],["22. The Church in the New Age","","Grade 6"],
        ["23. The Church in the New World","","Grade 6"],
        ["24. The Mother of God Announces Christ","","Grade 6"],
        ["25. Exaltation of the Precious Cross","","Grade 6"],
        ["26. Sunday of Ancestors of Christ","","Grade 6"],
        ["27. Pascha: The New Passover","","Grade 6"],
        ["1. Why Life?","","Grade 7"],["2. Life is from God","","Grade 7"],["3. Made in the Divine Image","","Grade 7"],
        ["4. Change: Creation Is Not Finished","","Grade 7"],["5. We Are Called to Fulfill God's Plan","","Grade 7"],
        ["6. A Broken World","","Grade 7"],["7. It Is So from the Beginning","","Grade 7"],["8. The Sin of Adam","","Grade 7"],
        ["9. The Forces of Evil","","Grade 7"],["10. Jesus is the Word of God","","Grade 7"],["11. I Am the Way","","Grade 7"],
        ["12. The Cross: Christ's Way to Life","","Grade 7"],["13. We Are Sharers in Jesus' Victory","","Grade 7"],
        ["14. Repentance: the Journey to Victory","","Grade 7"],["15. We Wait in Hope","","Grade 7"],
        ["16. From Glory to Glory","","Grade 7"],["17. Facing Death","","Grade 7"],
        ["18. Life After Death","","Grade 7"],["19. The Life of the World to Come","","Grade 7"],
        ["20. Man and Woman: He Created Them","","Grade 7"],["21. Brokeness in Relationships","","Grade 7"],
        ["22. One in Christ","","Grade 7"],["23. Unmarried for the Kingdom","","Grade 7"],
        ["24. Nativity: Humanity Re-Created","","Grade 7"],["25. Theophany: Creation Renewed","","Grade 7"],
        ["26. Pascha: Jesus Triumphs over Sin and Death","","Grade 7"],["27. Transfiguration","","Grade 7"],
        ["1. Our Life Is a Meaningful Journey","","Grade 8"],["2. People Travel Together","","Grade 8"],
        ["3. Christians Follow Jesus","","Grade 8"],["4. The Church Is a Community of Faith","","Grade 8"],
        ["5. Holy Eucharist Nourishes Us on Our Journey","","Grade 8"],
        ["6. Scripture: Listening to God's Word","","Grade 8"],
        ["7. Prayer: Growing in Relationship with God","","Grade 8"],
        ["8. Fasting: Keeping Us Focused on Our Journey","","Grade 8"],
        ["9. Feast Days: Recalling God's Blessings","","Grade 8"],["10. Divine Services: Traveling Together","","Grade 8"],
        ["11. Sin: Turning off the Path","","Grade 8"],["12. Repentance: Finding Our Way Again","","Grade 8"],
        ["13. Healing: Regaining Strength for the Journey","","Grade 8"],["14. We Serve God and Each Other","","Grade 8"],
        ["15. We Are Faithful Servants","","Grade 8"],["16. Our Family Helps Us","","Grade 8"],
        ["17. Ordained Servants Help Us","","Grade 8"],["18. We Share Our Blessings","","Grade 8"],
        ["19. We Share the Good News","","Grade 8"],["20. We Journey Alone with Christ","","Grade 8"],
        ["21. We Journey with Family and Friends","","Grade 8"],["22. We Journey with the Church","","Grade 8"],
        ["23. We become One with Christ","","Grade 8"],["24. Saint Nicholas","","Grade 8"],
        ["25. The Entrance into Jerusalem","","Grade 8"],["26. Pascha","","Grade 8"],["27. Saints Peter and Paul.","","Grade 8"]
      ];
      const stmt = db.prepare("INSERT INTO lessons (title, content, parish_group) VALUES (?, ?, ?)");
      sampleLessons.forEach(l => stmt.run(l));
      stmt.finalize();
    }
  });
  res.json({ success: true });
});

// Password recovery (admin only — verifies stored recovery phrase)
app.post('/api/reset-password', (req, res) => {
  const { email, recoveryPhrase, newPassword } = req.body;
  if (!email || !recoveryPhrase || !newPassword)
    return res.status(400).json({ error: 'All fields are required.' });

  db.get("SELECT value FROM config WHERE key = 'recovery_phrase'", (err, row) => {
    if (!row || !row.value)
      return res.status(400).json({ error: 'No recovery phrase has been configured.' });
    if (row.value.trim() !== recoveryPhrase.trim())
      return res.status(400).json({ error: 'Recovery phrase is incorrect.' });
    db.run("UPDATE teachers SET password = ? WHERE email = ?", [newPassword, email], function(e) {
      if (e || this.changes === 0)
        return res.status(400).json({ error: 'No teacher account found with that email.' });
      res.json({ success: true });
    });
  });
});

// ── DATA ───────────────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  let d = { teachers: [], students: [], lessons: [], progress: [], config: {}, groups: [] };
  db.serialize(() => {
    db.all("SELECT * FROM config", (e, rows) => { if (rows) rows.forEach(r => d.config[r.key] = r.value); });
    db.all("SELECT * FROM teachers", (e, rows) => { d.teachers = rows || []; });
    db.all("SELECT * FROM students", (e, rows) => { d.students = rows || []; });
    db.all("SELECT * FROM lessons", (e, rows) => { d.lessons = rows || []; });
    db.all("SELECT * FROM progress", (e, rows) => { d.progress = rows || []; });
    db.all("SELECT name FROM groups ORDER BY sort_order, name", (e, rows) => {
      d.groups = (rows || []).map(r => r.name);
      res.json(d);
    });
  });
});

// ── PROGRESS ───────────────────────────────────────────────────────────────
app.post('/api/progress', (req, res) => {
  const { student_email, lesson_title, status, date, t_comment, s_comment } = req.body;
  db.run("DELETE FROM progress WHERE student_email = ? AND lesson_title = ?", [student_email, lesson_title], () => {
    db.run("INSERT INTO progress (student_email, lesson_title, status, date, t_comment, s_comment) VALUES (?, ?, ?, ?, ?, ?)",
      [student_email, lesson_title, status, date, t_comment, s_comment], () => res.json({ success: true }));
  });
});

// ── COMMENTS ───────────────────────────────────────────────────────────────
app.get('/api/comments', (req, res) => {
  const { student_email, lesson_title } = req.query;
  if (!student_email || !lesson_title) return res.status(400).json({ error: 'Missing params' });
  db.all("SELECT * FROM comments WHERE student_email=? AND lesson_title=? ORDER BY created_at ASC",
    [student_email, lesson_title], (err, rows) => res.json(rows || []));
});

app.post('/api/comments', (req, res) => {
  const { student_email, lesson_title, author_email, author_name, role, comment_text } = req.body;
  if (!student_email || !lesson_title || !author_email || !comment_text)
    return res.status(400).json({ error: 'Missing fields' });
  const created_at = new Date().toISOString();
  db.run("INSERT INTO comments (student_email,lesson_title,author_email,author_name,role,comment_text,created_at) VALUES (?,?,?,?,?,?,?)",
    [student_email, lesson_title, author_email, author_name || author_email, role || 'student', comment_text, created_at],
    function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ success: true, id: this.lastID }); });
});

app.delete('/api/comments/:id', (req, res) => {
  db.run("DELETE FROM comments WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// ── LESSONS ────────────────────────────────────────────────────────────────
app.post('/api/lessons', (req, res) => {
  const { title, content, group, body_text, video_url } = req.body;
  db.run("INSERT INTO lessons (title, content, parish_group, body_text, video_url) VALUES (?, ?, ?, ?, ?)",
    [title, content || '', group, body_text || '', video_url || ''],
    function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ success: true, id: this.lastID }); });
});

app.put('/api/lessons/:id', (req, res) => {
  const { title, content, body_text, video_url, parish_group } = req.body;
  db.run("UPDATE lessons SET title=COALESCE(?,title), content=COALESCE(?,content), body_text=COALESCE(?,body_text), video_url=COALESCE(?,video_url), parish_group=COALESCE(?,parish_group) WHERE id=?",
    [title, content, body_text, video_url, parish_group, req.params.id],
    () => res.json({ success: true }));
});

app.delete('/api/lessons/:id', (req, res) => {
  db.run("DELETE FROM lessons WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// ── GROUPS ─────────────────────────────────────────────────────────────────
app.get('/api/groups', (req, res) => {
  db.all("SELECT name FROM groups ORDER BY sort_order, name", (e, rows) => res.json((rows||[]).map(r=>r.name)));
});

app.post('/api/groups', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name required.' });
  db.run("INSERT INTO groups (name) VALUES (?)", [name.trim()], function(err) {
    if (err) return res.status(400).json({ error: 'Group already exists.' });
    res.json({ success: true });
  });
});

app.delete('/api/groups/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  db.run("DELETE FROM groups WHERE name=?", [name], () => res.json({ success: true }));
});

// ── STUDENTS ───────────────────────────────────────────────────────────────
app.post('/api/students', (req, res) => {
  const { name, email, group, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  db.run("INSERT INTO students (name, email, parish_group, password) VALUES (?, ?, ?, ?)",
    [name, email, group, password], function(err) {
      if (err) return res.status(400).json({ error: 'That email already exists.' });
      res.json({ success: true });
    });
});

// ── TEACHERS ───────────────────────────────────────────────────────────────
app.post('/api/teachers', (req, res) => {
  const { name, email, password, assigned_group } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });
  db.run("INSERT INTO teachers (email, password, name, assigned_group) VALUES (?, ?, ?, ?)",
    [email, password, name, assigned_group], function(err) {
      if (err) return res.status(400).json({ error: 'Teacher email already exists.' });
      res.json({ success: true });
    });
});

// ── PROFILE (update own account) ───────────────────────────────────────────
app.put('/api/profile', (req, res) => {
  const { role, current_email, current_password, new_name, new_email, new_password } = req.body;
  const table = role === 'teacher' ? 'teachers' : 'students';
  const emailCol = role === 'teacher' ? 'email' : 'email';

  // Verify current password
  db.get(`SELECT * FROM ${table} WHERE email = ?`, [current_email], (err, user) => {
    if (!user) return res.status(400).json({ error: 'Account not found.' });
    if (user.password !== current_password) return res.status(400).json({ error: 'Current password is incorrect.' });

    const updName = new_name || user.name;
    const updEmail = new_email || user.email;
    const updPwd = new_password || user.password;
    const groupCol = role === 'teacher' ? 'assigned_group' : 'parish_group';

    db.run(`UPDATE ${table} SET name=?, email=?, password=? WHERE email=?`,
      [updName, updEmail, updPwd, current_email], function(e) {
        if (e) return res.status(400).json({ error: 'Email may already be in use.' });
        res.json({ success: true, name: updName, email: updEmail });
      });
  });
});

// ── ADMIN: EDIT MEMBER ────────────────────────────────────────────────────
app.put('/api/admin/student', (req, res) => {
  const { original_email, name, email, password, parish_group } = req.body;
  if (!original_email) return res.status(400).json({ error: 'Missing original email.' });
  db.run("UPDATE students SET name=COALESCE(?,name), email=COALESCE(?,email), password=COALESCE(?,password), parish_group=COALESCE(?,parish_group) WHERE email=?",
    [name||null, email||null, password||null, parish_group||null, original_email],
    function(e) { if (e) return res.status(400).json({ error: 'Email may already be in use.' }); res.json({ success: true }); });
});

app.put('/api/admin/teacher', (req, res) => {
  const { original_email, name, email, password, assigned_group } = req.body;
  if (!original_email) return res.status(400).json({ error: 'Missing original email.' });
  db.run("UPDATE teachers SET name=COALESCE(?,name), email=COALESCE(?,email), password=COALESCE(?,password), assigned_group=COALESCE(?,assigned_group) WHERE email=?",
    [name||null, email||null, password||null, assigned_group||null, original_email],
    function(e) { if (e) return res.status(400).json({ error: 'Email may already be in use.' }); res.json({ success: true }); });
});

app.delete('/api/admin/student/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  db.run("DELETE FROM students WHERE email=?", [email], () => res.json({ success: true }));
});

app.delete('/api/admin/teacher/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  db.run("DELETE FROM teachers WHERE email=?", [email], () => res.json({ success: true }));
});

// ── QUIZ QUESTIONS ─────────────────────────────────────────────────────────
app.get('/api/quiz-questions/:lessonId', (req, res) => {
  db.all("SELECT * FROM quiz_questions WHERE lesson_id=? ORDER BY sort_order, id", [req.params.lessonId], (e, rows) => res.json(rows || []));
});

app.post('/api/quiz-questions/:lessonId', (req, res) => {
  // Replace all questions for this lesson
  const { questions } = req.body;
  const lessonId = req.params.lessonId;
  db.run("DELETE FROM quiz_questions WHERE lesson_id=?", [lessonId], () => {
    if (!questions || !questions.length) return res.json({ success: true });
    const stmt = db.prepare("INSERT INTO quiz_questions (lesson_id,question_text,opt_a,opt_b,opt_c,opt_d,correct,sort_order) VALUES (?,?,?,?,?,?,?,?)");
    questions.forEach((q, i) => stmt.run([lessonId, q.question_text, q.opt_a, q.opt_b, q.opt_c||'', q.opt_d||'', q.correct, i]));
    stmt.finalize(() => res.json({ success: true }));
  });
});

app.delete('/api/quiz-questions/:id', (req, res) => {
  db.run("DELETE FROM quiz_questions WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// ── QUIZ ATTEMPTS ──────────────────────────────────────────────────────────
app.post('/api/quiz-attempts', (req, res) => {
  const { student_email, lesson_id, answers, auto_score } = req.body;
  if (!student_email || !lesson_id) return res.status(400).json({ error: 'Missing fields' });
  const submitted_at = new Date().toISOString();
  db.run("INSERT INTO quiz_attempts (student_email,lesson_id,answers,auto_score,submitted_at) VALUES (?,?,?,?,?)",
    [student_email, lesson_id, JSON.stringify(answers), auto_score, submitted_at],
    function(e) { if (e) return res.status(500).json({ error: e.message }); res.json({ success: true, id: this.lastID }); });
});

app.get('/api/quiz-attempts', (req, res) => {
  const { student_email, lesson_id } = req.query;
  if (!student_email || !lesson_id) return res.status(400).json({ error: 'Missing params' });
  db.all("SELECT * FROM quiz_attempts WHERE student_email=? AND lesson_id=? ORDER BY submitted_at DESC",
    [student_email, lesson_id], (e, rows) => res.json(rows || []));
});

app.put('/api/quiz-attempts/:id/grade', (req, res) => {
  const { manual_score, teacher_note } = req.body;
  db.run("UPDATE quiz_attempts SET manual_score=?, teacher_note=? WHERE id=?",
    [manual_score, teacher_note || '', req.params.id], () => res.json({ success: true }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
