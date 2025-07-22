<div align="center">

# ✨ A.S.C.E.N.D. ✨
### Android System Control & ENhanced Debloater

</div>

<p align="center">
  <em>The one-stop-shop for taming your Android device! 🤖</em>
  <br>
  <img src="./assets/Banner.png" alt="A.S.C.E.N.D. Application Screenshot"/>
</p>

Tired of digging through menus and typing cryptic commands? **A.S.C.E.N.D.** is a slick desktop app that puts the power of ADB and Scrcpy at your fingertips. No more command-line headaches—just point, click, and conquer your Android device.

---

## 🚀 Features That Slap

- **📈 Live Dashboard:** See your phone's vitals (CPU, RAM, battery) like it's a patient in the ER. But, you know, a healthy patient.
- **🧹 App Annihilator:** List all your apps, then yeet the bloatware into the digital abyss. Uninstall, disable, or force-stop with righteous fury.
- **📂 File Juggler:** Drag, drop, and delete files on your device like a digital ninja.
- **📱 Scrcpy on Steroids:** Mirror your screen, record it, or go fullscreen with a single click. It's showtime!
- **🔧 Pro-Gamer Moves:** Reboot to recovery, take screenshots, enable wireless ADB, and toggle developer settings like a true power user.
- **💬 Command Center:** Got a favorite ADB command? Run it in our built-in terminal and see what happens. For science!

---

## 📦 Installation (The Easy Way)

Why make things complicated? Grab the latest installer and you're golden.

1.  Head over to the **[Releases](https://github.com/Md-Siam-Mia-Code/A.S.C.E.N.D./releases)** page.
2.  Download the `A.S.C.E.N.D-Setup-x.x.x.exe` file.
3.  Run it. Click "Next" a few times. Boom, you're done. 🥳

---

## 🚦 Before You Start: Flip the Switch!

Your phone needs to trust your computer. Here's how to make the magic happen:

1.  **Become a Developer (No Degree Required):**
    - Go to `Settings` > `About phone`.
    - Frantically tap `Build number` 7 times until your phone congratulates you.
2.  **Enable USB Debugging:**
    - Go to `Settings` > `System` > `Developer options`.
    - Find `USB debugging` and turn it ON.
3.  **Connect & Trust:**
    - Plug your phone into your PC.
    - A popup will ask you to "Allow USB debugging?". Check "Always allow" and tap "Allow".

Now you're ready to rock. 🤘

---

## 🛠️ For the Hackers (Building from Source)

Wanna get your hands dirty? Awesome.

### What you'll need:
- [Node.js](https://nodejs.org/) (it comes with npm)

### Let's build this thing:
```bash
# 1. Clone the repo like you're stealing the Declaration of Independence
git https://github.com/Md-Siam-Mia-Code/A.S.C.E.N.D..git
cd ADB-SCRCPY

# 2. Install the bajillion dependencies
npm install

# 3. Run it in dev mode (with hot-reloading!)
npm start

# 4. Build the installer for the masses
npm run dist
```
The final installer will be chilling in the `dist` folder.

---

## 🤝 Wanna Help?

Got an idea? Found a bug? Let's make this thing even better together.

1.  Fork the repo.
2.  Create a new branch for your awesome feature.
3.  Make your changes.
4.  Open a Pull Request and tell us what you did!

---

## 📜 The Boring Legal Stuff

This project is licensed under the ISC License. Basically, do what you want with it, but don't blame me if you accidentally turn your phone into a toaster. 🍞

**Disclaimer:** Use this tool responsibly. Deleting the wrong thing can make your device very, very sad. When in doubt, don't.
