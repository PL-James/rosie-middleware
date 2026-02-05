# Evidence Signing Key Management

Complete guide for generating, storing, and managing cryptographic signing keys for ROSIE evidence artifacts.

---

## Quick Start (TL;DR)

```bash
# 1. Generate keys (30 seconds)
mkdir -p .rosie-keys
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
chmod 600 .rosie-keys/private-key.pem

# 2. Display keys for GitHub
./scripts/display-keys.sh

# 3. Copy keys to GitHub Secrets (follow instructions from script)

# 4. Done! CI will auto-sign evidence.
```

---

## Why We Need Signing Keys

**Problem:** How do auditors know test results are authentic and haven't been tampered with?

**Solution:** Cryptographic signatures (JWS)

```
Test results (JSON) → Sign with private key → JWS (tamper-proof)
                                                  ↓
                                         Anyone can verify with public key
```

**Analogy:** Like signing a legal document with a digital signature. Can't be forged, can be verified by anyone.

---

## Key Types Explained

### **Private Key (Keep Secret!)**

**File:** `.rosie-keys/private-key.pem`

**Purpose:** Signs evidence artifacts (creates JWS signatures)

**Who uses it:**
- ✅ CI/CD (GitHub Actions)
- ✅ Your local machine (for testing)
- ❌ NEVER in git
- ❌ NEVER shared via email/Slack
- ❌ NEVER in frontend code

**Format:**
```
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEICg7E4NN53YkaWxfJPX6UsWY+8xTyCJpVqQDYQrLH6kqoAoGCCqGSM49
AwEHoUQDQgAEWz8C9/V5rQrQx1i8dJCBpNs9IcFYRlzNiE0JpfB7Yvdy9ViPYTqB
wC3y7lYJKyF8rPx7qHvmRLNJv5HZ6dYQPw==
-----END EC PRIVATE KEY-----
```

### **Public Key (Can Share)**

**File:** `.rosie-keys/public-key.pem`

**Purpose:** Verifies JWS signatures (proves evidence is authentic)

**Who uses it:**
- ✅ Auditors
- ✅ Verification scripts
- ✅ Can commit to git (optional)
- ✅ Can share publicly

**Format:**
```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWz8C9/V5rQrQx1i8dJCBpNs9IcFY
RlzNiE0JpfB7Yvdy9ViPYTqBwC3y7lYJKyF8rPx7qHvmRLNJv5HZ6dYQPw==
-----END PUBLIC KEY-----
```

---

## Step-by-Step Key Generation

### **Option 1: Helper Script (Easiest)**

```bash
# Run the helper script
./scripts/display-keys.sh
```

If keys don't exist, it tells you how to create them.
If keys exist, it displays them formatted for GitHub Secrets.

### **Option 2: Manual Generation**

#### **1. Generate Private Key**

```bash
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
```

**What this does:**
- `ecparam` = Elliptic Curve parameters
- `-name prime256v1` = P-256 curve (NIST standard, same as ES256 in JWS)
- `-genkey` = Generate a key
- `-noout` = Don't output parameters, just the key
- `-out` = Save to file

#### **2. Extract Public Key**

```bash
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
```

**What this does:**
- `ec` = Elliptic Curve operations
- `-in` = Read private key
- `-pubout` = Output public key
- `-out` = Save to file

#### **3. Secure Private Key**

```bash
chmod 600 .rosie-keys/private-key.pem
```

**What this does:**
- `600` = Read/write for owner only (you)
- Prevents other users on the system from reading it

#### **4. Verify**

```bash
ls -la .rosie-keys/
```

Expected:
```
-rw-------  1 james  staff  227 Feb  5 18:45 private-key.pem  ← Only you can read
-rw-r--r--  1 james  staff  178 Feb  5 18:45 public-key.pem   ← Anyone can read
```

---

## Adding Keys to GitHub Secrets

### **Step 1: Display Keys**

```bash
./scripts/display-keys.sh
```

This outputs both keys formatted for easy copy-paste.

### **Step 2: Go to GitHub Secrets**

**URL:** https://github.com/PL-James/rosie-middleware/settings/secrets/actions

Or navigate:
```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret
```

### **Step 3: Add Private Key**

1. Click **"New repository secret"**
2. Name: `EVIDENCE_PRIVATE_KEY`
3. Value: Copy **ENTIRE** private key including `-----BEGIN/END-----` lines
4. Click **"Add secret"**

**Example value:**
```
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEICg7E4NN53YkaWxfJPX6UsWY+8xTyCJpVqQDYQrLH6kqoAoGCCqGSM49
AwEHoUQDQgAEWz8C9/V5rQrQx1i8dJCBpNs9IcFYRlzNiE0JpfB7Yvdy9ViPYTqB
wC3y7lYJKyF8rPx7qHvmRLNJv5HZ6dYQPw==
-----END EC PRIVATE KEY-----
```

### **Step 4: Add Public Key**

1. Click **"New repository secret"** again
2. Name: `EVIDENCE_PUBLIC_KEY`
3. Value: Copy **ENTIRE** public key including `-----BEGIN/END-----` lines
4. Click **"Add secret"**

**Example value:**
```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWz8C9/V5rQrQx1i8dJCBpNs9IcFY
RlzNiE0JpfB7Yvdy9ViPYTqBwC3y7lYJKyF8rPx7qHvmRLNJv5HZ6dYQPw==
-----END PUBLIC KEY-----
```

### **Step 5: Verify Secrets Are Set**

Go to: https://github.com/PL-James/rosie-middleware/settings/secrets/actions

You should see:
- ✅ `EVIDENCE_PRIVATE_KEY`
- ✅ `EVIDENCE_PUBLIC_KEY`

**Note:** GitHub masks secret values, so you'll only see `***` for both.

---

## Key Storage Strategy

### **Where to Store Keys**

| Location | Private Key | Public Key | Purpose |
|----------|-------------|------------|---------|
| **Local (.rosie-keys/)** | ✅ Yes (git-ignored) | ✅ Yes | Development/testing |
| **GitHub Secrets** | ✅ Yes (encrypted) | ✅ Yes | CI/CD automation |
| **Password Manager** | ✅ Yes (backup) | ✅ Yes | Recovery/rotation |
| **Git Repo** | ❌ NEVER | ⚠️ Optional | Public verification |
| **Email/Slack** | ❌ NEVER | ✅ OK | Sharing with auditors |

### **.gitignore Protection**

The repo already has `.rosie-keys/` in `.gitignore`:

```bash
# Check it's git-ignored
cat .gitignore | grep rosie-keys
# Output: .rosie-keys/
```

**Verify keys won't be committed:**
```bash
git status
# Should NOT show .rosie-keys/ as untracked
```

### **Password Manager Backup (Recommended)**

Store private key in 1Password, LastPass, or similar:

1. Create secure note titled: "ROSIE Middleware Evidence Signing Key"
2. Paste private key
3. Add metadata:
   - Created: 2026-02-05
   - Algorithm: ES256 (P-256)
   - Purpose: ROSIE evidence signing
   - Repo: rosie-middleware

**Why?** If you lose your local machine, you can recover the key.

---

## Key Rotation (When to Generate New Keys)

### **Rotate Keys When:**

1. **Private key compromised** (leaked in git, email, Slack)
2. **Team member leaves** (had access to private key)
3. **Annual rotation** (GxP best practice)
4. **Algorithm update** (upgrading from ES256 to newer standard)

### **How to Rotate:**

```bash
# 1. Backup old keys
mv .rosie-keys/private-key.pem .rosie-keys/private-key-2026-02-05-backup.pem
mv .rosie-keys/public-key.pem .rosie-keys/public-key-2026-02-05-backup.pem

# 2. Generate new keys
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
chmod 600 .rosie-keys/private-key.pem

# 3. Update GitHub Secrets (repeat Step 2 from "Adding Keys to GitHub Secrets")
./scripts/display-keys.sh

# 4. Regenerate ALL evidence (signs with new key)
npm run test:ci
npm run generate-evidence

# 5. Commit new evidence
git add .gxp/evidence/
git commit -m "chore: rotate evidence signing keys, regenerate evidence"
git push
```

**Note:** Old evidence remains valid (verified with old public key).

---

## Troubleshooting

### **"Private key file not found"**

**Error:**
```
❌ No private key found in .rosie-keys/private-key.pem
```

**Solution:**
```bash
# Generate keys
mkdir -p .rosie-keys
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
```

### **"Permission denied" when reading key**

**Error:**
```
❌ Permission denied: .rosie-keys/private-key.pem
```

**Solution:**
```bash
# Fix permissions
chmod 600 .rosie-keys/private-key.pem
```

### **"Invalid key format"**

**Error:**
```
❌ Invalid key format
```

**Causes:**
- Copied key without `-----BEGIN/END-----` lines
- Extra spaces/newlines added when copying
- Wrong algorithm (not EC P-256)

**Solution:**
```bash
# Verify key format
head -1 .rosie-keys/private-key.pem
# Should output: -----BEGIN EC PRIVATE KEY-----

tail -1 .rosie-keys/private-key.pem
# Should output: -----END EC PRIVATE KEY-----

# If wrong, regenerate
rm .rosie-keys/*.pem
openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem
openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem
```

### **"Signature verification failed"**

**Error:**
```
❌ Evidence verification failed: signature verification failed
```

**Causes:**
- Evidence signed with different private key
- Wrong public key used for verification
- Evidence file manually edited

**Solution:**
```bash
# Regenerate evidence with current keys
npm run generate-evidence

# Verify with matching public key
npm run verify-evidence
```

### **CI can't access keys**

**Error in CI:**
```
❌ No private key found
```

**Solution:**
1. Go to: https://github.com/PL-James/rosie-middleware/settings/secrets/actions
2. Verify `EVIDENCE_PRIVATE_KEY` and `EVIDENCE_PUBLIC_KEY` secrets exist
3. If missing, add them (see "Adding Keys to GitHub Secrets")

---

## Security Best Practices

### **DO ✅**

- ✅ Generate keys locally (not on shared server)
- ✅ Use strong algorithm (ES256 / P-256)
- ✅ Store private key in password manager (backup)
- ✅ Use GitHub Secrets for CI (encrypted at rest)
- ✅ Rotate keys annually
- ✅ Secure private key with `chmod 600`
- ✅ Keep `.rosie-keys/` in `.gitignore`

### **DON'T ❌**

- ❌ Commit private key to git
- ❌ Share private key via email/Slack
- ❌ Store private key in environment variables (use files or secrets)
- ❌ Reuse keys across projects
- ❌ Use weak algorithms (RSA-1024, SHA1)
- ❌ Store keys in cloud storage (Dropbox, Google Drive)
- ❌ Share private key with contractors/vendors

---

## Key Algorithm Details

### **Why ES256 (P-256)?**

**ES256 = ECDSA with P-256 curve and SHA-256 hash**

**Benefits:**
- ✅ Industry standard (NIST FIPS 186-4)
- ✅ Fast signing/verification
- ✅ Small signatures (~70 bytes)
- ✅ Widely supported (jose library, JWT)
- ✅ Secure (equivalent to RSA-3072)

**Comparison:**

| Algorithm | Key Size | Signature Size | Speed | Security |
|-----------|----------|----------------|-------|----------|
| **ES256** | 256 bits | ~70 bytes | Fast | High |
| RSA-2048 | 2048 bits | 256 bytes | Slow | High |
| RSA-4096 | 4096 bits | 512 bytes | Very slow | Very high |

**ES256 is the sweet spot for JWS signatures.**

---

## FAQ

### **Q: Can I use the same keys for multiple projects?**

**A:** No. Each project should have its own signing keys. Keeps evidence isolated and limits damage if a key is compromised.

### **Q: What happens if I lose the private key?**

**A:**
- Old evidence remains valid (verified with old public key)
- Generate new keys
- Regenerate ALL evidence with new keys
- Update GitHub Secrets

### **Q: Can auditors verify evidence without the private key?**

**A:** Yes! They only need the public key. That's the whole point of public-key cryptography.

```bash
# Auditor downloads evidence
curl -O https://raw.githubusercontent.com/.../EV-SPEC-006-001-001.jws

# Auditor gets public key (from repo or you email it)
curl -O https://raw.githubusercontent.com/.../.rosie-keys/public-key.pem

# Auditor verifies signature
npm run verify-evidence
# ✅ Evidence verified
```

### **Q: Should I commit the public key to git?**

**A:** Optional. Pros:
- ✅ Auditors can find it easily
- ✅ Self-documenting (key is part of the repo)

Cons:
- ❌ Key rotation requires git commit
- ❌ Old commits have old public key

**Recommendation:** Store public key in GitHub Secrets only. Share with auditors when needed.

### **Q: How long are keys valid?**

**A:** Forever, unless:
- Private key is compromised
- You rotate keys (annual GxP best practice)
- Algorithm becomes insecure (unlikely for ES256)

JWS signatures set 10-year expiration, but keys themselves don't expire.

### **Q: Can I see the private key in GitHub Secrets?**

**A:** No. GitHub encrypts secrets and never displays them. Once added, you can only:
- Update the secret (replace value)
- Delete the secret

You cannot view the secret value. That's why backing up to password manager is important.

---

## Summary

**To set up evidence signing:**

1. **Generate keys** (30 seconds):
   ```bash
   ./scripts/display-keys.sh
   # If keys don't exist, it tells you how to create them
   ```

2. **Add to GitHub Secrets** (2 minutes):
   - Go to: https://github.com/PL-James/rosie-middleware/settings/secrets/actions
   - Add `EVIDENCE_PRIVATE_KEY` (copy from script output)
   - Add `EVIDENCE_PUBLIC_KEY` (copy from script output)

3. **Done!** CI will automatically:
   - Sign evidence with private key
   - Include public key reference in JWS header
   - Commit evidence to repo

**Keys are now managed securely and evidence will be cryptographically signed.**

---

**Last Updated:** 2026-02-05
**Key Algorithm:** ES256 (ECDSA P-256)
**Rotation Policy:** Annual or on compromise
**Storage:** Local (.rosie-keys/), GitHub Secrets, Password Manager
