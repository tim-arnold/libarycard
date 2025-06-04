# Email Verification Setup Guide

This guide walks you through implementing proper email verification for LibaryCard in production. We'll cover multiple options including Netlify's capabilities and dedicated email services.

## 🏆 Quick Recommendation

**For LibaryCard (personal use)**: Use **Option B (Resend)** - it's the simplest and most reliable.

**If you prefer Netlify ecosystem**: Use **Option A.1 (Netlify Functions)** for full control.

## Email Service Options Comparison

| Service | Setup Time | Free Tier | Best For | Integration |
|---------|------------|-----------|----------|-------------|
| **Netlify + External** | 10 min | Varies | Simple setup | Netlify Functions |
| **Resend** ⭐ | 15 min | 3,000/month | Modern apps | Direct API |
| **SendGrid** | 20 min | 100/day | Enterprise | Direct API |
| **Mailgun** | 25 min | 1,000/month | Developers | Direct API |

## Prerequisites

- ✅ Cloudflare Workers API deployed
- ✅ Domain name for your application
- 📧 Email service account (multiple options below)

## Option A: Netlify + Email Service Integration

Netlify provides several ways to handle emails, though not directly built-in transactional email sending. Here are the best approaches:

### A.1 Netlify Functions + Email Service

Create a Netlify Function to handle email sending instead of doing it in Cloudflare Workers:

1. **Create Netlify Function** (`netlify/functions/send-verification.js`):
```javascript
exports.handler = async (event, context) => {
  const { email, firstName, token } = JSON.parse(event.body);
  
  // Use any email service (Resend, SendGrid, etc.)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to: [email],
      subject: 'Verify your LibaryCard account',
      html: `<h1>Welcome ${firstName}!</h1>...`
    })
  });

  return {
    statusCode: response.ok ? 200 : 500,
    body: JSON.stringify({ success: response.ok })
  };
};
```

2. **Set Environment Variables** in Netlify Dashboard:
   - `RESEND_API_KEY` (or other service)
   - `FROM_EMAIL`

3. **Update Workers to Call Netlify Function**:
```javascript
// In workers/index.ts sendVerificationEmail function
const response = await fetch(`${env.APP_URL}/.netlify/functions/send-verification`, {
  method: 'POST',
  body: JSON.stringify({ email, firstName, token })
});
```

### A.2 Netlify + Zapier Integration

For a no-code approach:

1. **Set up Zapier webhook** to receive registration data
2. **Connect to email service** (Gmail, Outlook, SendGrid, etc.)
3. **Trigger email** when new user registers

### A.3 Netlify Forms + Email Notifications

Limited but simple approach:

1. **Create hidden form** for email verification
2. **Submit form** programmatically when user registers
3. **Use Netlify's form notifications** to trigger emails

**Pros of Netlify Approach:**
- ✅ Keeps everything in Netlify ecosystem
- ✅ Simple environment management
- ✅ Good for existing Netlify workflows

**Cons of Netlify Approach:**
- ❌ More complex setup (extra function)
- ❌ Additional API call overhead
- ❌ Limited email customization options

## Option B: Direct Email Service (Recommended)

For better performance and simplicity, integrate directly with an email service:

## Step 1: Set Up Resend Account

### 1.1 Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month free)
3. Complete email verification for your Resend account

### 1.2 Add Your Domain (Recommended)
1. **In Resend Dashboard** → **Domains** → **Add Domain**
2. **Add your domain** (e.g., `yourdomain.com`)
3. **Add DNS records** as shown in Resend dashboard:
   ```
   Type: TXT
   Name: @
   Value: [provided by Resend]
   
   Type: CNAME  
   Name: resend._domainkey
   Value: [provided by Resend]
   ```
4. **Verify domain** (may take a few minutes)

### 1.3 Get API Key
1. **In Resend Dashboard** → **API Keys** → **Create API Key**
2. **Name it**: `LibaryCard Production`
3. **Copy the API key** (starts with `re_...`)

## Step 2: Configure Cloudflare Workers

### 2.1 Update Environment Variables
Update your `wrangler.toml` with your actual URLs:

```toml
[env.production.vars]
ENVIRONMENT = "production"
APP_URL = "https://yourdomain.com"  # Replace with your actual domain
FROM_EMAIL = "LibaryCard <noreply@yourdomain.com>"  # Replace with your domain
```

### 2.2 Add API Key Secret
Add the Resend API key as a secret:

```bash
# Set production environment secret
wrangler secret put RESEND_API_KEY --env production

# When prompted, paste your Resend API key (re_...)
```

### 2.3 Deploy Workers
```bash
# Deploy to production
wrangler deploy --env production
```

## Step 3: Update Frontend Environment

### 3.1 Netlify Environment Variables
In your Netlify dashboard:

1. **Go to**: Site Settings → Environment Variables
2. **Add these variables**:
   ```
   NEXT_PUBLIC_API_URL = https://libarycard-api.yourusername.workers.dev
   NEXTAUTH_URL = https://yourdomain.com
   ```

### 3.2 Deploy Frontend
```bash
# Commit and push changes
git add .
git commit -m "Configure production email verification"
git push origin main

# Netlify will automatically deploy
```

## Step 4: Test Email Verification

### 4.1 Test Registration Flow
1. **Go to your production site**
2. **Create a new account** with a real email address
3. **Check for verification email** (check spam folder too)
4. **Click verification link** in email
5. **Try to sign in** with your credentials

### 4.2 Verify Logs
Check Cloudflare Workers logs:
```bash
# View real-time logs
wrangler tail --env production
```

Look for:
- `Verification email sent successfully: [email-id]`
- No error messages during registration

## Step 5: Custom Domain Setup (Optional)

### 5.1 Netlify Custom Domain
1. **In Netlify Dashboard** → **Domain Settings** → **Add Custom Domain**
2. **Enter your domain** (e.g., `libarycard.yourdomain.com`)
3. **Update DNS** as instructed by Netlify
4. **Wait for SSL** certificate (automatic)

### 5.2 Update Environment Variables
After custom domain is active:
```
NEXTAUTH_URL = https://libarycard.yourdomain.com
APP_URL = https://libarycard.yourdomain.com
```

## Troubleshooting

### Email Not Sending
1. **Check Workers logs**: `wrangler tail --env production`
2. **Verify API key**: Make sure `RESEND_API_KEY` is set correctly
3. **Check domain verification**: Ensure domain is verified in Resend
4. **Test with Resend dashboard**: Send test email from Resend interface

### Email Goes to Spam
1. **SPF Record**: Add to DNS: `v=spf1 include:resend.com ~all`
2. **DMARC Record**: Add to DNS: `v=DMARC1; p=quarantine;`
3. **Use verified domain**: Don't use `@resend.dev` in production

### Verification Link Not Working
1. **Check URL format**: Should be `https://yourdomain.com/auth/signin?verified=true&token=...`
2. **Check Workers endpoint**: Ensure `/api/auth/verify-email` is working
3. **Check token expiration**: Tokens expire in 24 hours

## Alternative Email Services

If you prefer a different service:

### SendGrid
```javascript
// Replace Resend API call with:
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email }] }],
    from: { email: env.FROM_EMAIL },
    subject: 'Verify your LibaryCard account',
    content: [{ type: 'text/html', value: htmlTemplate }]
  })
});
```

### Mailgun
```javascript
// Replace Resend API call with:
const response = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Verify your LibaryCard account',
    html: htmlTemplate
  })
});
```

## Cost Estimation

### Resend Pricing
- **Free Tier**: 3,000 emails/month
- **Pro Tier**: $20/month for 50,000 emails
- **Perfect for personal use**: Should stay within free tier

### Total Monthly Cost
- **Cloudflare Workers**: Free tier (sufficient)
- **Netlify**: Free tier (sufficient) 
- **Resend**: Free tier (sufficient)
- **Domain**: ~$10-15/year (optional)

**Total: $0/month** for most personal use cases!

## Security Best Practices

1. **Use environment-specific secrets**: Different API keys for staging/production
2. **Monitor email usage**: Set up alerts in Resend dashboard
3. **Rate limiting**: Consider adding rate limits to registration endpoint
4. **Token security**: Tokens are single-use and expire in 24 hours
5. **Domain verification**: Always use verified domains in production

## Next Steps

After email verification is working:

1. **Monitor usage**: Keep an eye on email sending metrics
2. **User feedback**: Ask users about email delivery experience
3. **Analytics**: Track email open rates and click-through rates
4. **Backup plan**: Consider backup email service for high availability

Your LibaryCard app now has production-ready email verification! 🎉