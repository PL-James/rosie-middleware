#!/bin/bash

# Phase 4 API Testing Script
# Tests Manufacturers and Products endpoints

BASE_URL="http://localhost:3000"

echo "🧪 ROSIE Middleware Phase 4 API Tests"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Create Manufacturer
echo -e "${BLUE}Test 1: Create Manufacturer${NC}"
MANUFACTURER_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/manufacturers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Pharmaceuticals",
    "mah": "ACME-001",
    "country": "USA",
    "contactEmail": "contact@acmepharma.com"
  }')

MANUFACTURER_ID=$(echo $MANUFACTURER_RESPONSE | jq -r '.id')

if [ "$MANUFACTURER_ID" != "null" ]; then
  echo -e "${GREEN}✓ Manufacturer created: $MANUFACTURER_ID${NC}"
  echo "Response: $MANUFACTURER_RESPONSE" | jq .
else
  echo -e "${RED}✗ Failed to create manufacturer${NC}"
  echo $MANUFACTURER_RESPONSE
fi

echo ""

# Test 2: List Manufacturers
echo -e "${BLUE}Test 2: List All Manufacturers${NC}"
MANUFACTURERS=$(curl -s $BASE_URL/api/v1/manufacturers)
MANUFACTURER_COUNT=$(echo $MANUFACTURERS | jq '. | length')
echo -e "${GREEN}✓ Found $MANUFACTURER_COUNT manufacturers${NC}"
echo "Response: $MANUFACTURERS" | jq '.[:2]'

echo ""

# Test 3: Get Manufacturer by ID
echo -e "${BLUE}Test 3: Get Manufacturer by ID${NC}"
MANUFACTURER=$(curl -s $BASE_URL/api/v1/manufacturers/$MANUFACTURER_ID)
echo -e "${GREEN}✓ Retrieved manufacturer${NC}"
echo "Response: $MANUFACTURER" | jq .

echo ""

# Test 4: Create Product
echo -e "${BLUE}Test 4: Create Product${NC}"
PRODUCT_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/products \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Cardio-Care 500mg\",
    \"description\": \"Cardiovascular medication for hypertension management\",
    \"gtin\": \"12345678901234\",
    \"manufacturerId\": \"$MANUFACTURER_ID\",
    \"productType\": \"Pharmaceutical\",
    \"riskLevel\": \"MEDIUM\",
    \"regulatoryStatus\": \"Approved\"
  }")

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.id')

if [ "$PRODUCT_ID" != "null" ]; then
  echo -e "${GREEN}✓ Product created: $PRODUCT_ID${NC}"
  echo "Response: $PRODUCT_RESPONSE" | jq .
else
  echo -e "${RED}✗ Failed to create product${NC}"
  echo $PRODUCT_RESPONSE
fi

echo ""

# Test 5: List Products
echo -e "${BLUE}Test 5: List All Products${NC}"
PRODUCTS=$(curl -s $BASE_URL/api/v1/products)
PRODUCT_COUNT=$(echo $PRODUCTS | jq '. | length')
echo -e "${GREEN}✓ Found $PRODUCT_COUNT products${NC}"
echo "Response: $PRODUCTS" | jq '.[:2]'

echo ""

# Test 6: Get Products by Manufacturer
echo -e "${BLUE}Test 6: Get Products by Manufacturer${NC}"
MANUFACTURER_PRODUCTS=$(curl -s $BASE_URL/api/v1/manufacturers/$MANUFACTURER_ID/products)
MANUFACTURER_PRODUCT_COUNT=$(echo $MANUFACTURER_PRODUCTS | jq '. | length')
echo -e "${GREEN}✓ Found $MANUFACTURER_PRODUCT_COUNT products for manufacturer${NC}"
echo "Response: $MANUFACTURER_PRODUCTS" | jq .

echo ""

# Test 7: Link Repository to Product (requires existing repository)
echo -e "${BLUE}Test 7: Get Repositories (for linking test)${NC}"
REPOSITORIES=$(curl -s $BASE_URL/api/v1/repositories)
REPO_ID=$(echo $REPOSITORIES | jq -r '.[0].id')

if [ "$REPO_ID" != "null" ]; then
  echo -e "${GREEN}✓ Found repository: $REPO_ID${NC}"

  echo -e "${BLUE}Test 7a: Link Repository to Product${NC}"
  LINK_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/products/$PRODUCT_ID/repositories \
    -H "Content-Type: application/json" \
    -d "{
      \"repositoryId\": \"$REPO_ID\",
      \"version\": \"1.0.0\",
      \"isPrimary\": true
    }")

  echo -e "${GREEN}✓ Repository linked to product${NC}"
  echo "Response: $LINK_RESPONSE" | jq .
else
  echo -e "${RED}⚠ No repositories found, skipping link test${NC}"
  echo "Create a repository first using: POST /api/v1/repositories"
fi

echo ""

# Test 8: Get Linked Repositories
echo -e "${BLUE}Test 8: Get Linked Repositories${NC}"
LINKED_REPOS=$(curl -s $BASE_URL/api/v1/products/$PRODUCT_ID/repositories)
LINKED_COUNT=$(echo $LINKED_REPOS | jq '. | length')
echo -e "${GREEN}✓ Product has $LINKED_COUNT linked repositories${NC}"
echo "Response: $LINKED_REPOS" | jq .

echo ""

# Test 9: Get Aggregated Artifacts
echo -e "${BLUE}Test 9: Get Aggregated Artifacts${NC}"
ARTIFACTS=$(curl -s $BASE_URL/api/v1/products/$PRODUCT_ID/artifacts)
ARTIFACT_COUNT=$(echo $ARTIFACTS | jq '. | length')
echo -e "${GREEN}✓ Found $ARTIFACT_COUNT aggregated artifacts${NC}"
echo "Response: $ARTIFACTS" | jq '.[:3]'

echo ""

# Test 10: Get Compliance Summary
echo -e "${BLUE}Test 10: Get Compliance Summary${NC}"
COMPLIANCE=$(curl -s $BASE_URL/api/v1/products/$PRODUCT_ID/compliance)
echo -e "${GREEN}✓ Retrieved compliance summary${NC}"
echo "Response: $COMPLIANCE" | jq .

echo ""

# Test 11: Get Risk Assessment
echo -e "${BLUE}Test 11: Get Risk Assessment${NC}"
RISK=$(curl -s $BASE_URL/api/v1/products/$PRODUCT_ID/risk-assessment)
echo -e "${GREEN}✓ Retrieved risk assessment${NC}"
echo "Response: $RISK" | jq .

echo ""

# Test 12: Get Traceability Validation
echo -e "${BLUE}Test 12: Get Traceability Validation${NC}"
TRACEABILITY=$(curl -s $BASE_URL/api/v1/products/$PRODUCT_ID/traceability)
echo -e "${GREEN}✓ Retrieved traceability validation${NC}"
echo "Response: $TRACEABILITY" | jq .

echo ""

# Test 13: Update Product
echo -e "${BLUE}Test 13: Update Product${NC}"
UPDATE_RESPONSE=$(curl -s -X PATCH $BASE_URL/api/v1/products/$PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "regulatoryStatus": "Active"
  }')

echo -e "${GREEN}✓ Product updated${NC}"
echo "Response: $UPDATE_RESPONSE" | jq .

echo ""

# Summary
echo "======================================"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Test IDs for cleanup:"
echo "  Manufacturer ID: $MANUFACTURER_ID"
echo "  Product ID: $PRODUCT_ID"
echo ""
echo "To clean up:"
echo "  curl -X DELETE $BASE_URL/api/v1/products/$PRODUCT_ID"
echo "  curl -X DELETE $BASE_URL/api/v1/manufacturers/$MANUFACTURER_ID"
