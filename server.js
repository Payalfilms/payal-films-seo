const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const archiver = require('archiver');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

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
    const { planId, userToken, customerName, customerPhone, utrNumber } = req.body;
    if (!planId || !userToken) {
      return res.status(400).json({ error: 'planId and userToken are required.' });
    }

    const file = req.file;
    const screenshotUrl = file ? `/uploads/${file.filename}` : '';

    const request = payments.createPendingRequest({
      userToken,
      planId,
      customerName,
      customerPhone,
      utrNumber,
      screenshotUrl
    });

    const waNumber = (process.env.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
    const adminSecret = process.env.ADMIN_SECRET || 'payalfilms123';
    const host = req.get('host');
    const protocol = req.protocol;
    const quickApproveUrl = `${protocol}://${host}/api/admin/quick-approve?token=${encodeURIComponent(userToken)}&plan=${encodeURIComponent(planId)}&secret=${encodeURIComponent(adminSecret)}`;

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

// Admin: Approve request
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

// Admin: Reject request
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

// Admin: Manual Direct Upgrade by Token
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

// Admin: 1-Click Quick Approval URL (From WhatsApp link on Mobile/PC)
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

  try {
    const user = payments.upgradeUser(token, plan);
    const planInfo = payments.PLANS[plan] || { name: plan };

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Approved - Payal Films Admin</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px 28px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .badge { background: #10b981; color: #fff; display: inline-block; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; margin-bottom: 16px; }
          h2 { margin: 0 0 10px; font-size: 1.5rem; color: #34d399; }
          p { color: #94a3b8; font-size: 0.95rem; margin: 6px 0; }
          .details { background: #0f172a; border-radius: 10px; padding: 14px; margin: 20px 0; text-align: left; font-size: 0.88rem; }
          .details div { margin: 6px 0; display: flex; justify-content: space-between; }
          .details span { color: #94a3b8; }
          .details strong { color: #f1f5f9; }
          .btn-home { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓</div>
          <h2>Payment Approved!</h2>
          <p>User account has been activated instantly.</p>
          <div class="details">
            <div><span>User Token:</span> <strong>${token}</strong></div>
            <div><span>Activated Plan:</span> <strong>${planInfo.name}</strong></div>
            <div><span>New Quota:</span> <strong>${user.creditsRemaining === null || plan === 'lifetime' ? 'Unlimited Forever' : user.creditsRemaining + ' Credits'}</strong></div>
            <div><span>Status:</span> <strong style="color:#10b981;">ACTIVE</strong></div>
          </div>
          <p style="font-size:0.8rem; color:#64748b;">Customer can now continue batch processing 100+ images without restriction.</p>
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

    const { apiKey, niche, language, namingStyle, studioLocation, photoCategory, userToken, studioBrandName } = req.body;
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

    const finalFilename = `${analysis.data.seoFilename}${ext}`;

    res.json({
      success: true,
      userPlan: creditCheck.plan,
      creditsRemaining: creditCheck.creditsRemaining,
      result: {
        fileId: file.filename,
        originalName: file.originalname,
        originalSize: file.size,
        mimeType: file.mimetype,
        previewUrl: `/uploads/${file.filename}`,
        ext: ext,
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

    const { apiKey, niche, language, namingStyle, studioLocation, photoCategory, studioBrandName } = req.body;
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

      const finalFilename = `${analysis.data.seoFilename}${ext}`;

      results.push({
        fileId: file.filename,
        originalName: file.originalname,
        originalSize: file.size,
        mimeType: file.mimetype,
        previewUrl: `/uploads/${file.filename}`,
        ext: ext,
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
