import api from "./api";

const unwrap = (p) => p.then((r) => r.data.data);

// Public reads and form posts (no login needed).
export const publicApi = {
  site: () => unwrap(api.get("/public/site")),
  programs: () => unwrap(api.get("/public/programs")),
  events: (params) => unwrap(api.get("/public/events", { params })),
  applyVolunteer: (body) =>
    unwrap(api.post("/public/volunteer-applications", body)),
  donationInquiry: (body) =>
    unwrap(api.post("/public/donation-inquiries", body)),
};

// Admin: edit the website. The server sends the field definitions, so this screen has no hardcoded section list.
export const websiteAdmin = {
  get: () => unwrap(api.get("/website")),
  saveSection: (key, body) => unwrap(api.put(`/website/sections/${key}`, body)),
  saveOrganization: (body) => unwrap(api.put("/website/organization", body)),
  uploadImage: (file) => {
    const f = new FormData();
    f.append("image", file);
    return unwrap(api.post("/website/images", f));
  },
};

// Images the CMS uploaded live on the API host; anything else must be a full https address.
export const imageSrc = (url) =>
  url && url.startsWith("/uploads/")
    ? `${import.meta.env.VITE_API_URL || ""}${url}`
    : url || "";
