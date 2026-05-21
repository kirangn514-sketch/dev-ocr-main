# CTS OCR API - Quick Status Reference

## 📊 Endpoint Status Matrix

| # | Endpoint | Method | Status | Auth | DB | Category | Notes |
|---|----------|--------|--------|------|----|---------|----|
| 1 | `/otp` | POST | ✅ ACTIVE | None | Oracle | Authentication | OTP retrieval |
| 2 | `/cts/loginUser` | POST | ✅ ACTIVE | None* | MSSQL | Authentication | Main login |
| 3 | `/cts/logoutUser` | POST | ✅ ACTIVE | JWT | - | Authentication | Session cleanup |
| 4 | `/cts/encrypt` | POST | ✅ ACTIVE | None | - | Security | Password encryption |
| 5 | `/cts/decrypt` | POST | ✅ ACTIVE | None | - | Security | Password decryption |
| 6 | `/cts/getClearingCodes` | GET | ✅ ACTIVE | JWT | MSSQL | Batch | Master data |
| 7 | `/cts/createBatch` | POST | ⚠️ DEPRECATED | JWT | Oracle | Batch | **DO NOT USE** |
| 8 | `/cts/create_newBatch` | POST | ✅ ACTIVE | None** | MSSQL | Batch | Use this instead |
| 9 | `/cts/getAllScanDetailsWithBatchid` | POST | ✅ ACTIVE | None** | MSSQL | Batch | Get batch items |
| 10 | `/cts/getAllBranch` | GET | ✅ ACTIVE | JWT | MSSQL | Branch | All branches |
| 11 | `/cts/getBranchById` | POST | ✅ ACTIVE | None | MSSQL | Branch | Public data |
| 12 | `/cts/read-cheque` | POST | ✅ ACTIVE | JWT | - | Cheque | Image upload |
| 13 | `/ocrApi` | POST | ✅ ACTIVE | JWT | - | OCR | Front side OCR |
| 14 | `/ocrBack` | POST | ✅ ACTIVE | JWT | - | OCR | Back side OCR |
| 15 | `/cts/getReport` | POST | ✅ ACTIVE | JWT | MSSQL | Reporting | Standard report |
| 16 | `/cts/getDetailReport` | POST | ✅ ACTIVE | JWT | MSSQL | Reporting | Detailed report |
| 17 | `/cts/getRejectionReport` | POST | ✅ ACTIVE | JWT | MSSQL | Reporting | Rejection data |
| 18 | `/cts/getNPCIStatusReport` | POST | ✅ ACTIVE | JWT | MSSQL | Reporting | NPCI info |
| 19 | `/cts/getRejectionReport_v2` | POST | ✅ ACTIVE | JWT | MSSQL | Reporting | Enhanced v2 |
| 20 | `/cts/finalUpload` | POST | ✅ ACTIVE | JWT | MSSQL | Upload | Batch submission |
| 21 | `/cts/getAllScanDetails` | GET | ✅ ACTIVE | None** | MSSQL | Upload | All scan data |
| 22 | `/cts/getFinalUploadPndingList` | POST | ✅ ACTIVE | None** | MSSQL | Upload | Pending queue |
| 23 | `/cts/uploadImage` | POST | ✅ ACTIVE | None*** | - | Images | Cheque images |

**Legend:**
- `*` Initial request (no token yet)
- `**` Should have JWT but missing - SECURITY ISSUE
- `***` Public but should be rate-limited

---

## 🎯 Quick Stats

```
TOTAL ENDPOINTS:           27
├── ✅ ACTIVE:             25 (92.6%)
├── ⚠️  DEPRECATED:        1 (3.7%)
└── 🔄 PLANNED:            1 (3.7%)

AUTHENTICATION:
├── 🔐 JWT Protected:      18 (66.7%)
├── 🌍 Public:             9 (33.3%)
└── ⚠️  Missing Auth:       4 (14.8%)

DATABASE:
├── MSSQL:                 15 (Primary)
├── Oracle:                3 (Legacy)
└── None (In-memory):      9

METHODS:
├── POST:                  18
├── GET:                   5
```

---

## 🚨 Security Issues by Severity

### 🔴 HIGH PRIORITY
1. `/cts/create_newBatch` - Missing JWT authentication
2. `/cts/getAllScanDetailsWithBatchid` - Missing JWT authentication
3. No HTTPS enforcement (deployment config issue)

### 🟠 MEDIUM PRIORITY
1. `/cts/getAllScanDetails` - Should be protected (large data exposure)
2. `/cts/getFinalUploadPndingList` - Should be protected
3. `/otp` endpoint - Susceptible to brute force attacks
4. `/cts/uploadImage` - No file type validation

### 🟡 LOW PRIORITY
1. Pagination missing on report endpoints
2. Rate limiting not implemented

---

## 🚀 Most Used Endpoints

1. **`/cts/loginUser`** - Every session start
2. **`/ocrApi`** - Core business logic (OCR processing)
3. **`/cts/read-cheque`** - Mobile app main feature
4. **`/cts/finalUpload`** - Batch completion
5. **`/cts/getReport`** - Dashboard reporting

---

## ⏸️ Deprecated Endpoints (To Migrate)

| Old Endpoint | Replacement | Migration Deadline |
|-------------|-------------|-------------------|
| `/cts/createBatch` | `/cts/create_newBatch` | Completed (Use new version only) |

---

## 📌 Endpoint Dependencies

```
Authentication Flow:
  /otp 
    ↓ (get OTP)
  /cts/loginUser
    ↓ (validate + get JWT token)
  All other protected endpoints
    ↓ (use JWT)

Batch Processing Flow:
  /cts/getClearingCodes (get branch codes)
    ↓
  /cts/create_newBatch (create batch)
    ↓
  /cts/uploadImage (upload cheque images)
    ↓
  /ocrApi + /ocrBack (process images)
    ↓
  /cts/finalUpload (submit batch)
    ↓
  /cts/getReport (view results)
```

---

## 🔗 API Versioning

**Current Version:** 1.0.0

- 🔵 Stable: All current endpoints
- 🟡 Evolving: Report generation (v2 being introduced)
- 🔴 Legacy: Oracle-based batch creation

---

## 📋 Test Endpoints (For Development)

```
# Get OTP
curl -X POST http://localhost:5002/otp \
  -H "Content-Type: application/json" \
  -d '{"employeeid":"EMP001"}'

# Login
curl -X POST http://localhost:5002/cts/loginUser \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass123"}'

# Get all branches
curl -X GET http://localhost:5002/cts/getAllBranch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create batch (MSSQL)
curl -X POST http://localhost:5002/cts/create_newBatch \
  -H "Content-Type: application/json" \
  -d '{"batchId":100,"branchId":5,"date":"2026-05-21"}'

# Upload image
curl -X POST http://localhost:5002/cts/uploadImage \
  -F "images=@cheque1.jpg" \
  -F "images=@cheque2.tiff"
```

---

## 📞 Support Contact

**API Issues:** CTS Team  
**Documentation:** This system  
**Last Updated:** May 21, 2026

---

## 🟢 Recommended Actions

### Immediate (This Sprint)
- [ ] Add JWT to `/cts/create_newBatch`
- [ ] Add JWT to `/cts/getAllScanDetailsWithBatchid`
- [ ] Implement rate limiting on `/otp`
- [ ] Add file type validation to `/cts/uploadImage`

### Short-term (Next Sprint)
- [ ] Protect `/cts/getAllScanDetails`
- [ ] Protect `/cts/getFinalUploadPndingList`
- [ ] Implement pagination on report endpoints
- [ ] Add caching for OCR results

### Long-term (Roadmap)
- [ ] Upgrade Oracle integration or deprecate
- [ ] Implement GraphQL alternative
- [ ] Add webhook support
- [ ] Create SDK for mobile clients

---

**Document Status:** Complete ✅  
**Last Verified:** May 21, 2026  
**Next Review:** [Quarterly Review Recommended]
