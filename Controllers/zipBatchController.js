const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { getfolderPath } = require('../db/uploadImagesp');

// Helper to zip a folder
const zipFolder = (folderPath, zipPath) => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', () => resolve());
        archive.on('error', err => reject(err));
        archive.pipe(output);
        archive.directory(folderPath, false);
        archive.finalize();
    });
};

exports.zipAndCopyBatch = async (req, res) => {
    try {
        const { date, scannerId, batchNo } = req.body;
        if (!date || !scannerId || !batchNo) {
            return res.status(400).json({ error: 'Missing required fields: date, scannerId, batchNo' });
        }
        const srcFolder = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
        if (!fs.existsSync(srcFolder)) {
            return res.status(404).json({ error: 'Source batch folder not found' });
        }
        const zipFileName = `${batchNo}.zip`;
        const zipFilePath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, zipFileName);
        await zipFolder(srcFolder, zipFilePath);
        const baseDest = await getfolderPath();
        if (!baseDest) {
            return res.status(500).json({ error: 'No destination path found in DB (MPath, PATHGROUP=MOBILE)' });
        }
        const destFolder = path.join(baseDest, date.replace(/-/g, ''), scannerId, batchNo);
        await fs.ensureDir(destFolder);
        const destZipPath = path.join(destFolder, zipFileName);
        await fs.copy(zipFilePath, destZipPath);
        return res.status(200).json({
            message: 'Batch zipped and copied successfully',
            zipPath: destZipPath
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message || error });
    }
};
