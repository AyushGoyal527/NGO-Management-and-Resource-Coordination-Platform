const { Schema, model } = require("mongoose");

module.exports = model(
  "Donation",
  new Schema(
    {
      donorName: { type: String, required: true, trim: true },
      donorType: {
        type: String,
        enum: ["individual", "organization", "anonymous"],
        default: "individual",
      },
      email: { type: String, lowercase: true, trim: true },
      phone: String,
      amount: { type: Number, min: 0, default: 0 },
      donationType: {
        type: String,
        enum: [
          "money",
          "food",
          "clothes",
          "books",
          "medicine",
          "equipment",
          "other",
        ],
        default: "money",
        index: true,
      },
      paymentMethod: {
        type: String,
        enum: [
          "cash",
          "upi",
          "card",
          "bank-transfer",
          "cheque",
          "online",
          "in-kind",
        ],
      },
      transactionId: String,
      donationDate: { type: Date, default: Date.now, index: true },
      campaign: String,
      purpose: String,
      receiptNumber: { type: String, unique: true, sparse: true },
      status: {
        type: String,
        enum: ["inquiry", "pending", "received", "failed"],
        default: "received",
      },
      notes: String,
    },
    { timestamps: true },
  ),
);
