# Formation Tracker

A student progress tracker for Catholic parish formation programs and small schools. Teachers track lesson completion, leave comments, and run quizzes. Students log in to see their progress. Everyone uses it from a simple web interface — no app to install.

---

## Getting Started

### What's the easiest way to get this running?

Use **Railway**. It hosts the app in the cloud so your teachers and students can log in from any phone or computer, anywhere. See *"How do I deploy to Railway?"* below.

If you only need the app inside your parish building on the same WiFi, you can also run it on a local computer. See *"Can I run it on a computer at my parish instead?"*

---

### How do I deploy to Railway?

You'll need two free accounts:

- **GitHub** — [github.com](https://github.com). This is where the app's code lives. You'll copy this repository to your own account so Railway can access it. Sign up takes about two minutes.
- **Railway** — [railway.app](https://railway.app). This is what actually runs the app and gives you a public web address.

**Steps:**

1. Sign in to GitHub and click the **Fork** button at the top of this repository. This makes your own personal copy of the code — Railway will deploy from that copy.

2. Sign in to Railway, click **New Project → Deploy from GitHub repo**, and select your forked `simple-student-tracker` repository. Railway detects it's a Node.js app automatically.

3. Go to your project's **Settings** and add one environment variable:
   - Key: `PORT` — Value: `3000`

4. Still in Settings, add a **Volume** with Mount path `/app`. This is where your data gets saved — don't skip this step.

5. Click **Deploy**. In a minute or two Railway will give you a public URL. That's your app.

**Cost:** Railway's free tier works for light use. Their Hobby plan ($5/month) is recommended for active parishes and keeps the app running around the clock.

---

### Can I run it on a computer at my parish instead?

Yes. This works well if everyone is always on the same WiFi network. They won't be able to log in from home with this option.

1. Install [Node.js](https://nodejs.org) on the computer (free — choose the "LTS" version).
2. Clone or download this repository to the computer.
3. Open a terminal (Mac: search "Terminal"; Windows: search "Command Prompt") and navigate to the project folder.
4. Run these two commands — the first one only needs to be run once:
   ```
   npm install
   node server.js
   ```
5. Open a browser and go to `http://localhost:3000`. The app is running.

To let others on the same WiFi connect, find your computer's local IP address (Windows: type `ipconfig` in Command Prompt and look for "IPv4 Address", usually something like `192.168.1.45`). They open `http://192.168.1.45:3000` on their device.

---

### Is there an option for technically experienced users?

Yes — a VPS gives you the most control and typically costs $5–6/month. Providers like [Hetzner](https://hetzner.com), [DigitalOcean](https://digitalocean.com), and [Vultr](https://vultr.com) are solid choices. Clone the repo, install Node.js, and use [PM2](https://pm2.keymetrics.io/) to keep the app running. Point a domain at it and you're done.

---

### What happens the first time I open the app?

A setup wizard walks you through everything:

- Your organization's name and an optional motto
- Your **organization type** — Eastern Catholic, Western Catholic, or School/Other. This sets the language used throughout the app and, for Eastern Catholics, offers the option to load the official lesson library automatically
- Your admin account — email, password, and a **Recovery Phrase**. Write the Recovery Phrase down somewhere safe. It's the only way to reset your password if you forget it.

After setup, a Getting Started checklist guides you through adding curricula, lessons, and students.

---

### Where is my data stored? Will I lose it?

All data is stored in a single file called `parish_data.sqlite`.

- On **Railway**, this file lives in the Volume you created during setup. It's persistent across deploys and restarts — as long as you created the Volume, your data is safe. Before pushing any future code updates, it's a good habit to download a backup copy of this file from the Railway dashboard.
- On a **local computer**, the file is in your project folder. Back it up like any important file.

---

### What are the default Eastern Catholic lessons?

The lesson library loaded during setup comes from two official resources approved by the Eastern Catholic eparchies of North America:

**God With Us Online — Grades 1–8**
An official faith formation series from the Byzantine Catholic Archeparchy of Pittsburgh.
- 📘 [Purchase student books](https://shop.printtechofwpa.com/godwithus/)
- 📄 [Free teacher manuals](https://godwithusonline.org/teachers-manuals/)

**Christ Our Pascha — Adult Formation**
The official catechism of the Ukrainian Catholic Church.
- 📘 [Purchase the book](https://stjosaphateparchy.com/product/christ-our-pascha/)
- 📄 [Free PDF download](https://eeparchy.com/wp-content/uploads/2020/08/Christ-our-Pascha-Catechism-of-the-Ukrainian-Catholic-Church-by-Comission-for-the-Catehism-z-lib.org_.pdf)
