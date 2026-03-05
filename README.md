# Formation Tracker

A student progress tracker for Catholic parish formation programs and small schools. Teachers track lesson completion, leave comments, and run quizzes. Students log in to see their progress and take quizzes. Everyone uses it from a simple web interface — no app to install.

---

## Getting Started

### What's the easiest way to get this running?

Use **Railway**. It hosts the app in the cloud so your teachers and students can log in from any phone or computer, anywhere — no technical setup on your end after the first deploy. See *"How do I deploy to Railway?"* below.

If you only need the app inside your parish building (same WiFi), you can also run it on a local computer. See *"Can I run it on a computer at my parish instead?"*

---

### How do I deploy to Railway?

You'll need two free accounts before you start:

- **GitHub** — [github.com](https://github.com). Think of GitHub as a place to store the app's files online. You don't need to understand how it works — you just need an account so Railway can read the files. Sign up takes about two minutes.
- **Railway** — [railway.app](https://railway.app). This is what actually runs the app and gives you a public web address.

**Once you have both accounts:**

1. If you received the project as a ZIP file, unzip it to a folder on your computer.
2. Sign in to GitHub, click **New repository**, name it `formation-tracker`, set it to Private, and click **Create repository**. Then upload your project folder using GitHub's web uploader (no command line needed — they walk you through it).
3. Sign in to Railway, click **New Project → Deploy from GitHub repo**, and select `formation-tracker`. Railway detects it's a Node.js app automatically.
4. Go to your project's **Settings** and add one environment variable — Key: `PORT`, Value: `3000`.
5. Still in Settings, add a **Volume** with Mount path `/app`. This is where your data gets saved — don't skip this step.
6. Click **Deploy**. In a minute or two Railway will give you a public URL. That's your app.

**Cost:** Railway's free tier works for light use. Their Hobby plan ($5/month) covers unlimited uptime and is recommended for active parishes.

---

### Can I run it on a computer at my parish instead?

Yes. This works well if teachers and students are always on the same WiFi network (like a school building or parish hall). They won't be able to log in from home with this option.

1. Install [Node.js](https://nodejs.org) on the computer (free — choose the "LTS" version).
2. Open a terminal (Mac: search "Terminal"; Windows: search "Command Prompt").
3. Run these two commands in the project folder — the first one only needs to be run once:
   ```
   npm install
   node server.js
   ```
4. Open a browser and go to `http://localhost:3000`. The app is running.

To let others on the same WiFi connect, find your computer's local IP address (Windows: type `ipconfig` in Command Prompt and look for "IPv4 Address", usually something like `192.168.1.45`). They open `http://192.168.1.45:3000` on their device.

---

### Is there an option for technically experienced users?

Yes — a VPS (virtual private server) gives you the most control and typically costs $5–6/month. Providers like [Hetzner](https://hetzner.com), [DigitalOcean](https://digitalocean.com), and [Vultr](https://vultr.com) are reliable choices. Install Node.js on the server, deploy the project, and use [PM2](https://pm2.keymetrics.io/) to keep it running. Point a domain at it and you're done.

---

### What happens the first time I open the app?

A setup wizard walks you through everything:

- Your organization's name and an optional motto or tagline
- Your **organization type** — Eastern Catholic, Western Catholic, or School/Other. This sets the language used throughout the app (for example, "Catechist" vs. "Teacher") and, for Eastern Catholics, offers the option to load the official lesson library automatically
- Your admin account — email, password, and a **Recovery Phrase**. Write the Recovery Phrase down somewhere safe. It's the only way to reset your password if you forget it — there's no email-based reset.

After setup, a Getting Started checklist guides you through adding curricula, lessons, and students.

---

### Where is my data stored? Will I lose it?

All data is stored in a single file called `parish_data.sqlite` in the project folder.

- On **Railway**, this file lives in the Volume you created during setup. Railway keeps it safe across deploys and restarts — as long as you created the Volume, your data is persistent.
- On a **local computer**, the file is just in your project folder. Back it up like any important file.

Either way, it's a good habit to periodically copy this file somewhere safe.

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
