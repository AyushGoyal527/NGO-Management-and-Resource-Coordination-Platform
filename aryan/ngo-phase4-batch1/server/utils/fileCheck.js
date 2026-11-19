const fs = require("fs");
const ApiError = require("./ApiError");

// The browser-reported MIME type can be faked, so we also check the file's first bytes.
const SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b.subarray(1, 4).toString() === "PNG",
  "image/webp": (b) =>
    b.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP",
  "application/pdf": (b) => b.subarray(0, 4).toString() === "%PDF",
};

exports.removeFile = (filePath) => fs.promises.unlink(filePath).catch(() => {});

exports.verifyFiles = async (files) => {
  for (const f of files) {
    const handle = await fs.promises.open(f.path, "r");
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    await handle.close();
    if (!SIGNATURES[f.mimetype]?.(buf)) {
      await Promise.all(files.map((x) => exports.removeFile(x.path)));
      throw new ApiError(
        400,
        `"${f.originalname}" does not look like a real ${f.mimetype.split("/")[1].toUpperCase()} file`,
      );
    }
  }
};
