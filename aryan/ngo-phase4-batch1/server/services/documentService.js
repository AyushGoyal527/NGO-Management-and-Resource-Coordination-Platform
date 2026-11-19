const path = require("path");
const Document = require("../models/Document");
const ApiError = require("../utils/ApiError");
const { verifyFiles, removeFile } = require("../utils/fileCheck");

const uploadsRoot = () =>
  path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
exports.uploadsRoot = uploadsRoot;

exports.attach = async (user, module, record, files) => {
  if (!files?.length) throw new ApiError(400, "Choose at least one file");
  await verifyFiles(files);
  const created = await Document.insertMany(
    files.map((f) => ({
      originalName: f.originalname.slice(0, 200),
      filename: f.filename,
      mimeType: f.mimetype,
      size: f.size,
      path: path.join("documents", f.filename),
      module,
      recordId: record._id,
      uploadedBy: user._id,
    })),
  );
  await Document.bulkWrite(
    created.map((d) => ({
      updateOne: {
        filter: { _id: d._id },
        update: { url: `/api/documents/${d._id}/download` },
      },
    })),
  );
  record.documents.push(...created.map((d) => d._id));
  await record.save();
  return created;
};

exports.detach = async (record, docId) => {
  if (!record.documents.some((d) => String(d._id || d) === String(docId)))
    throw new ApiError(404, "Document not found");
  const doc = await Document.findByIdAndDelete(docId);
  if (doc) await removeFile(path.join(uploadsRoot(), doc.path));
  record.documents = record.documents.filter(
    (d) => String(d._id || d) !== String(docId),
  );
  await record.save();
};

exports.removeAllFor = async (record) => {
  const docs = await Document.find({ _id: { $in: record.documents } });
  await Promise.all(
    docs.map((d) => removeFile(path.join(uploadsRoot(), d.path))),
  );
  await Document.deleteMany({ _id: { $in: record.documents } });
};

exports.setPhoto = async (record, field, file) => {
  if (!file) throw new ApiError(400, "Choose an image");
  await verifyFiles([file]);
  const old = record[field];
  record[field] = `/uploads/avatars/${file.filename}`;
  await record.save();
  if (old && old.startsWith("/uploads/avatars/"))
    await removeFile(path.join(uploadsRoot(), "avatars", path.basename(old)));
};
