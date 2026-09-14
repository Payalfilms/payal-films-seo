const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'subscriptions.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Pricing Plans
const PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    credits: 10,
    unlimited: false,
    description: '10 High Quality Images Free'
  },
  starter: {
    id: 'starter',
    name: 'Batch Starter',
    price: 499,
    credits: 1000,
    unlimited: false,
    description: '1,000 Images Batch Processing'
  },
  pro: {
    id: 'pro',
    name: 'Pro Studio Monthly',
    price: 999,
    credits: 5000,
    unlimited: false,
    period: 'month',
    description: '5,000 Images / Month for Busy Studios'
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime VIP Unlimited',
    price: 2000,
    credits: Infinity,
    unlimited: true,
    description: 'Unlimited Images Forever - Pay Once'
  }
};

// Load or initialize DB
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: {}, payments: [], redeemedUtrs: {}, pendingRequests: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.pendingRequests) db.pendingRequests = [];
    if (!db.redeemedUtrs) db.redeemedUtrs = {};
    if (!db.payments) db.payments = [];
    if (!db.users) db.users = {};
    return db;
  } catch (e) {
    return { users: {}, payments: [], redeemedUtrs: {}, pendingRequests: [] };
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// Get or create user account
function getUser(userToken) {
  const db = loadDb();
  if (!db.users[userToken]) {
    db.users[userToken] = {
      userToken,
      plan: 'free',
      creditsRemaining: 10,
      creditsUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
  }
  return db.users[userToken];
}

// Check and Deduct 1 credit
function deductCredit(userToken) {
  const db = loadDb();
  let user = db.users[userToken];
  if (!user) {
    user = getUser(userToken);
  }

  if (user.plan === 'lifetime') {
    user.creditsUsed = (user.creditsUsed || 0) + 1;
    saveDb(db);
    return { allowed: true, creditsRemaining: 'Unlimited', plan: 'lifetime' };
  }

  if (user.creditsRemaining <= 0) {
    return {
      allowed: false,
      reason: 'QUOTA_EXHAUSTED',
      message: 'Your image credits have finished. Please upgrade your plan to continue batch processing!'
    };
  }

  user.creditsRemaining -= 1;
  user.creditsUsed = (user.creditsUsed || 0) + 1;
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  return { allowed: true, creditsRemaining: user.creditsRemaining, plan: user.plan };
}

// Generate Dynamic UPI QR Code
async function generateUpiQr(planId, userToken, customUpiId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan selected');

  const upiId = (customUpiId && customUpiId.trim()) || process.env.UPI_ID || 'payalfilmskhagaria@axl';
  const merchantName = process.env.STUDIO_NAME || 'Payal Films Photography';
  const amount = plan.price;
  const txnRef = `PF-${planId.toUpperCase()}-${userToken.slice(-4)}`;

  // Standard UPI URI
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(txnRef)}`;

  // Generate QR Code as DataURL
  const qrDataUrl = await QRCode.toDataURL(upiUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    success: true,
    planId,
    planName: plan.name,
    amount,
    upiId,
    merchantName,
    txnRef,
    upiUrl,
    qrDataUrl
  };
}

// AI Payment Screenshot Verification using Gemini Vision
async function verifyPaymentScreenshot(screenshotPath, mimeType, expectedPlanId, userToken, apiKey) {
  const plan = PLANS[expectedPlanId];
  if (!plan) throw new Error('Invalid plan for verification');

  const expectedAmount = plan.price;
  const imageBuffer = fs.readFileSync(screenshotPath);
  const base64Image = imageBuffer.toString('base64');

  const systemInstruction = `
You are an expert AI Automated Financial Payment Verification Auditor.
Carefully examine this UPI payment screenshot (Google Pay, PhonePe, Paytm, BHIM, Cred, YONO, Bank App, etc.).

Expected Payment Details:
- Expected Amount: ₹${expectedAmount} INR
- Target Beneficiary: Payal Films / Payal Films Photography / UPI transfer

Inspect the image thoroughly and extract:
1. Is this an authentic payment receipt or screenshot showing money successfully sent? (status: "SUCCESS" / "COMPLETED" / "PAID").
2. The exact numerical amount paid in INR.
3. The UTR Number / UPI Ref ID / Transaction ID (usually 12 digits, e.g., 423874109283).
4. Name of the UPI app used (Google Pay, PhonePe, Paytm, BHIM, etc.).
5. Date and time of payment.
6. Verification verdict: is it an approved genuine payment of at least ₹${expectedAmount}?

Return ONLY a valid JSON object with NO markdown formatting, NO backticks:
{
  "isPaymentSuccess": true/false,
  "detectedAmount": 499,
  "utrNumber": "123456789012",
  "paymentApp": "PhonePe / GPay / Paytm",
  "statusText": "Payment Successful",
  "confidenceScore": 95,
  "approvalDecision": "APPROVED" or "REJECTED",
  "auditReason": "Brief explanation of verification decision"
}
`;

  const modelsToTry = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.6-flash'
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
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error: ${err}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('No response from AI auditor');

      const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const audit = JSON.parse(clean);

      // Verify audit against criteria
      const db = loadDb();
      const detectedAmount = Number(audit.detectedAmount) || 0;
      const utr = (audit.utrNumber && String(audit.utrNumber).trim()) || `TXN-${Date.now()}`;

      // Check for duplicate UTR (anti-fraud protection)
      if (utr && utr.length >= 8 && db.redeemedUtrs[utr]) {
        return {
          success: false,
          approved: false,
          error: `This Transaction / UTR ID (${utr}) has already been redeemed previously. Please upload a new receipt.`
        };
      }

      const isAmountValid = detectedAmount >= expectedAmount;
      const isStatusValid = audit.isPaymentSuccess === true || (audit.statusText && /success|completed|paid/i.test(audit.statusText));

      if (isAmountValid && isStatusValid) {
        // Upgrade User Subscription
        if (!db.users[userToken]) {
          db.users[userToken] = {
            userToken,
            plan: 'free',
            creditsRemaining: 10,
            creditsUsed: 0,
            createdAt: new Date().toISOString()
          };
        }
        const user = db.users[userToken];
        user.plan = expectedPlanId;
        user.creditsRemaining = plan.unlimited ? Infinity : ((user.creditsRemaining || 0) + plan.credits);
        user.upgradedAt = new Date().toISOString();
        user.updatedAt = new Date().toISOString();

        // Mark UTR as redeemed
        db.redeemedUtrs[utr] = {
          userToken,
          planId: expectedPlanId,
          amount: detectedAmount,
          redeemedAt: new Date().toISOString()
        };

        // Record payment
        db.payments.push({
          userToken,
          planId: expectedPlanId,
          planName: plan.name,
          amount: detectedAmount,
          utrNumber: utr,
          paymentApp: audit.paymentApp,
          auditDetails: audit,
          verifiedAt: new Date().toISOString()
        });

        saveDb(db);

        return {
          success: true,
          approved: true,
          planId: expectedPlanId,
          planName: plan.name,
          creditsRemaining: plan.unlimited ? 'Unlimited' : user.creditsRemaining,
          utrNumber: utr,
          detectedAmount,
          paymentApp: audit.paymentApp,
          message: `🎉 Payment of ₹${detectedAmount} Verified Successfully! Upgraded to ${plan.name}.`
        };
      } else {
        return {
          success: false,
          approved: false,
          error: `Verification Failed: Detected amount is ₹${detectedAmount} (Expected ₹${expectedAmount}) or payment is unconfirmed. ${audit.auditReason || ''}`
        };
      }

    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed for payment verification:`, err.message);
    }
  }

  throw lastError;
}

// Manual or Direct Upgrade Helper
function upgradeUser(userToken, planId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan');

  const db = loadDb();
  if (!db.users[userToken]) {
    db.users[userToken] = {
      userToken,
      plan: 'free',
      creditsRemaining: 10,
      creditsUsed: 0,
      createdAt: new Date().toISOString()
    };
  }

  const user = db.users[userToken];
  user.plan = planId;
  user.creditsRemaining = plan.unlimited ? Infinity : ((user.creditsRemaining || 0) + plan.credits);
  user.upgradedAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  saveDb(db);
  return user;
}

// Create Pending Approval Request (From WhatsApp/Manual Submission)
function createPendingRequest({ userToken, planId, customerName, customerPhone, utrNumber, screenshotUrl }) {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan for request');

  const db = loadDb();
  const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const request = {
    id: requestId,
    userToken,
    planId,
    planName: plan.name,
    amount: plan.price,
    customerName: customerName || 'Studio Client',
    customerPhone: customerPhone || '',
    utrNumber: utrNumber || '',
    screenshotUrl: screenshotUrl || '',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.pendingRequests.unshift(request);
  // Keep last 150 requests
  if (db.pendingRequests.length > 150) {
    db.pendingRequests = db.pendingRequests.slice(0, 150);
  }

  // Also attach customer contact to the user record for account recovery
  if (!db.users[userToken]) {
    getUser(userToken);
  }
  if (db.users[userToken]) {
    if (customerName) db.users[userToken].customerName = customerName;
    if (customerPhone) db.users[userToken].customerPhone = customerPhone;
  }

  saveDb(db);
  return request;
}

// Find user by User Token or Phone Number (for multi-device account restore)
function findUserByTokenOrPhone(query) {
  if (!query) return null;
  const clean = query.trim();
  const db = loadDb();

  // 1. Direct match by userToken
  if (db.users[clean]) {
    return db.users[clean];
  }

  // Case-insensitive token match
  const lowerQuery = clean.toLowerCase();
  for (const token in db.users) {
    if (token.toLowerCase() === lowerQuery) {
      return db.users[token];
    }
  }

  // 2. Match by phone number (last 10 digits)
  const cleanPhone = clean.replace(/\D/g, '');
  if (cleanPhone.length >= 10) {
    const last10 = cleanPhone.slice(-10);

    // Check users in db
    for (const token in db.users) {
      const u = db.users[token];
      if (u.customerPhone) {
        const uPhone = u.customerPhone.replace(/\D/g, '');
        if (uPhone.endsWith(last10)) {
          return u;
        }
      }
    }

    // Check pending requests to see if phone was used there
    const foundReq = db.pendingRequests.find(r => {
      if (!r.customerPhone) return false;
      const rPhone = r.customerPhone.replace(/\D/g, '');
      return rPhone.endsWith(last10);
    });
    if (foundReq && db.users[foundReq.userToken]) {
      return db.users[foundReq.userToken];
    }
  }

  return null;
}

// List all requests for Admin
function getPendingRequests() {
  const db = loadDb();
  return db.pendingRequests || [];
}

// Manually Approve Request (Studio Admin Action)
function approveRequest(requestId) {
  const db = loadDb();
  const req = db.pendingRequests.find(r => r.id === requestId);
  if (!req) throw new Error('Request not found');

  if (req.status === 'APPROVED') {
    return { success: true, message: 'Already approved earlier', request: req };
  }

  const plan = PLANS[req.planId];
  if (!plan) throw new Error('Invalid plan');

  // Upgrade user in DB
  if (!db.users[req.userToken]) {
    db.users[req.userToken] = {
      userToken: req.userToken,
      plan: 'free',
      creditsRemaining: 10,
      creditsUsed: 0,
      createdAt: new Date().toISOString()
    };
  }

  const user = db.users[req.userToken];
  user.plan = req.planId;
  user.creditsRemaining = plan.unlimited ? Infinity : ((user.creditsRemaining || 0) + plan.credits);
  user.upgradedAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  // Mark request approved
  req.status = 'APPROVED';
  req.approvedAt = new Date().toISOString();

  // Record payment
  db.payments.push({
    userToken: req.userToken,
    planId: req.planId,
    planName: plan.name,
    amount: req.amount,
    utrNumber: req.utrNumber,
    customerName: req.customerName,
    paymentMethod: 'Manual WhatsApp Approval',
    verifiedAt: new Date().toISOString()
  });

  saveDb(db);
  return {
    success: true,
    request: req,
    user,
    message: `🎉 Successfully Approved! ${user.userToken} upgraded to ${plan.name} (${plan.unlimited ? 'Unlimited' : user.creditsRemaining + ' credits'}).`
  };
}

// Reject Request
function rejectRequest(requestId, reason) {
  const db = loadDb();
  const req = db.pendingRequests.find(r => r.id === requestId);
  if (!req) throw new Error('Request not found');

  req.status = 'REJECTED';
  req.rejectedAt = new Date().toISOString();
  req.rejectReason = reason || 'Payment could not be verified by studio admin.';

  saveDb(db);
  return { success: true, request: req };
}

module.exports = {
  PLANS,
  getUser,
  deductCredit,
  generateUpiQr,
  verifyPaymentScreenshot,
  upgradeUser,
  createPendingRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  findUserByTokenOrPhone
};

