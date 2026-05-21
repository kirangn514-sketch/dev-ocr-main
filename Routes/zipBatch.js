const express = require('express');
const router = express.Router();
const { zipAndCopyBatch } = require('../Controllers/zipBatchController');

// POST /cts/zipAndCopyBatch
router.post('/finalupload', zipAndCopyBatch);

module.exports = router;
