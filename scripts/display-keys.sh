#!/bin/bash

# Display signing keys for GitHub Secrets setup
# Usage: ./scripts/display-keys.sh

set -e

if [ ! -f .rosie-keys/private-key.pem ]; then
    echo "❌ Private key not found at .rosie-keys/private-key.pem"
    echo ""
    echo "Generate keys first:"
    echo "  mkdir -p .rosie-keys"
    echo "  openssl ecparam -name prime256v1 -genkey -noout -out .rosie-keys/private-key.pem"
    echo "  openssl ec -in .rosie-keys/private-key.pem -pubout -out .rosie-keys/public-key.pem"
    exit 1
fi

echo "🔐 ROSIE Evidence Signing Keys"
echo "=============================="
echo ""
echo "Copy these to GitHub Secrets:"
echo "https://github.com/PL-James/rosie-middleware/settings/secrets/actions"
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECRET 1: EVIDENCE_PRIVATE_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat .rosie-keys/private-key.pem
echo ""
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECRET 2: EVIDENCE_PUBLIC_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat .rosie-keys/public-key.pem
echo ""
echo ""

echo "📋 Instructions:"
echo ""
echo "1. Go to: https://github.com/PL-James/rosie-middleware/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: EVIDENCE_PRIVATE_KEY"
echo "   Value: Copy ENTIRE private key above (including BEGIN/END lines)"
echo "4. Click 'Add secret'"
echo "5. Click 'New repository secret' again"
echo "6. Name: EVIDENCE_PUBLIC_KEY"
echo "   Value: Copy ENTIRE public key above (including BEGIN/END lines)"
echo "7. Click 'Add secret'"
echo ""
echo "✅ Done! CI will use these keys to sign evidence artifacts."
echo ""
