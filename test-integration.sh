#!/bin/bash
#
# ROSIE Middleware - Comprehensive Integration Testing Script
# Tests Phase 1-4 implementation end-to-end
#
# Usage: ./test-integration.sh [--skip-setup] [--verbose]
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
SKIP_SETUP=false
VERBOSE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-setup)
      SKIP_SETUP=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      ;;
  esac
done

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Utility functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
  ((TESTS_FAILED++))
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
}

# Test function
test_api() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=${5:-200}

  ((TESTS_TOTAL++))

  if [ "$VERBOSE" = true ]; then
    log_info "Testing: $test_name"
    log_info "  $method $endpoint"
  fi

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "$expected_status" ]; then
    log_success "$test_name (HTTP $http_code)"
    if [ "$VERBOSE" = true ] && [ -n "$body" ]; then
      echo "    Response: ${body:0:100}..."
    fi
    echo "$body"
  else
    log_error "$test_name (Expected $expected_status, got $http_code)"
    if [ "$VERBOSE" = true ] && [ -n "$body" ]; then
      echo "    Response: $body"
    fi
    return 1
  fi
}

# Setup function
setup_environment() {
  if [ "$SKIP_SETUP" = true ]; then
    log_warning "Skipping setup (--skip-setup flag)"
    return
  fi

  log_section "Environment Setup"

  log_info "Checking dependencies..."

  if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 18+"
    exit 1
  fi
  log_success "Node.js found: $(node --version)"

  if ! command -v npm &> /dev/null; then
    log_error "npm not found. Please install npm"
    exit 1
  fi
  log_success "npm found: $(npm --version)"

  if ! command -v curl &> /dev/null; then
    log_error "curl not found. Please install curl"
    exit 1
  fi
  log_success "curl found"

  if ! command -v jq &> /dev/null; then
    log_warning "jq not found. JSON parsing will be limited"
  else
    log_success "jq found"
  fi
}

# Health check
test_health() {
  log_section "Phase 0: Health Check"

  test_api "Health check" "GET" "/health" "" 200 > /dev/null || return 1

  log_info "Waiting for database connection..."
  sleep 2

  test_api "Health check (retry)" "GET" "/health" "" 200 > /dev/null || return 1
}

# Phase 1-2: Repository Management & Artifact Discovery
test_phase_1_2() {
  log_section "Phase 1-2: Repository Management & Artifact Discovery"

  # Create repository
  log_info "Creating test repository..."
  REPO_RESPONSE=$(test_api "Create repository" "POST" "/repositories" \
    '{"name":"test-repo","gitUrl":"https://github.com/test/repo","owner":"test","repo":"repo"}' \
    201)

  if [ $? -ne 0 ]; then
    log_error "Failed to create repository. Aborting."
    return 1
  fi

  REPO_ID=$(echo "$REPO_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$REPO_ID" ]; then
    log_error "Failed to extract repository ID"
    return 1
  fi
  log_success "Repository created with ID: $REPO_ID"

  # List repositories
  test_api "List repositories" "GET" "/repositories" "" 200 > /dev/null || return 1

  # Get repository details
  test_api "Get repository details" "GET" "/repositories/$REPO_ID" "" 200 > /dev/null || return 1

  # Trigger scan
  log_info "Triggering repository scan..."
  SCAN_RESPONSE=$(test_api "Trigger scan" "POST" "/repositories/$REPO_ID/scan" "" 201)

  if [ $? -ne 0 ]; then
    log_warning "Scan failed (expected if GitHub token not configured)"
  else
    SCAN_ID=$(echo "$SCAN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_success "Scan triggered with ID: $SCAN_ID"

    # Wait for scan to complete
    log_info "Waiting for scan to complete (max 30s)..."
    for i in {1..30}; do
      SCAN_STATUS=$(test_api "Check scan status" "GET" "/repositories/$REPO_ID/scans/$SCAN_ID" "" 200 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

      if [ "$SCAN_STATUS" = "completed" ]; then
        log_success "Scan completed"
        break
      elif [ "$SCAN_STATUS" = "failed" ]; then
        log_warning "Scan failed (may be expected without GitHub token)"
        break
      fi

      sleep 1
    done
  fi

  # List artifacts
  test_api "List requirements" "GET" "/repositories/$REPO_ID/artifacts/requirements" "" 200 > /dev/null || return 1
  test_api "List user stories" "GET" "/repositories/$REPO_ID/artifacts/user-stories" "" 200 > /dev/null || return 1
  test_api "List specs" "GET" "/repositories/$REPO_ID/artifacts/specs" "" 200 > /dev/null || return 1
  test_api "List evidence" "GET" "/repositories/$REPO_ID/artifacts/evidence" "" 200 > /dev/null || return 1

  # Traceability
  test_api "Get traceability graph" "GET" "/repositories/$REPO_ID/traceability/graph" "" 200 > /dev/null || return 1
  test_api "Validate traceability" "POST" "/repositories/$REPO_ID/traceability/validate" "" 200 > /dev/null || return 1
}

# Phase 3: Evidence & Compliance
test_phase_3() {
  log_section "Phase 3: Evidence & Compliance"

  if [ -z "$REPO_ID" ]; then
    log_error "Repository ID not set. Run Phase 1-2 first."
    return 1
  fi

  # Evidence verification status
  test_api "Get evidence verification status" "GET" "/repositories/$REPO_ID/evidence/verification-status" "" 200 > /dev/null || return 1

  # Get verified evidence
  test_api "Get verified evidence" "GET" "/repositories/$REPO_ID/evidence/verified" "" 200 > /dev/null || return 1

  # Filter by tier
  test_api "Get IQ evidence" "GET" "/repositories/$REPO_ID/evidence/verified?tier=IQ" "" 200 > /dev/null || return 1

  # Risk assessment
  log_info "Generating risk assessment..."
  RISK_RESPONSE=$(test_api "Get risk assessment" "GET" "/repositories/$REPO_ID/compliance/risk-assessment" "" 200)

  if [ $? -eq 0 ]; then
    log_success "Risk assessment generated"
    if [ "$VERBOSE" = true ]; then
      echo "$RISK_RESPONSE" | grep -o '"overallRisk":"[^"]*"' || true
      echo "$RISK_RESPONSE" | grep -o '"riskScore":[0-9]*' || true
    fi
  fi

  # Compliance report
  log_info "Generating compliance report..."
  REPORT_RESPONSE=$(test_api "Generate compliance report" "GET" "/repositories/$REPO_ID/compliance/report" "" 200)

  if [ $? -eq 0 ]; then
    log_success "Compliance report generated"
    if [ "$VERBOSE" = true ]; then
      echo "$REPORT_RESPONSE" | grep -o '"complianceScore":[0-9]*' || true
    fi
  fi

  # Audit trail
  test_api "Get audit trail" "GET" "/repositories/$REPO_ID/compliance/audit-trail" "" 200 > /dev/null || return 1

  # Export CSV
  log_info "Testing CSV export..."
  test_api "Export audit trail CSV" "GET" "/repositories/$REPO_ID/compliance/export/csv" "" 200 > /dev/null || return 1

  # Export PDF (may be placeholder)
  log_info "Testing PDF export (may be placeholder)..."
  test_api "Export compliance PDF" "GET" "/repositories/$REPO_ID/compliance/export/pdf" "" 200 > /dev/null || {
    log_warning "PDF export not fully implemented (expected)"
  }
}

# Phase 4: Product Catalog & Multi-Repo
test_phase_4() {
  log_section "Phase 4: Product Catalog & Multi-Repo"

  # Create manufacturer
  log_info "Creating test manufacturer..."
  MANUFACTURER_RESPONSE=$(test_api "Create manufacturer" "POST" "/manufacturers" \
    '{"name":"Test Pharma Inc","mah":"TP001","country":"USA","contactEmail":"test@testpharma.com"}' \
    201)

  if [ $? -ne 0 ]; then
    log_error "Failed to create manufacturer. Aborting."
    return 1
  fi

  MANUFACTURER_ID=$(echo "$MANUFACTURER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$MANUFACTURER_ID" ]; then
    log_error "Failed to extract manufacturer ID"
    return 1
  fi
  log_success "Manufacturer created with ID: $MANUFACTURER_ID"

  # List manufacturers
  test_api "List manufacturers" "GET" "/manufacturers" "" 200 > /dev/null || return 1

  # Get manufacturer details
  test_api "Get manufacturer details" "GET" "/manufacturers/$MANUFACTURER_ID" "" 200 > /dev/null || return 1

  # Create product
  log_info "Creating test product..."
  PRODUCT_RESPONSE=$(test_api "Create product" "POST" "/products" \
    "{\"name\":\"Test Drug\",\"gtin\":\"1234567890123\",\"manufacturerId\":\"$MANUFACTURER_ID\",\"productType\":\"pharmaceutical\",\"riskLevel\":\"MEDIUM\",\"regulatoryStatus\":\"approved\"}" \
    201)

  if [ $? -ne 0 ]; then
    log_error "Failed to create product. Aborting."
    return 1
  fi

  PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$PRODUCT_ID" ]; then
    log_error "Failed to extract product ID"
    return 1
  fi
  log_success "Product created with ID: $PRODUCT_ID"

  # List products
  test_api "List products" "GET" "/products" "" 200 > /dev/null || return 1

  # Get product details
  test_api "Get product details" "GET" "/products/$PRODUCT_ID" "" 200 > /dev/null || return 1

  # Link repository to product
  if [ -n "$REPO_ID" ]; then
    log_info "Linking repository to product..."
    test_api "Link repository" "POST" "/products/$PRODUCT_ID/repositories" \
      "{\"repositoryId\":\"$REPO_ID\",\"version\":\"1.0.0\"}" \
      201 > /dev/null || {
      log_warning "Repository linking failed (may be expected)"
    }

    # Get linked repositories
    test_api "Get linked repositories" "GET" "/products/$PRODUCT_ID/repositories" "" 200 > /dev/null || return 1

    # Get aggregated artifacts
    log_info "Getting aggregated artifacts..."
    test_api "Get aggregated artifacts" "GET" "/products/$PRODUCT_ID/artifacts" "" 200 > /dev/null || return 1

    # Get product compliance
    log_info "Getting product compliance summary..."
    test_api "Get product compliance" "GET" "/products/$PRODUCT_ID/compliance" "" 200 > /dev/null || return 1

    # Get product risk assessment
    log_info "Getting product risk assessment..."
    test_api "Get product risk" "GET" "/products/$PRODUCT_ID/risk-assessment" "" 200 > /dev/null || return 1

    # Get cross-repo traceability
    log_info "Validating cross-repo traceability..."
    test_api "Get cross-repo traceability" "GET" "/products/$PRODUCT_ID/traceability" "" 200 > /dev/null || return 1
  else
    log_warning "No repository ID available for linking test"
  fi

  # Get manufacturer's products
  test_api "Get manufacturer products" "GET" "/manufacturers/$MANUFACTURER_ID/products" "" 200 > /dev/null || return 1

  # Update product
  test_api "Update product" "PATCH" "/products/$PRODUCT_ID" \
    '{"regulatoryStatus":"withdrawn"}' \
    200 > /dev/null || return 1

  # Delete product (cleanup)
  log_info "Cleaning up test product..."
  test_api "Delete product" "DELETE" "/products/$PRODUCT_ID" "" 204 > /dev/null || {
    log_warning "Product deletion failed"
  }

  # Delete manufacturer (cleanup)
  log_info "Cleaning up test manufacturer..."
  test_api "Delete manufacturer" "DELETE" "/manufacturers/$MANUFACTURER_ID" "" 204 > /dev/null || {
    log_warning "Manufacturer deletion failed"
  }

  # Delete repository (cleanup)
  if [ -n "$REPO_ID" ]; then
    log_info "Cleaning up test repository..."
    test_api "Delete repository" "DELETE" "/repositories/$REPO_ID" "" 204 > /dev/null || {
      log_warning "Repository deletion failed"
    }
  fi
}

# Main test execution
main() {
  log_section "ROSIE Middleware - Integration Test Suite"
  log_info "Testing API at: $API_BASE_URL"
  log_info "Timestamp: $(date)"
  echo ""

  # Setup
  setup_environment

  # Run test phases
  test_health || {
    log_error "Health check failed. Is the backend running?"
    exit 1
  }

  test_phase_1_2 || {
    log_error "Phase 1-2 tests failed"
  }

  test_phase_3 || {
    log_error "Phase 3 tests failed"
  }

  test_phase_4 || {
    log_error "Phase 4 tests failed"
  }

  # Summary
  log_section "Test Summary"
  echo -e "${BLUE}Total Tests:${NC}  $TESTS_TOTAL"
  echo -e "${GREEN}Passed:${NC}       $TESTS_PASSED"
  echo -e "${RED}Failed:${NC}       $TESTS_FAILED"
  echo ""

  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
  else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
  fi
}

# Run main function
main
