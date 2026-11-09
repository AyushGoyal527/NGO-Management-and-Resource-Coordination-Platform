const Volunteer = require("../models/Volunteer");
const Student = require("../models/Student");
const Beneficiary = require("../models/Beneficiary");
const Donation = require("../models/Donation");
const FoodDistribution = require("../models/FoodDistribution");
const Resource = require("../models/Resource");
const Task = require("../models/Task");
const Event = require("../models/Event");
const Announcement = require("../models/Announcement");
const User = require("../models/User");

const OPEN_TASKS = ["assigned", "accepted", "inProgress"];
const toMap = (rows) =>
  Object.fromEntries(rows.map((r) => [r._id ?? "unknown", r.count]));
const byStatus = (model, filter = {}) =>
  model
    .aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .then(toMap);
const sumFoodQty = (match = {}) =>
  FoodDistribution.aggregate([
    { $match: match },
    { $unwind: "$items" },
    { $group: { _id: null, qty: { $sum: "$items.quantity" } } },
  ]);

// Last 6 calendar months, zero-filled so the chart never has gaps.
async function donationsByMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const rows = await Donation.aggregate([
    {
      $match: {
        donationDate: { $gte: start },
        status: "received",
        amount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$donationDate" } },
        amount: { $sum: "$amount" },
      },
    },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.amount]));
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: d.toLocaleString("en-IN", { month: "short" }),
      amount: map[key] || 0,
    };
  });
}

// ---------------------------------------------------------------- admin
exports.admin = async () => {
  const now = new Date();
  const [
    volStatus,
    totalStudents,
    totalBeneficiaries,
    donationAgg,
    foodAgg,
    availableResources,
    taskStatus,
    upcomingEvents,
    pendingApprovals,
    donationsOverTime,
    topVolunteers,
    foodByItem,
    beneficiariesByCategory,
    studentsByClass,
    resourcesByStatus,
  ] = await Promise.all([
    byStatus(Volunteer),
    Student.countDocuments({ status: { $ne: "archived" } }),
    Beneficiary.countDocuments({ status: { $ne: "archived" } }),
    Donation.aggregate([
      { $match: { status: "received" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    sumFoodQty(),
    Resource.countDocuments({ status: "available" }),
    byStatus(Task),
    Event.countDocuments({ status: "upcoming", date: { $gte: now } }),
    User.countDocuments({ status: "pending" }),
    donationsByMonth(),
    Volunteer.find({ status: "active" })
      .sort({ volunteerHours: -1 })
      .limit(8)
      .select("name volunteerHours")
      .lean(),
    FoodDistribution.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.foodItem",
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { quantity: -1 } },
    ]),
    Beneficiary.aggregate([
      { $match: { status: { $ne: "archived" } } },
      { $group: { _id: "$economicCategory", count: { $sum: 1 } } },
    ]),
    Student.aggregate([
      { $match: { status: { $ne: "archived" } } },
      { $group: { _id: "$class", count: { $sum: 1 } } },
    ]),
    byStatus(Resource),
  ]);

  const totalVolunteers = Object.values(volStatus).reduce((a, b) => a + b, 0);
  const pendingTasks = OPEN_TASKS.reduce((s, k) => s + (taskStatus[k] || 0), 0);

  return {
    pendingApprovals,
    widgets: [
      {
        key: "totalVolunteers",
        label: "Total volunteers",
        value: totalVolunteers,
      },
      {
        key: "activeVolunteers",
        label: "Active volunteers",
        value: volStatus.active || 0,
      },
      { key: "totalStudents", label: "Total students", value: totalStudents },
      {
        key: "totalBeneficiaries",
        label: "Total beneficiaries",
        value: totalBeneficiaries,
      },
      {
        key: "totalDonations",
        label: "Total donations",
        value: donationAgg[0]?.total || 0,
        format: "currency",
        hint: `${donationAgg[0]?.count || 0} received`,
      },
      {
        key: "foodDistributed",
        label: "Food distributed",
        value: foodAgg[0]?.qty || 0,
        hint: "kg and litres combined",
      },
      {
        key: "availableResources",
        label: "Available resources",
        value: availableResources,
      },
      { key: "pendingTasks", label: "Pending tasks", value: pendingTasks },
      {
        key: "completedTasks",
        label: "Completed tasks",
        value: taskStatus.completed || 0,
      },
      {
        key: "upcomingEvents",
        label: "Upcoming events",
        value: upcomingEvents,
      },
    ],
    charts: {
      donationsOverTime,
      volunteerActivity: topVolunteers.map((v) => ({
        name: v.name.split(" ")[0],
        hours: v.volunteerHours,
      })),
      foodDistribution: foodByItem.map((f) => ({
        name: f._id,
        quantity: f.quantity,
      })),
      beneficiaryStats: beneficiariesByCategory.map((b) => ({
        name: (b._id || "other").replace(/-/g, " "),
        value: b.count,
      })),
      studentStats: studentsByClass
        .sort((a, b) => Number(a._id) - Number(b._id))
        .map((s) => ({ name: `Class ${s._id}`, students: s.count })),
      taskCompletion: [
        "assigned",
        "accepted",
        "inProgress",
        "completed",
        "cancelled",
      ]
        .map((k) => ({ name: k, value: taskStatus[k] || 0 }))
        .filter((t) => t.value > 0),
      resourceUsage: Object.entries(resourcesByStatus).map(([name, value]) => ({
        name,
        value,
      })),
    },
  };
};

// -------------------------------------------------------------- manager
// Each widget belongs to a module. It is shown only if the manager has `<module>.view` AND the admin has not
// narrowed their dashboard to other modules (empty dashboardModules = show everything they may view).
exports.manager = async (user) => {
  const can = (module) =>
    user.permissions.includes(`${module}.view`) &&
    (!user.dashboardModules.length || user.dashboardModules.includes(module));
  const now = new Date();
  const mine = { assignedManager: user._id };
  const myTasks = { createdBy: user._id };

  const loaders = {
    volunteers: () =>
      Volunteer.countDocuments({ ...mine, status: { $ne: "suspended" } }),
    students: () =>
      Student.countDocuments({ ...mine, status: { $ne: "archived" } }),
    beneficiaries: () =>
      Beneficiary.countDocuments({ ...mine, status: { $ne: "archived" } }),
    food: () => sumFoodQty({ manager: user._id }),
    resources: () => Resource.countDocuments({ assignedPerson: user._id }),
    tasks: () => byStatus(Task, myTasks),
    events: () =>
      Event.countDocuments({
        manager: user._id,
        status: "upcoming",
        date: { $gte: now },
      }),
  };
  const allowed = Object.keys(loaders).filter(can);
  const results = Object.fromEntries(
    await Promise.all(allowed.map(async (m) => [m, await loaders[m]()])),
  );

  const widgets = [];
  if (results.volunteers !== undefined)
    widgets.push({
      key: "assignedVolunteers",
      label: "Assigned volunteers",
      value: results.volunteers,
      module: "volunteers",
    });
  if (results.tasks) {
    const t = results.tasks;
    widgets.push(
      {
        key: "activeTasks",
        label: "Active tasks",
        value: (t.accepted || 0) + (t.inProgress || 0),
        module: "tasks",
      },
      {
        key: "completedTasks",
        label: "Completed tasks",
        value: t.completed || 0,
        module: "tasks",
      },
      {
        key: "pendingTasks",
        label: "Pending tasks",
        value: t.assigned || 0,
        module: "tasks",
      },
    );
  }
  if (results.students !== undefined)
    widgets.push({
      key: "assignedStudents",
      label: "Assigned students",
      value: results.students,
      module: "students",
    });
  if (results.beneficiaries !== undefined)
    widgets.push({
      key: "assignedBeneficiaries",
      label: "Assigned beneficiaries",
      value: results.beneficiaries,
      module: "beneficiaries",
    });
  if (results.food)
    widgets.push({
      key: "foodDistributed",
      label: "Food distributed",
      value: results.food[0]?.qty || 0,
      module: "food",
      hint: "by you, kg and litres combined",
    });
  if (results.resources !== undefined)
    widgets.push({
      key: "managedResources",
      label: "Managed resources",
      value: results.resources,
      module: "resources",
    });
  if (results.events !== undefined)
    widgets.push({
      key: "upcomingEvents",
      label: "Upcoming events",
      value: results.events,
      module: "events",
    });

  const extra = {};
  if (results.tasks) {
    extra.taskBreakdown = [
      "assigned",
      "accepted",
      "inProgress",
      "completed",
      "cancelled",
    ]
      .map((k) => ({ name: k, value: results.tasks[k] || 0 }))
      .filter((t) => t.value > 0);
    extra.dueSoon = await Task.find({ ...myTasks, status: { $in: OPEN_TASKS } })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate("assignedUser", "name")
      .select("title dueDate priority status assignedUser")
      .lean();
  }
  if (results.events !== undefined) {
    extra.upcomingEvents = await Event.find({
      manager: user._id,
      status: "upcoming",
      date: { $gte: now },
    })
      .sort({ date: 1 })
      .limit(5)
      .select("name date startTime location")
      .lean();
  }
  return { widgets, ...extra };
};

// ------------------------------------------------------------ volunteer
exports.volunteer = async (user) => {
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const mine = { assignedUser: user._id };

  const [taskStatus, todays, current, profile, events, announcements, recent] =
    await Promise.all([
      byStatus(Task, mine),
      Task.find({
        ...mine,
        status: { $in: OPEN_TASKS },
        dueDate: { $lte: endOfToday },
      })
        .sort({ dueDate: 1 })
        .limit(6)
        .select("title dueDate priority status location")
        .lean(),
      Task.find({ ...mine, status: { $in: ["accepted", "inProgress"] } })
        .sort({ dueDate: 1 })
        .limit(6)
        .select("title dueDate priority status location")
        .lean(),
      Volunteer.findOne({ user: user._id }).select("volunteerHours").lean(),
      Event.find({
        assignedVolunteers: user._id,
        status: "upcoming",
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(5)
        .select("name date startTime endTime location")
        .lean(),
      Announcement.find({
        audience: { $in: ["all", "volunteers"] },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .select("title message createdAt")
        .lean(),
      Task.find(mine)
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("title status updatedAt")
        .lean(),
    ]);

  const assigned = OPEN_TASKS.reduce((s, k) => s + (taskStatus[k] || 0), 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueToday = todays.filter(
    (t) => new Date(t.dueDate) >= todayStart,
  ).length;
  const overdue = todays.length - dueToday;

  return {
    widgets: [
      {
        key: "todaysTasks",
        label: "Today's tasks",
        value: todays.length,
        hint: overdue ? `${overdue} overdue` : undefined,
      },
      { key: "assignedTasks", label: "Assigned tasks", value: assigned },
      {
        key: "completedTasks",
        label: "Completed tasks",
        value: taskStatus.completed || 0,
      },
      {
        key: "volunteerHours",
        label: "Volunteer hours",
        value: profile?.volunteerHours || 0,
      },
      { key: "upcomingEvents", label: "Upcoming events", value: events.length },
    ],
    todaysTasks: todays,
    currentAssignments: current,
    upcomingEvents: events,
    announcements,
    recentActivity: recent.map((t) => ({
      id: t._id,
      text: `${t.title}`,
      status: t.status,
      at: t.updatedAt,
    })),
  };
};
