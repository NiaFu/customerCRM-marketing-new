#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
USER="${CRM_ADMIN_USERNAME:-admin}"
PASSWORD="${CRM_ADMIN_PASSWORD:?Set CRM_ADMIN_PASSWORD}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

call() {
  curl --silent --show-error --fail-with-body --user "$USER:$PASSWORD" \
    -H 'Content-Type: application/json' "$@"
}

echo "Checking authentication..."
call "$BASE_URL/api/me" | jq -e '.username == "admin" and .smsMode == "preview"' >/dev/null
status="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/customers")"
test "$status" = "401"

echo "Creating customer..."
customer="$(call -X POST -d '{"name":"Example Customer","phone":"0412345678","source":"CI smoke","marketingConsent":false}' "$BASE_URL/api/customers")"
echo "$customer" | jq -e '.phone == "+61412345678" and .marketingConsent == false' >/dev/null
cid="$(echo "$customer" | jq -r '.id')"

echo "Creating tag and attaching to customer..."
tag="$(call -X POST -d '{"name":"Integration test","color":"#2563eb"}' "$BASE_URL/api/tags")"
tid="$(echo "$tag" | jq -r '.id')"
call -X POST -d '{}' "$BASE_URL/api/customers/$cid/tags/$tid" | jq -e '.tags | length == 1' >/dev/null

echo "Creating a sales opportunity and moving its stage..."
deal="$(call -X POST -d "{\"customerId\":$cid,\"product\":\"Test product\",\"stage\":\"NEW\",\"amount\":1250}" "$BASE_URL/api/deals")"
did="$(echo "$deal" | jq -r '.id')"
call -X PATCH -d '{"stage":"QUOTED"}' "$BASE_URL/api/deals/$did/stage" | jq -e '.stage == "QUOTED"' >/dev/null

echo "Saving activity note..."
call -X POST -d '{"body":"Sent quotation to customer"}' "$BASE_URL/api/customers/$cid/activities" | jq -e '.body == "Sent quotation to customer"' >/dev/null

echo "Verifying marketing SMS is blocked without consent..."
code="$(curl -s -o "$work/block.json" -w '%{http_code}' -u "$USER:$PASSWORD" -H 'Content-Type: application/json' \
    -d "{\"customerId\":$cid,\"purpose\":\"MARKETING\",\"body\":\"Offer\",\"confirmed\":true,\"requestId\":\"56caf145-946a-42a3-933c-cb94d353118a\"}" \
    "$BASE_URL/api/sms/send")"
test "$code" = "400"

echo "Verifying SMS preview and idempotent resubmission..."
payload="{\"customerId\":$cid,\"purpose\":\"SERVICE\",\"body\":\"Your delivery is ready\",\"confirmed\":true,\"requestId\":\"56caf145-946a-42a3-933c-cb94d353118b\"}"
first="$(call -X POST -d "$payload" "$BASE_URL/api/sms/send")"
echo "$first" | jq -e '.status == "PREVIEW" and .providerMessageId == null' >/dev/null
second="$(call -X POST -d "$payload" "$BASE_URL/api/sms/send")"
test "$(echo "$first" | jq -r '.id')" = "$(echo "$second" | jq -r '.id')"
call "$BASE_URL/api/customers/$cid/sms" | jq -e 'length == 1' >/dev/null

echo "CRM API smoke test passed."
