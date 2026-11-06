const { Schema, model } = require("mongoose");

module.exports = model(
  "ActivityLog",
  new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true },
    module: { type: String, required: true, index: true },
    recordId: Schema.Types.ObjectId,
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now, index: true },
  }),
);
