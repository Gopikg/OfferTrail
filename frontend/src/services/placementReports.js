import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import db from "./firestore";

const reports = collection(db, "placementReports");

export const emptyMetrics = () => ({
  companiesVisited: "",
  totalOffers: "",
  placementRate: "",
  averagePackageLpa: "",
  highestPackageLpa: "",
  activityByMonth: [],
});

function numeric(value, label, { maximum = Infinity, required = true } = {}) {
  if (value === "" || value == null) {
    if (!required) return null;
    throw new Error(`${label} is required before publishing.`);
  }
  if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > maximum) {
    throw new Error(`${label} must be a number between 0 and ${maximum === Infinity ? "the allowed maximum" : maximum}.`);
  }
  return Number(value);
}

export function validateReport({ academicYear, asOfDate, metrics }, { requireComplete = true } = {}) {
  if (!/^\d{4}-\d{4}$/.test(academicYear || "")) {
    throw new Error("Academic year must use the format YYYY-YYYY.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate || "")) {
    throw new Error("Choose an as-of date.");
  }

  const cleaned = {
    companiesVisited: numeric(metrics.companiesVisited, "Companies visiting", { required: requireComplete }),
    totalOffers: numeric(metrics.totalOffers, "Total offers", { required: requireComplete }),
    placementRate: numeric(metrics.placementRate, "Placement rate", { maximum: 100, required: requireComplete }),
    averagePackageLpa: numeric(metrics.averagePackageLpa, "Average package", { required: requireComplete }),
    highestPackageLpa: numeric(metrics.highestPackageLpa, "Highest package", { required: requireComplete }),
    activityByMonth: [],
  };

  if (cleaned.averagePackageLpa != null && cleaned.highestPackageLpa != null && cleaned.averagePackageLpa > cleaned.highestPackageLpa) {
    throw new Error("Average package cannot exceed highest package.");
  }

  const periods = new Set();
  cleaned.activityByMonth = (metrics.activityByMonth || []).map((entry) => {
    if (!/^\d{4}-\d{2}$/.test(entry.period || "") || periods.has(entry.period)) {
      throw new Error("Each activity month must be valid and appear only once.");
    }
    periods.add(entry.period);
    return {
      period: entry.period,
      companies: numeric(entry.companies, `Companies for ${entry.period}`, { required: requireComplete }),
      offers: numeric(entry.offers, `Offers for ${entry.period}`, { required: requireComplete }),
    };
  });
  return cleaned;
}

export async function getPlacementReports() {
  const snapshot = await getDocs(reports);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.academicYear || "").localeCompare(a.academicYear || ""));
}

export async function createPlacementReport(uid, report) {
  const metrics = validateReport(report, { requireComplete: false });
  return addDoc(reports, {
    academicYear: report.academicYear,
    asOfDate: report.asOfDate,
    metrics,
    status: "draft",
    createdBy: uid,
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function savePlacementReport(uid, report) {
  const metrics = validateReport(report, { requireComplete: false });
  return updateDoc(doc(db, "placementReports", report.id), {
    academicYear: report.academicYear,
    asOfDate: report.asOfDate,
    metrics,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
}

export async function publishPlacementReport(uid, report) {
  const metrics = validateReport(report);
  const batch = writeBatch(db);
  const reportRef = doc(db, "placementReports", report.id);
  const publishedAt = serverTimestamp();

  batch.update(reportRef, {
    academicYear: report.academicYear,
    asOfDate: report.asOfDate,
    metrics,
    status: "published",
    updatedBy: uid,
    updatedAt: publishedAt,
    publishedBy: uid,
    publishedAt,
  });
  batch.set(doc(db, "public", "placementOverview"), {
    ...metrics,
    reportingPeriod: { id: report.id, academicYear: report.academicYear, asOfDate: report.asOfDate },
    updatedBy: uid,
    updatedAt: publishedAt,
  });
  return batch.commit();
}
