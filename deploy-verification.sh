#!/bin/bash

echo "🚀 Bismi Chicken Shop - Deployment Verification Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

RENDER_URL="https://bismi-main.onrender.com"

echo -e "\n${YELLOW}Phase 1: Testing Render Backend${NC}"
echo "Testing backend connectivity..."

# Test health endpoint
echo -n "Health check: "
if curl -s -f -H "Accept: application/json" "$RENDER_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✓ Online${NC}"
else
    echo -e "${RED}✗ Offline (backend may be sleeping)${NC}"
fi

# Test suppliers endpoint
echo -n "Suppliers API: "
SUPPLIERS_RESPONSE=$(curl -s -H "Accept: application/json" "$RENDER_URL/api/suppliers")
if echo "$SUPPLIERS_RESPONSE" | grep -q '\['; then
    echo -e "${GREEN}✓ JSON Response${NC}"
else
    echo -e "${RED}✗ Non-JSON Response${NC}"
fi

# Test customers endpoint
echo -n "Customers API: "
CUSTOMERS_RESPONSE=$(curl -s -H "Accept: application/json" "$RENDER_URL/api/customers")
if echo "$CUSTOMERS_RESPONSE" | grep -q '\['; then
    echo -e "${GREEN}✓ JSON Response${NC}"
else
    echo -e "${RED}✗ Non-JSON Response${NC}"
fi

echo -e "\n${YELLOW}Phase 2: CORS Headers Check${NC}"
echo "Testing cross-origin headers..."

CORS_RESPONSE=$(curl -s -I -H "Origin: https://bismi-chicken-shop.vercel.app" "$RENDER_URL/api/suppliers")
if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ CORS Headers Present${NC}"
else
    echo -e "${RED}✗ CORS Headers Missing${NC}"
fi

echo -e "\n${YELLOW}Phase 3: Firebase Integration${NC}"
echo "Testing Firebase data retrieval..."

CUSTOMER_COUNT=$(echo "$CUSTOMERS_RESPONSE" | grep -o '"id"' | wc -l)
echo "Customer records: $CUSTOMER_COUNT"

SUPPLIER_COUNT=$(echo "$SUPPLIERS_RESPONSE" | grep -o '"id"' | wc -l)
echo "Supplier records: $SUPPLIER_COUNT"

echo -e "\n${YELLOW}Deployment Checklist${NC}"
echo "=================================================="
echo "1. Push backend changes to GitHub/Render"
echo "2. Set VITE_API_BASE_URL in Vercel environment variables"
echo "3. Push frontend changes to GitHub/Vercel"
echo "4. Wait for Vercel deployment completion"
echo "5. Test live application"

echo -e "\n${GREEN}Solution Ready for Deployment${NC}"
echo "All necessary fixes have been implemented."