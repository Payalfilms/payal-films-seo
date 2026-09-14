const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const archiver = require('archiver');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

// High-Speed Web Image Optimizer & Compressor (using Sharp & Libvips)
async function compressImageForWeb(filePath, mode = 'webp') {
  if (!mode || mode === 'none') return null;

  const baseName = path.parse(filePath).name;
  let outExt = '.webp';
  let pipeline = sharp(filePath).rotate();

  if (mode === 'webp') {
    outExt = '.webp';
    pipeline = pipeline
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 });
  } else if (mode === 'jpeg-hd') {
    outExt = '.jpg';
    pipeline = pipeline
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true });
  } else if (mode === 'jpeg-medium') {
    outExt = '.jpg';
    pipeline = pipeline
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true });
  } else {
    return null;
  }

  const optFilename = 'opt_' + baseName + outExt;
  const optPath = path.join(UPLOADS_DIR, optFilename);

  await pipeline.toFile(optPath);
  const optStat = fs.statSync(optPath);

  return {
    optFilename,
    optPath,
    outExt,
    compressedSize: optStat.size
  };
}

// Production Security & Performance Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allows embedding images & CDN fonts smoothly
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());

// Rate Limiter: Protect server from DoS / abusive traffic
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static assets for fast page loads
  etag: true
}));
app.use('/uploads', express.static(UPLOADS_DIR));

// Automatic Disk Cleanup Routine (Prevents disk from filling up under heavy user traffic)
// Deletes uploaded temp files older than 30 minutes every 10 minutes
function purgeExpiredUploads() {
  try {
    const now = Date.now();
    const maxAgeMs = 30 * 60 * 1000; // 30 minutes TTL
    fs.readdir(UPLOADS_DIR, (err, files) => {
      if (err || !files) return;
      files.forEach((file) => {
        if (file === '.gitkeep' || file.startsWith('pay_')) return;
        const filePath = path.join(UPLOADS_DIR, file);
        fs.stat(filePath, (statErr, stats) => {
          if (!statErr && now - stats.mtimeMs > maxAgeMs) {
            fs.unlink(filePath, () => {});
          }
        });
      });
    });
  } catch (e) {
    console.warn('Auto cleanup error:', e.message);
  }
}

// Run cleanup every 10 minutes
setInterval(purgeExpiredUploads, 10 * 60 * 1000);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const prefix = req.path.includes('payment') ? 'pay_' : '';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${prefix}${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max per image
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg|avif/i;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP, GIF, AVIF, SVG) are allowed!'));
    }
  }
});

// Helper: Clean filename based on style
function formatSeoSlug(text, style = 'kebab-case') {
  if (!text) return 'seo-optimized-image';
  // Remove special characters, keep letters, numbers and spaces
  let clean = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);

  if (style === 'snake_case') {
    return words.join('_');
  } else if (style === 'camelCase') {
    return words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
  } else {
    // Default kebab-case
    return words.join('-');
  }
}

// AI Vision Analysis using Gemini API with Customizable Studio / Brand Brain
async function analyzeImageWithGemini(filePath, mimeType, apiKey, niche = '', language = 'English', namingStyle = 'kebab-case', studioLocation = '', photoCategory = '', studioBrandName = '') {
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');

  const brand = (studioBrandName && studioBrandName.trim()) || '';
  const brandSlug = brand ? formatSeoSlug(brand, namingStyle) : '';

  const brandInstruction = brand ? `
Studio / Brand Identity: ${brand} (Brand Slug: ${brandSlug})
Brand Personalization: Include the brand "${brand}" in the Title, Alt Text, and prefix the seoFilename with "${brandSlug}-".
Schema.org creator, author, and copyrightHolder MUST be set to "${brand}".
` : `
Studio / Brand Identity: Independent / General Photography
Brand Personalization: No specific brand provided. Produce clean, highly descriptive, keyword-rich SEO filename without any forced brand prefix.
Schema.org creator, author, and copyrightHolder should be set to "Professional Photography Studio".
`;

  const systemInstruction = `
You are an expert AI SEO & Visual Marketing Brain for professional photography studios, wedding photographers, and creators worldwide.
Your mission: Visually inspect this photograph in rich detail and generate #1 ranking Google Image SEO metadata personalized for the photographer's brand and website.

${brandInstruction}
Photography Style: Cinematic, Candid, High-Resolution, Storytelling
Studio Location: ${studioLocation || 'Destination / Studio'}
Selected Event/Category: ${photoCategory || 'Auto-Detect (Wedding, Pre-Wedding, Bridal, Haldi, Event, Portrait)'}
Custom Focus / Niche: ${niche || (brand ? `Best Photography by ${brand}` : 'Professional Creative Photography')}
Target Language: ${language || 'English'}
Filename Naming Style: ${namingStyle}

Visual Inspection Guidelines:
1. Examine the visual interaction & pose carefully:
   - Are they holding hands? Looking into each other's eyes? Hugging, smiling, laughing, walking, or enjoying a romantic moment?
   - What are they wearing? Note exact colors and garments (e.g. blue formal suit, white and blue patterned dress, red bridal lehenga, sherwani).
   - What is the mood and setting? (e.g. romantic pre-wedding shoot, outdoor bokeh portrait, royal mandap).
2. The filename MUST describe what is actually happening in the photo:
   ${brandSlug ? `- Prefix filename with '${brandSlug}-' (e.g. '${brandSlug}-romantic-couple-holding-hands-blue-suit-portrait')` : `- Use a clean descriptive visual filename (e.g. 'romantic-couple-holding-hands-blue-suit-portrait')`}
   - NEVER include generic words like 'auto-detect', 'photo', or camera numbers in the filename!
3. Alt Text (Max 125 chars): Visually descriptive, natural, accessibility-friendly, mentioning the exact pose, attire${brand ? `, and "${brand}"` : ''}.
4. Title: Professional, captivating title${brand ? ` featuring "${brand}"` : ''} (40-60 chars).
5. Caption: Elegant, evocative caption describing the moment captured in the photograph.
6. Description: 2-3 sentences rich in high-intent SEO keywords.
7. Focus Keywords: 4-6 high-ranking search terms + local/brand keywords${brand ? ` (including '${brand.toLowerCase()}')` : ''}.
8. Schema.org: Set author, creator, and copyrightHolder to '${brand || 'Professional Photography Studio'}'.

Generate a valid JSON response with the following exact keys:
{
  "seoFilename": "${brandSlug ? `${brandSlug}-` : ''}hyphen-separated-keyword-rich-filename-describing-exact-visual-scene",
  "altText": "Descriptive, accessible alt text featuring exact visual pose${brand ? ` by ${brand}` : ''} (under 125 chars)",
  "title": "Captivating title featuring subject${brand ? ` | ${brand}` : ''} (40-60 chars)",
  "caption": "Contextual, emotional caption for photo gallery, blog, or social media",
  "description": "Comprehensive 2-3 sentence description rich in high-intent photography LSI keywords",
  "focusKeywords": [${brandSlug ? `"${brandSlug}", ` : ''}"couple-pre-wedding-shoot", "romantic-couple-pose", "candid-wedding-photographer"],
  "tags": "${brand ? `${brand.toLowerCase()}, ` : ''}pre wedding shoot, couple holding hands, candid couple pose, romantic wedding portrait",
  "category": "Pre-Wedding & Couple Photography",
  "imageSubject": "Clear identification of main subjects, items, or scene in the photo",
  "recommendedDimensions": "1200x800 (Web Standard) / 2048x1365 (High-Res Portfolio)",
  "schemaSnippet": {
    "@context": "https://schema.org/",
    "@type": "ImageObject",
    "creator": {
      "@type": "Organization",
      "name": "${brand || 'Professional Photography Studio'}"
    },
    "copyrightHolder": {
      "@type": "Organization",
      "name": "${brand || 'Professional Photography Studio'}"
    },
    "author": "${brand || 'Professional Photography Studio'}"
  }
}
Return ONLY valid raw JSON with NO markdown formatting, NO backticks, and NO extra conversational text.
`;

  // Try Flash-Lite models first (highest rate limits & fastest response), then standard Flash
  const modelsToTry = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash'
  ];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemInstruction },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('No response text received from Gemini');

      // Clean JSON if response has markdown blocks
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Ensure filename has proper formatting and custom brand slug if provided
      parsed.seoFilename = formatSeoSlug(parsed.seoFilename, namingStyle);
      if (brandSlug && !parsed.seoFilename.includes(brandSlug)) {
        parsed.seoFilename = `${brandSlug}-${parsed.seoFilename}`;
      }
      return { success: true, aiPowered: true, data: parsed };
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next model...`, err.message.substring(0, 120));
      // Wait 1 second before trying next model if rate limit
      if (err.message.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }
  }

  throw lastError;
}

// Smart Offline Fallback Analyzer with Customizable Studio / Brand Brain
function generateOfflineSeoDetails(originalName, niche = '', language = 'English', namingStyle = 'kebab-case', studioLocation = '', photoCategory = '', studioBrandName = '') {
  const baseName = path.parse(originalName).name;
  let cleanWords = baseName
    .replace(/[_\-.]+/g, ' ')
    .replace(/IMG|DSC|PEXELS|UNSPLASH|SCREENSHOT|PHOTO|PIC|WA\d+|\d{8,}/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanWords || cleanWords.length < 3) {
    cleanWords = photoCategory || (niche ? `${niche} visual` : 'creative photography portrait');
  }

  const brand = (studioBrandName && studioBrandName.trim()) || '';
  const brandSlug = brand ? formatSeoSlug(brand, namingStyle) : '';
  const locationText = studioLocation ? ` in ${studioLocation}` : '';
  const brandSuffix = brand ? ` | ${brand}` : '';
  const brandBy = brand ? ` by ${brand}` : '';
  const brandNameOrg = brand || 'Professional Photography Studio';

  const prefixPart = brandSlug ? `${brandSlug}-` : '';
  const catPart = photoCategory ? formatSeoSlug(photoCategory, namingStyle) + '-' : '';
  const locPart = studioLocation ? '-' + formatSeoSlug(studioLocation, namingStyle) : '';
  const slug = formatSeoSlug(`${prefixPart}${catPart}${cleanWords}${locPart}`, namingStyle);

  const capitalizedTitle = cleanWords
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const keywordList = [
    brand ? brand.toLowerCase() : null,
    'professional photography',
    cleanWords.toLowerCase(),
    photoCategory ? photoCategory.toLowerCase() : 'portrait photography',
    studioLocation ? `photographer ${studioLocation.toLowerCase()}` : 'studio photoshoot',
    'candid photography',
    'high quality visual'
  ].filter(Boolean);

  return {
    success: true,
    aiPowered: false,
    data: {
      seoFilename: slug,
      altText: `${capitalizedTitle}${brandBy}${locationText}`,
      title: `${capitalizedTitle}${brandSuffix}${locationText}`,
      caption: `A captivating visual documenting ${cleanWords}${brandBy}${locationText}.`,
      description: `High quality photography${brandBy} showcasing ${cleanWords}${locationText}. Specializing in authentic moments, portraits, and storytelling.`,
      focusKeywords: keywordList,
      tags: keywordList.join(', '),
      category: photoCategory || niche || 'Photography',
      imageSubject: cleanWords,
      recommendedDimensions: '1200x800 (Web Standard)',
      schemaSnippet: {
        "@context": "https://schema.org/",
        "@type": "ImageObject",
        "creator": {
          "@type": "Organization",
          "name": brandNameOrg
        },
        "copyrightHolder": {
          "@type": "Organization",
          "name": brandNameOrg
        },
        "author": brandNameOrg,
        "name": `${capitalizedTitle}${brandSuffix}`,
        "description": `${capitalizedTitle}${brandBy}`
      },
      note: 'Analyzed with Smart Photography Heuristics.'
    }
  };
}

const payments = require('./payments');

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health / Config check
app.get('/api/config', (req, res) => {
  res.json({
    hasServerKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''),
    serverPort: PORT,
    brand: 'Payal Films Photography',
    upiId: process.env.UPI_ID || 'payalfilmskhagaria@axl',
    whatsappNumber: process.env.WHATSAPP_NUMBER || ''
  });
});

// User Subscription & Credits Status
app.get('/api/user/status', (req, res) => {
  const userToken = req.query.userToken || 'guest_default';
  const user = payments.getUser(userToken);
  res.json({ success: true, user });
});

// Restore / Switch User Account by Token or Phone (Multi-device login)
app.post('/api/user/restore-account', (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a User Token (usr_xxx) or WhatsApp Phone number.' });
    }
    const user = payments.findUserByTokenOrPhone(query.trim());
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No active account found matching this Token or Phone Number. Please check and try again, or contact Payal Films Studio.'
      });
    }
    res.json({
      success: true,
      user,
      message: `Account found! Switched to ${user.userToken} (${user.plan.toUpperCase()} plan, ${user.plan === 'lifetime' ? 'Unlimited' : user.creditsRemaining + ' credits'}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Pricing Plans
app.get('/api/payment/plans', (req, res) => {
  res.json({ success: true, plans: payments.PLANS });
});

// Generate Dynamic UPI QR Code
app.post('/api/payment/generate-qr', async (req, res) => {
  try {
    const { planId, userToken, customUpiId } = req.body;
    if (!planId || !userToken) {
      return res.status(400).json({ error: 'planId and userToken are required' });
    }

    const qrData = await payments.generateUpiQr(planId, userToken, customUpiId);
    res.json(qrData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Payment Proof & Generate WhatsApp Redirection
app.post('/api/payment/submit-whatsapp-proof', upload.single('screenshot'), (req, res) => {
  try {
    const { planId, userToken, customerName, customerPhone, customerUtr, utrNumber } = req.body;
    if (!planId || !userToken) {
      return res.status(400).json({ error: 'planId and userToken are required.' });
    }

    const trimmedName = (customerName || '').trim();
    const cleanPhone = (customerPhone || '').replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Full Name is required (minimum 2 characters).' });
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'A valid 10-digit WhatsApp number is required.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Payment screenshot receipt is required.' });
    }
    const screenshotUrl = `/uploads/${file.filename}`;
    const effectiveUtr = (customerUtr || utrNumber || '').trim();

    const request = payments.createPendingRequest({
      userToken,
      planId,
      customerName: trimmedName,
      customerPhone: cleanPhone,
      utrNumber: effectiveUtr,
      screenshotUrl
    });

    const waNumber = (process.env.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
    const adminSecret = process.env.ADMIN_SECRET || 'payalfilms123';
    const host = req.get('host');
    const quickApproveUrl = `https://${host}/api/admin/quick-approve?token=${encodeURIComponent(userToken)}&plan=${encodeURIComponent(planId)}&secret=${encodeURIComponent(adminSecret)}`;

    const messageText = `Namaste Payal Films Photography! 📸\n\nMaine abhi Payment kar diya hai. Kripya mera SEO Batch Plan approve karein:\n\n📋 Plan: ${request.planName}\n💰 Amount: ₹${request.amount}\n👤 Customer Name: ${request.customerName}\n📞 Phone: ${request.customerPhone || 'N/A'}\n🆔 User Token: ${request.userToken}\n🔢 UTR/UPI Ref: ${request.utrNumber || 'Attached in Screenshot'}\n\n⚡ Quick 1-Click Approve Link (Admin only):\n${quickApproveUrl}\n\n(Maine payment receipt ka screenshot is message me attach kiya hai) 👇`;

    const whatsappUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(messageText)}` : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    res.json({
      success: true,
      request,
      whatsappUrl,
      quickApproveUrl,
      message: 'Payment proof submitted! Please send screenshot on WhatsApp for manual approval.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all pending approval requests
app.get('/api/admin/pending-requests', (req, res) => {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';
  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Invalid admin secret password.' });
  }

  const requests = payments.getPendingRequests();
  res.json({ success: true, requests });
});

// Admin: Approve Request by ID
app.post('/api/admin/approve-request', (req, res) => {
  try {
    const { requestId, secret } = req.body;
    const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';
    if (secret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid admin secret password.' });
    }

    const result = payments.approveRequest(requestId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reject Request by ID
app.post('/api/admin/reject-request', (req, res) => {
  try {
    const { requestId, secret, reason } = req.body;
    const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';
    if (secret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid admin secret password.' });
    }

    const result = payments.rejectRequest(requestId, reason);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Direct Manual User Upgrade
app.post('/api/admin/manual-upgrade', (req, res) => {
  try {
    const { userToken, planId, secret } = req.body;
    const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';
    if (secret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid admin secret password.' });
    }

    const user = payments.upgradeUser(userToken, planId);
    res.json({ success: true, user, message: `Successfully upgraded ${userToken} to ${planId}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Revoke User Plan and Reset Credits to 0
app.post('/api/admin/revoke-user', (req, res) => {
  try {
    const { userToken, secret, reason } = req.body;
    const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';
    if (secret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid admin secret password.' });
    }

    const user = payments.revokeUserPlan(userToken, reason || 'Plan cancelled by admin');
    res.json({ success: true, user, message: `User ${userToken} plan revoked and credits set to 0.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Quick Approval Step 1 — Confirmation Screen (Pehle puchega, fir YES karne par hi approve hoga)
app.get('/api/admin/quick-approve', (req, res) => {
  const { token, plan, secret } = req.query;
  const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';

  if (secret !== expectedSecret) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Unauthorized</title></head>
      <body style="font-family:sans-serif; background:#0f172a; color:#fff; text-align:center; padding:50px;">
        <h2 style="color:#ef4444;">❌ Invalid Admin Secret</h2>
        <p>Security check failed. Please approve from the Payal Films Admin Dashboard.</p>
      </body>
      </html>
    `);
  }

  const user = payments.getUser(token);
  const pendingRequests = payments.getPendingRequests();
  const reqItem = pendingRequests.find(r => r.userToken === token) || {};
  const customerName = reqItem.customerName || user.customerName || 'Studio Client';
  const customerPhone = reqItem.customerPhone || user.customerPhone || 'N/A';
  const utrNumber = reqItem.utrNumber || 'Attached in Screenshot';
  const planInfo = payments.PLANS[plan] || { name: plan, price: '---', credits: '---' };
  const isAlreadyApproved = (user.plan === plan || user.plan === 'lifetime') && user.plan !== 'free';

  if (isAlreadyApproved) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Already Approved - Payal Films</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px 24px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .badge { background: #10b981; color: #fff; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; margin: 0 auto 16px; }
          h2 { color: #34d399; margin: 0 0 10px; }
          .btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓</div>
          <h2>Already Approved!</h2>
          <p>Ye plan pehle se hi active hai: <strong>${planInfo.name}</strong></p>
          <p style="color: #94a3b8; font-size: 0.9rem;">Customer: ${customerName} (${customerPhone})</p>
          <a href="/" class="btn">Open Payal Films Studio &rarr;</a>
        </div>
      </body>
      </html>
    `);
  }

  // Render Confirmation Screen asking Studio Owner
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirm Payment Approval - Payal Films</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0b0f19;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px 16px;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 20px;
          padding: 32px 24px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 24px 48px rgba(0,0,0,0.6);
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
        }
        .icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          border: 2px solid #f59e0b;
          color: #fbbf24;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 12px;
        }
        h2 {
          font-size: 1.4rem;
          color: #ffffff;
          margin-bottom: 6px;
        }
        .subtitle {
          font-size: 0.88rem;
          color: #94a3b8;
        }
        .details-box {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.9rem;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .label {
          color: #94a3b8;
        }
        .val {
          font-weight: 600;
          color: #f1f5f9;
        }
        .val-price {
          color: #34d399;
          font-size: 1.15rem;
          font-weight: 800;
        }
        .val-token {
          font-family: monospace;
          color: #67e8f9;
          font-size: 0.8rem;
        }
        .confirm-prompt {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 24px;
          font-size: 0.88rem;
          color: #c7d2fe;
          text-align: center;
          line-height: 1.4;
        }
        .btn-action {
          display: block;
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: transform 0.1s, opacity 0.2s;
        }
        .btn-action:active {
          transform: scale(0.98);
        }
        .btn-approve {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          margin-bottom: 12px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }
        .btn-approve:hover {
          background: #10b981;
        }
        .btn-reject {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #fca5a5;
        }
        .btn-reject:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #ffffff;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="icon-wrap">👑</div>
          <h2>Studio Owner Approval</h2>
          <p class="subtitle">Payal Films Manual Verification Step</p>
        </div>

        <div class="details-box">
          <div class="detail-row">
            <span class="label">Customer Name:</span>
            <span class="val">${customerName}</span>
          </div>
          <div class="detail-row">
            <span class="label">WhatsApp Number:</span>
            <span class="val">${customerPhone}</span>
          </div>
          <div class="detail-row">
            <span class="label">Selected Plan:</span>
            <span class="val">${planInfo.name}</span>
          </div>
          <div class="detail-row">
            <span class="label">Amount:</span>
            <span class="val-price">₹${planInfo.price}</span>
          </div>
          <div class="detail-row">
            <span class="label">Quota to Allow:</span>
            <span class="val">${planInfo.unlimited ? 'Unlimited Forever' : planInfo.credits + ' Images'}</span>
          </div>
          <div class="detail-row">
            <span class="label">UTR / Ref:</span>
            <span class="val" style="font-size:0.82rem;">${utrNumber}</span>
          </div>
          <div class="detail-row">
            <span class="label">User Token:</span>
            <span class="val-token">${token}</span>
          </div>
        </div>

        <div class="confirm-prompt">
          ⚠️ <strong>Confirmation Required:</strong><br/>
          Kya aapne apne Bank / UPI app me ₹${planInfo.price} receive check kar liya hai?
        </div>

        <form method="POST" action="/api/admin/quick-approve">
          <input type="hidden" name="token" value="${token}" />
          <input type="hidden" name="plan" value="${plan}" />
          <input type="hidden" name="secret" value="${secret}" />
          <input type="hidden" name="action" value="approve" />
          <button type="submit" class="btn-action btn-approve">
            ✅ Haan, Payment Mil Gaya — Approve Karein
          </button>
        </form>

        <form method="POST" action="/api/admin/quick-approve">
          <input type="hidden" name="token" value="${token}" />
          <input type="hidden" name="plan" value="${plan}" />
          <input type="hidden" name="secret" value="${secret}" />
          <input type="hidden" name="action" value="reject" />
          <button type="submit" class="btn-action btn-reject">
            ❌ Nahi, Cancel / Reject Karein
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Admin: Quick Approval Step 2 — Process Action when Studio Owner Clicks YES / CANCEL
app.post('/api/admin/quick-approve', (req, res) => {
  const { token, plan, secret, action } = req.body;
  const expectedSecret = process.env.ADMIN_SECRET || 'payalfilms123';

  if (secret !== expectedSecret) {
    return res.status(403).send(`<h2>Unauthorized Access</h2>`);
  }

  // If Studio Owner chose to Reject / Cancel
  if (action === 'reject') {
    const pendingRequests = payments.getPendingRequests();
    const reqItem = pendingRequests.find(r => r.userToken === token && r.status === 'PENDING');
    if (reqItem) {
      try { payments.rejectRequest(reqItem.id, 'Cancelled by studio owner'); } catch(e) {}
    } else {
      try { payments.revokeUserPlan(token, 'Cancelled by studio owner'); } catch(e) {}
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plan Cancelled - Payal Films</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .card { background: #1e293b; border: 1px solid #ef4444; border-radius: 16px; padding: 32px 24px; max-width: 480px; width: 100%; }
          .badge { width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); color: #ef4444; line-height: 64px; font-size: 32px; margin: 0 auto 16px; }
          h2 { color: #f87171; margin-bottom: 8px; }
          p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 20px; }
          .btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✕</div>
          <h2>Plan Cancelled / Revoked</h2>
          <p>Aapne is plan ko cancel kar diya hai. User ke credits <strong>0</strong> kar diye gaye hain aur account downgrade ho chuka hai.</p>
          <a href="/" class="btn">Open Payal Films Studio &rarr;</a>
        </div>
      </body>
      </html>
    `);
  }

  // If Studio Owner Clicked YES (Approve)
  try {
    const user = payments.upgradeUser(token, plan);
    const planInfo = payments.PLANS[plan] || { name: plan };

    // Also mark pending request approved if present
    const pendingRequests = payments.getPendingRequests();
    const reqItem = pendingRequests.find(r => r.userToken === token && r.status === 'PENDING');
    if (reqItem) {
      try { payments.approveRequest(reqItem.id); } catch(e) {}
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Approved - Payal Films Admin</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #10b981; border-radius: 20px; padding: 36px 24px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 24px 48px rgba(16, 185, 129, 0.15); }
          .badge { background: #10b981; color: #fff; width: 68px; height: 68px; border-radius: 50%; line-height: 68px; font-size: 34px; margin: 0 auto 18px; box-shadow: 0 0 24px rgba(16, 185, 129, 0.5); }
          h2 { margin: 0 0 10px; font-size: 1.5rem; color: #34d399; }
          p { color: #94a3b8; font-size: 0.95rem; margin: 6px 0; }
          .details { background: #0f172a; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: left; font-size: 0.9rem; }
          .details div { margin: 8px 0; display: flex; justify-content: space-between; }
          .details span { color: #94a3b8; }
          .details strong { color: #f1f5f9; }
          .btn-home { display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 14px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓</div>
          <h2>Mubarak Ho! Payment Approved</h2>
          <p>User ka account abhi instantly unlock aur upgrade kar diya gaya hai.</p>
          <div class="details">
            <div><span>Customer:</span> <strong>${user.customerName || 'Studio Client'}</strong></div>
            <div><span>Activated Plan:</span> <strong style="color: #34d399;">${planInfo.name}</strong></div>
            <div><span>New Quota:</span> <strong>${user.creditsRemaining === null || plan === 'lifetime' ? '👑 Unlimited Forever' : user.creditsRemaining + ' Credits'}</strong></div>
            <div><span>Status:</span> <strong style="color:#10b981;">ACTIVE NOW</strong></div>
          </div>
          <p style="font-size:0.82rem; color:#64748b;">Customer ke device par screen automatically unlock ho chuki hai.</p>
          <a href="/" class="btn-home">Go to Image SEO Studio &rarr;</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`<h2>Error approving: ${err.message}</h2>`);
  }
});

// Upload Payment Screenshot & AI Verify (Optional Instant Alternative)
app.post('/api/payment/verify-screenshot', upload.single('screenshot'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Please upload a payment screenshot.' });
    }

    const { planId, userToken, apiKey } = req.body;
    const activeApiKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!activeApiKey) {
      return res.status(400).json({ error: 'Gemini API Key is required for automated receipt verification.' });
    }

    const verificationResult = await payments.verifyPaymentScreenshot(file.path, file.mimetype, planId, userToken, activeApiKey);
    res.json(verificationResult);
  } catch (err) {
    console.error('Screenshot verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save API key permanently to .env
app.post('/api/save-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'API key cannot be empty' });
    }

    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey.trim()}`);
    } else {
      envContent += `\nGEMINI_API_KEY=${apiKey.trim()}\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    process.env.GEMINI_API_KEY = apiKey.trim();
    res.json({ success: true, message: 'Free Gemini API Key permanently saved to .env!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Studio Settings (WhatsApp number, UPI ID)
app.post('/api/save-studio-config', (req, res) => {
  try {
    const { whatsappNumber, upiId } = req.body;
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (whatsappNumber !== undefined) {
      const cleanWa = whatsappNumber.trim();
      process.env.WHATSAPP_NUMBER = cleanWa;
      if (envContent.includes('WHATSAPP_NUMBER=')) {
        envContent = envContent.replace(/WHATSAPP_NUMBER=.*/g, `WHATSAPP_NUMBER=${cleanWa}`);
      } else {
        envContent += `\nWHATSAPP_NUMBER=${cleanWa}\n`;
      }
    }

    if (upiId !== undefined) {
      const cleanUpi = upiId.trim();
      process.env.UPI_ID = cleanUpi;
      if (envContent.includes('UPI_ID=')) {
        envContent = envContent.replace(/UPI_ID=.*/g, `UPI_ID=${cleanUpi}`);
      } else {
        envContent += `\nUPI_ID=${cleanUpi}\n`;
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    res.json({ success: true, message: 'Studio settings saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test API Key
app.post('/api/test-key', async (req, res) => {
  try {
    const key = req.body.apiKey || process.env.GEMINI_API_KEY;
    if (!key) return res.status(400).json({ error: 'No API key provided to test' });

    // Test with gemini-flash-latest
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `API Error: ${errText}` });
    }

    res.json({ success: true, message: 'API Key is 100% active and working!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload and Analyze Single Image (For real-time batch streaming)
app.post('/api/analyze-single', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Please upload an image file.' });
    }

    const { apiKey, niche, language, namingStyle, studioLocation, photoCategory, userToken, studioBrandName, compressionMode } = req.body;
    const token = userToken || req.headers['x-user-token'] || 'guest_default';

    // Enforce Plan & Quota Deduction
    const creditCheck = payments.deductCredit(token);
    if (!creditCheck.allowed) {
      return res.status(402).json({
        error: 'QUOTA_EXHAUSTED',
        message: creditCheck.message || 'Your image quota has finished. Please upgrade your plan to continue batch processing!',
        plan: creditCheck.plan
      });
    }

    const activeApiKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;
    const ext = path.extname(file.originalname).toLowerCase();
    let analysis;

    if (activeApiKey) {
      try {
        analysis = await analyzeImageWithGemini(file.path, file.mimetype, activeApiKey, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName);
      } catch (err) {
        console.error(`Gemini Vision analysis error on ${file.originalname}:`, err.message);
        analysis = generateOfflineSeoDetails(file.originalname, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName);
        analysis.apiError = err.message;
      }
    } else {
      analysis = generateOfflineSeoDetails(file.originalname, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName);
    }

    // Web Image Compression & Optimization (WebP / MozJPEG)
    let downloadFileId = file.filename;
    let finalExt = ext;
    let compressedSize = null;
    let savedPercent = null;

    if (compressionMode && compressionMode !== 'none') {
      try {
        const compResult = await compressImageForWeb(file.path, compressionMode);
        if (compResult) {
          downloadFileId = compResult.optFilename;
          finalExt = compResult.outExt;
          compressedSize = compResult.compressedSize;
          savedPercent = Math.max(0, Math.round((1 - compressedSize / file.size) * 100));
        }
      } catch (compErr) {
        console.warn('Compression fallback warning:', compErr.message);
      }
    }

    const finalFilename = `${analysis.data.seoFilename}${finalExt}`;

    res.json({
      success: true,
      userPlan: creditCheck.plan,
      creditsRemaining: creditCheck.creditsRemaining,
      result: {
        fileId: downloadFileId,
        originalFileId: file.filename,
        originalName: file.originalname,
        originalSize: file.size,
        compressedSize: compressedSize,
        savedPercent: savedPercent,
        isCompressed: !!compressedSize,
        mimeType: finalExt === '.webp' ? 'image/webp' : file.mimetype,
        previewUrl: `/uploads/${downloadFileId}`,
        ext: finalExt,
        newFilename: finalFilename,
        ...analysis
      }
    });
  } catch (err) {
    console.error('Single image analysis error:', err);
    res.status(500).json({ error: err.message || 'Error analyzing image' });
  }
});

// Upload and Analyze Multiple Images (Bulk fallback, up to 200 images)
app.post('/api/analyze', upload.array('images', 200), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one image file.' });
    }

    const { apiKey, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName, compressionMode } = req.body;
    const activeApiKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;

    const results = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      let analysis;

      if (activeApiKey) {
        try {
          analysis = await analyzeImageWithGemini(file.path, file.mimetype, activeApiKey, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName);
        } catch (err) {
          console.error(`Gemini Vision analysis error on ${file.originalname}:`, err.message);
          analysis = generateOfflineSeoDetails(file.originalname, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName);
          analysis.apiError = err.message;
        }
      } else {
        analysis = generateOfflineSeoDetails(file.originalname, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName);
      }

      let downloadFileId = file.filename;
      let finalExt = ext;
      let compressedSize = null;
      let savedPercent = null;

      if (compressionMode && compressionMode !== 'none') {
        try {
          const compResult = await compressImageForWeb(file.path, compressionMode);
          if (compResult) {
            downloadFileId = compResult.optFilename;
            finalExt = compResult.outExt;
            compressedSize = compResult.compressedSize;
            savedPercent = Math.max(0, Math.round((1 - compressedSize / file.size) * 100));
          }
        } catch (compErr) {
          console.warn('Compression warning:', compErr.message);
        }
      }

      const finalFilename = `${analysis.data.seoFilename}${finalExt}`;

      results.push({
        fileId: downloadFileId,
        originalFileId: file.filename,
        originalName: file.originalname,
        originalSize: file.size,
        compressedSize: compressedSize,
        savedPercent: savedPercent,
        isCompressed: !!compressedSize,
        mimeType: finalExt === '.webp' ? 'image/webp' : file.mimetype,
        previewUrl: `/uploads/${downloadFileId}`,
        ext: finalExt,
        newFilename: finalFilename,
        ...analysis
      });
    }

    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('Server error during analysis:', err);
    res.status(500).json({ error: err.message || 'Error analyzing image' });
  }
});

// Download Single Renamed Image
app.get('/api/download/:fileId', (req, res) => {
  const { fileId } = req.params;
  const newName = req.query.newName;

  const filePath = path.join(UPLOADS_DIR, fileId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or expired.' });
  }

  const downloadFilename = newName ? encodeURIComponent(newName) : fileId;
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
  res.sendFile(filePath);
});

// Batch Download All Renamed Images as ZIP (High-Speed Stream)
app.post('/api/download-zip', (req, res) => {
  let items = req.body.items;
  if (!items && req.body.itemsJson) {
    try {
      items = JSON.parse(req.body.itemsJson);
    } catch (e) {
      items = null;
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items provided for zip archive.' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="seo-renamed-images.zip"');

  // Use fast streaming (store: true) because JPEG/PNG are already compressed.
  // This reduces CPU time from 40s to 300ms and prevents timeouts/crashes!
  const archive = archiver('zip', { store: true });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  });

  archive.pipe(res);

  // Add each file with its new sanitized SEO name
  items.forEach((item) => {
    if (!item || !item.fileId) return;
    const filePath = path.join(UPLOADS_DIR, item.fileId);
    if (fs.existsSync(filePath)) {
      const safeName = (item.newFilename && item.newFilename.replace(/[/\\?%*:|"<>]/g, '-')) || item.fileId;
      archive.file(filePath, { name: safeName });
    }
  });

  archive.finalize();
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Image SEO Analyzer & Auto-Renamer running at:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`====================================================`);
});
