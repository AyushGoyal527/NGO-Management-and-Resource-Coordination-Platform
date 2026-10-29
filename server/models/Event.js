const { Schema, model } = require("mongoose");
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

module.exports = model(
  "Event",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      description: String,
      date: { type: Date, required: true, index: true },
      startTime: String,
      endTime: String,
      location: String,
      programType: String,
      program: ref("Program"),
      organizer: ref("User"),
      assignedVolunteers: [ref("User")],
      manager: ref("User"),
      beneficiaries: [ref("Beneficiary")],
      students: [ref("Student")],
      requiredResources: [ref("Resource")],
      isPublic: { type: Boolean, default: true },
      status: {
        type: String,
        enum: ["upcoming", "ongoing", "completed", "cancelled"],
        default: "upcoming",
        index: true,
      },
    },
    { timestamps: true },
  ),
);
