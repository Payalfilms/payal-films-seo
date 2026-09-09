# 🚀 Image SEO Pro - AI Visual Analyzer & Auto-Renamer

Ek powerful AI-driven web application jo images ko visually analyze karke Google Image SEO ke according **Auto-Rename** karta hai aur complete SEO details generate karta hai.

---

## ✨ Features

- 📸 **Visual AI Analysis (Google Gemini Vision)**: Image ke andar kya hai (objects, scene, style, context, colors) AI se deeply analyze hota hai.
- 🏷️ **Smart SEO Auto-Renaming**: Be-matlab ke camera names (jaise `IMG_20240912.jpg` ya `Screenshot_12.png`) ko badal kar high-ranking Google-friendly kebab-case names me convert karta hai (e.g. `royal-red-bridal-silk-lehenga.jpg`).
- ♿ **Optimized Alt Text Generator**: Google Images aur Screen Readers ke liye accessibility & keyword-compliant Alt text (under 125 characters).
- 📌 **Complete SEO Pack**:
  - Image Title Tag
  - Contextual Blog Caption
  - Long Description (for Pinterest, WordPress, Shopify, Webflow)
  - Focus Keywords & Search Tags
  - Schema.org (`ImageObject`) JSON-LD code
  - HTML `<img>` tag snippet
- 📦 **Batch Operations**:
  - Ek sath multiple images upload karein (up to 20 images).
  - Sabhi renamed images ko ek click me **ZIP archive** me download karein.
  - Sabhi SEO metadata ko **CSV / Excel** file me export karein.
- 🎯 **Target Niche / Focus Keyword Customization**: Apni industry ya keyword set karein (e.g. "Wedding Photography Mumbai", "Nike Sneaker Store", "Luxury Real Estate").
- 🔒 **Privacy Friendly**: Local server par chalta hai, images direct local machine se process hoti hain.

---

## 🚀 How to Run (Kaise Chalayein)

### Method 1: 1-Click Windows Launcher (Easiest)
Bas folder me **`start_app.bat`** file par double click karein!
- Yeh automatically server start karega aur aapke default web browser me `http://localhost:3000` open kar dega.

### Method 2: Command Prompt / PowerShell
```bash
# Terminal me is folder me jayein aur run karein:
npm start
```
Browser me open karein: `http://localhost:3000`

---

## 🔑 Google Gemini API Key (Free)
System bina kisi API key ke bhi **Smart Heuristic Mode** me chal sakta hai. Lekin agar aap AI visual recognition chahte hain:
1. [Google AI Studio](https://aistudio.google.com/app/apikey) par jaakar free API key generate karein.
2. Web UI me top-right **Settings** button par click karein aur apni key paste karke **Save** kar dein.
3. Key aapke browser me securely save ho jayegi.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js, Multer, Archiver, Dotenv
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Modern CSS (Glassmorphism & Responsive)
- **AI Vision Engine**: Google Gemini 2.0 Flash / 1.5 Flash Vision REST API
