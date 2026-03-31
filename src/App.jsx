import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
} from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  TrendingUp,
  CheckCircle2,
  Clock,
  LogIn,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Paperclip,
  MapPin,
  BarChart3,
  MessageSquare,
  Send,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { cn } from "./lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Firebase Imports
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
// @ts-ignore
import firebaseConfig from "../firebase-applet-config.json";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// --- Types ---
var OperationType = /*#__PURE__*/ (function (OperationType) {
  OperationType["CREATE"] = "create";
  OperationType["UPDATE"] = "update";
  OperationType["DELETE"] = "delete";
  OperationType["LIST"] = "list";
  OperationType["GET"] = "get";
  OperationType["WRITE"] = "write";
  return OperationType;
})(OperationType || {});

const createNotification = async (userId, title, message, type, link) => {
  try {
    const id = doc(collection(db, "notifications")).id;
    await setDoc(doc(db, "notifications", id), {
      id,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: Timestamp.now(),
      link,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

const DEFAULT_PERMISSIONS = {
  admin: {
    planning: "write",
    clearing: "write",
    assignment: "write",
    transit: "write",
    unloading: "write",
    returnLoad: "write",
    completion: "write",
    canCreateShipments: true,
    canManageUsers: true,
    canManageVessels: true,
  },
  sub_admin: {
    planning: "write",
    clearing: "write",
    assignment: "write",
    transit: "write",
    unloading: "write",
    returnLoad: "write",
    completion: "write",
    canCreateShipments: true,
    canManageUsers: false,
    canManageVessels: true,
  },
  dispatcher: {
    planning: "write",
    clearing: "write",
    assignment: "write",
    transit: "write",
    unloading: "write",
    returnLoad: "write",
    completion: "write",
    canCreateShipments: true,
    canManageUsers: false,
    canManageVessels: true,
  },
  clearing_agent: {
    planning: "read",
    clearing: "write",
    assignment: "read",
    transit: "read",
    unloading: "none",
    returnLoad: "none",
    completion: "none",
    canCreateShipments: false,
    canManageUsers: false,
    canManageVessels: true,
  },
  transporter: {
    planning: "read",
    clearing: "read",
    assignment: "read",
    transit: "write",
    unloading: "none",
    returnLoad: "write",
    completion: "write",
    canCreateShipments: false,
    canManageUsers: false,
    canManageVessels: false,
  },
  receiver: {
    planning: "read",
    clearing: "read",
    assignment: "read",
    transit: "read",
    unloading: "write",
    returnLoad: "none",
    completion: "none",
    canCreateShipments: false,
    canManageUsers: false,
    canManageVessels: false,
  },
  warehouse_manager: {
    planning: "read",
    clearing: "read",
    assignment: "read",
    transit: "read",
    unloading: "write",
    returnLoad: "none",
    completion: "none",
    canCreateShipments: false,
    canManageUsers: false,
    canManageVessels: false,
  },
};

const COMPANIES = [
  "Vital Tea",
  "Vital Soap",
  "Malka Foods",
  "Vital Collection",
  "MTJ",
  "Royal Feeds",
  "Vital Farms",
  "Vital Ginners",
  "Vital Seed",
];

// --- Error Handling ---
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  // In a real app, we might show a toast or alert here
}

// --- Auth Context ---
const AuthContext = createContext({ user: null, profile: null, loading: true });

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        } else {
          // Only create profile for Google users automatically
          // Temp users are created by admin with profile already existing
          if (u.providerData.some((p) => p.providerId === "google.com")) {
            const newProfile = {
              uid: u.uid,
              email: u.email || "",
              displayName: u.displayName || u.email?.split("@")[0] || "",
              photoURL: u.photoURL || "",
              role:
                u.email === "samiarain9797@gmail.com" ? "admin" : "transporter", // Default role
            };
            await setDoc(userRef, {
              ...newProfile,
              createdAt: Timestamp.now(),
            });
            setProfile(newProfile);
          }
        }
      } else {
        setProfile(null);
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Views ---

const ShipmentRow = ({
  shipment,
  profile,
  vessels,
  rolePermissions,
  users = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(shipment);

  const perms = profile?.role
    ? rolePermissions[profile.role]
    : DEFAULT_PERMISSIONS.admin;

  const calculateDaysRemaining = (
    startDateStr,
    totalDays,
    completionDateStr,
  ) => {
    if (!startDateStr) return null;
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return null;
    const now = completionDateStr ? new Date(completionDateStr) : new Date();
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return totalDays - diffDays;
  };

  const demurrageDays = calculateDaysRemaining(
    shipment.vesselArrivalDate,
    10,
    shipment.actualLiftingTime || shipment.actualPickupTime,
  );
  const detentionDays = calculateDaysRemaining(
    shipment.vesselArrivalDate,
    21,
    shipment.emptyContainerReturnTime,
  );

  const handleSave = async () => {
    try {
      const updates = { ...editData };
      // If vehicle number is being added for the first time, set actualPickupTime
      if (
        editData.vehicleNumber &&
        !shipment.vehicleNumber &&
        !shipment.actualPickupTime
      ) {
        updates.actualPickupTime = new Date().toISOString().split("T")[0];
      }

      await setDoc(
        doc(db, "shipments", shipment.id),
        {
          ...updates,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      // Automatic Alerts for Next Section
      if (!shipment.clearanceDate && editData.clearanceDate) {
        // Clearing completed -> Notify Dispatchers/Admins for Assignment
        const dispatchers = users.filter(
          (u) => u.role === "dispatcher" || u.role === "admin",
        );
        for (const d of dispatchers) {
          await createNotification(
            d.uid,
            "Ready for Assignment",
            `Shipment ${shipment.trackingId} has been cleared and is ready for transporter assignment.`,
            "info",
            "Shipments",
          );
        }
      }
      if (!shipment.transporterId && editData.transporterId) {
        // Assignment completed -> Notify Transporter
        await createNotification(
          editData.transporterId,
          "New Shipment Assigned",
          `You have been assigned to transport shipment ${shipment.trackingId}.`,
          "info",
          "Shipments",
        );
      }
      if (!shipment.actualArrivalTime && editData.actualArrivalTime) {
        // Transit completed -> Notify Receivers
        const receivers = users.filter((u) => u.role === "receiver");
        for (const r of receivers) {
          await createNotification(
            r.uid,
            "Shipment Arrived",
            `Shipment ${shipment.trackingId} has arrived at the destination for unloading.`,
            "info",
            "Shipments",
          );
        }
      }
      if (!shipment.factoryGateOutTime && editData.factoryGateOutTime) {
        // Unloading completed -> Notify Transporter to pick up empty/return load
        if (shipment.transporterId) {
          await createNotification(
            shipment.transporterId,
            "Unloading Completed",
            `Shipment ${shipment.trackingId} has been unloaded. You can now proceed with the return load.`,
            "info",
            "Shipments",
          );
        }
      }
      if (!shipment.returnWarehouseDetails && editData.returnWarehouseDetails) {
        // Return load warehouse selected -> Notify Warehouse Manager
        const whManagers = users.filter(
          (u) =>
            u.role === "warehouse_manager" &&
            u.warehouseLocation === editData.returnWarehouseDetails,
        );
        for (const wm of whManagers) {
          await createNotification(
            wm.uid,
            "Incoming Return Load",
            `Shipment ${shipment.trackingId} is heading to your warehouse (${editData.returnWarehouseDetails}).`,
            "info",
            "Shipments",
          );
        }
      }

      // Notify admin about general update
      await createNotification(
        "admin",
        "Shipment Updated",
        `Shipment ${shipment.trackingId} has been updated.`,
        "info",
        "Shipments",
      );
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `shipments/${shipment.id}`,
      );
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-6">
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {shipment.trackingId}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                shipment.status === "Completed"
                  ? "bg-green-500"
                  : shipment.status === "In Transit"
                    ? "bg-blue-500"
                    : "bg-orange-500",
              )}
            />
            <span className="text-xs font-medium text-zinc-700">
              {shipment.status}
            </span>
          </div>
          {shipment.companyName && (
            <span className="text-[10px] text-zinc-400 font-mono uppercase px-2 border-l border-zinc-200">
              {shipment.companyName}
            </span>
          )}
          {shipment.transporterName && (
            <span className="text-[10px] text-orange-600 font-mono uppercase px-2 border-l border-zinc-200 flex items-center gap-1">
              <Truck size={10} /> {shipment.transporterName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex gap-2">
            {demurrageDays !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono border",
                  shipment.actualLiftingTime || shipment.actualPickupTime
                    ? "bg-green-50 border-green-100 text-green-600"
                    : demurrageDays < 3
                      ? "bg-red-50 border-red-100 text-red-600 animate-pulse"
                      : demurrageDays < 5
                        ? "bg-orange-50 border-orange-100 text-orange-600"
                        : "bg-zinc-50 border-zinc-100 text-zinc-500",
                )}
              >
                <Truck size={12} />
                {shipment.actualLiftingTime || shipment.actualPickupTime
                  ? "LIFTED"
                  : `${demurrageDays}D LIFTING`}
              </div>
            )}
            {detentionDays !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono border",
                  shipment.emptyContainerReturnTime
                    ? "bg-green-50 border-green-100 text-green-600"
                    : detentionDays < 5
                      ? "bg-red-50 border-red-100 text-red-600 animate-pulse"
                      : detentionDays < 10
                        ? "bg-orange-50 border-orange-100 text-orange-600"
                        : "bg-zinc-50 border-zinc-100 text-zinc-500",
                )}
              >
                <Clock size={12} />
                {shipment.emptyContainerReturnTime
                  ? "RETURNED"
                  : `${detentionDays}D RETURN`}
              </div>
            )}
          </div>
          {Object.values(perms).some((v) => v === "write") &&
            (isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-xs font-medium"
                >
                  <CheckCircle2 size={14} /> Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors text-xs font-medium"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200 text-xs font-medium"
              >
                <Settings size={14} /> Update My Section
              </button>
            ))}
        </div>
      </div>

      {/* Transporter Alert Banner */}
      {profile?.role === "transporter" &&
        ((demurrageDays !== null &&
          demurrageDays < 3 &&
          !shipment.actualLiftingTime &&
          !shipment.actualPickupTime) ||
          (detentionDays !== null &&
            detentionDays < 5 &&
            !shipment.emptyContainerReturnTime)) && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-600 animate-bounce" />
            <span className="text-xs font-bold text-red-600 uppercase tracking-tight">
              Action Required:
              {demurrageDays !== null &&
                demurrageDays < 3 &&
                !shipment.actualLiftingTime &&
                !shipment.actualPickupTime &&
                ` Lift container within ${demurrageDays} days.`}
              {detentionDays !== null &&
                detentionDays < 5 &&
                !shipment.emptyContainerReturnTime &&
                ` Return empty container within ${detentionDays} days.`}
            </span>
          </div>
        )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {/* Stage 1: Planning */}
        {perms.planning !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.planning === "write" ? "bg-zinc-50/30" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <LayoutDashboard size={12} /> Planning
            </h4>
            {isEditing && perms.planning === "write" ? (
              <div className="space-y-2">
                <select
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  value={editData.companyName || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, companyName: e.target.value })
                  }
                >
                  <option value="">Select Company</option>
                  {COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  value={editData.vesselName || ""}
                  onChange={(e) => {
                    const selectedVessel = vessels.find(
                      (v) => v.name === e.target.value,
                    );
                    setEditData({
                      ...editData,
                      vesselName: e.target.value,
                      totalContainersInVessel:
                        selectedVessel?.totalContainers || 0,
                    });
                  }}
                >
                  <option value="">Select Vessel</option>
                  {vessels.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  placeholder="Port of Loading"
                  value={editData.portOfLoading || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, portOfLoading: e.target.value })
                  }
                />

                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  type="date"
                  value={editData.vesselArrivalDate || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      vesselArrivalDate: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium truncate">
                  {shipment.companyName || "No Company"}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {shipment.vesselName || "N/A"}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {shipment.portOfLoading || "No Port"}
                </p>
                <p className="text-[10px] text-zinc-400">
                  Arrival: {shipment.vesselArrivalDate || "TBD"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Clearing */}
        {perms.clearing !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.clearing === "write" ? "bg-orange-50/30" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <ShieldAlert size={12} className="text-orange-500" /> Clearing
            </h4>
            {isEditing && perms.clearing === "write" ? (
              <div className="space-y-2">
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  placeholder="Container #"
                  value={editData.containerNumber || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      containerNumber: e.target.value,
                    })
                  }
                />

                <select
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  value={editData.containerSizeAndType || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      containerSizeAndType: e.target.value,
                    })
                  }
                >
                  <option value="">Size & Type</option>
                  <option value="20FT">20FT</option>
                  <option value="40FT">40FT</option>
                  <option value="40HC">40HC</option>
                </select>
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  placeholder="Gross Weight"
                  value={editData.grossWeight || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, grossWeight: e.target.value })
                  }
                />

                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  placeholder="No. of Packages"
                  type="number"
                  value={editData.numberOfPackages || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      numberOfPackages: parseInt(e.target.value),
                    })
                  }
                />

                <textarea
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  placeholder="Commodity Description"
                  rows={2}
                  value={editData.commodityDescription || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      commodityDescription: e.target.value,
                    })
                  }
                />

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Duty Pay Date
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="date"
                    value={editData.dutyPayDate || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, dutyPayDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Clearance Date
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="date"
                    value={editData.clearanceDate || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        clearanceDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium truncate">
                  {shipment.containerNumber || "N/A"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {shipment.containerSizeAndType || "Size TBD"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Weight: {shipment.grossWeight || "N/A"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Pkgs: {shipment.numberOfPackages || "0"}
                </p>
                <p className="text-[10px] text-zinc-400 line-clamp-1 italic">
                  {shipment.commodityDescription || "No Description"}
                </p>
                <div className="pt-1 border-t border-zinc-100 mt-1">
                  <p className="text-[9px] text-orange-600">
                    Duty: {shipment.dutyPayDate || "Pending"}
                  </p>
                  <p className="text-[9px] text-orange-600">
                    Cleared: {shipment.clearanceDate || "Pending"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 3: Assignment */}
        {perms.assignment !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.assignment === "write" ? "bg-yellow-50/30" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Users size={12} className="text-yellow-600" /> Assignment
            </h4>
            {isEditing && perms.assignment === "write" ? (
              <div className="space-y-2">
                <select
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900"
                  value={editData.transporterId || ""}
                  onChange={(e) => {
                    const selected = users.find(
                      (u) => u.uid === e.target.value,
                    );
                    setEditData({
                      ...editData,
                      transporterId: e.target.value,
                      transporterName: selected?.displayName || "",
                    });
                  }}
                >
                  <option value="">Assign Transporter</option>
                  {users
                    .filter((u) => u.role === "transporter")
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName}
                      </option>
                    ))}
                </select>
                <p className="text-[9px] text-zinc-400 italic">
                  Assigning a transporter will grant them visibility of this
                  shipment.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest">
                  Transporter
                </p>
                <p className="text-sm text-zinc-900 font-medium">
                  {shipment.transporterName || "Unassigned"}
                </p>
                {shipment.transporterId && (
                  <span className="inline-block px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[8px] rounded uppercase tracking-widest border border-yellow-100">
                    Assigned
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage 4: Transit */}
        {perms.transit !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.transit === "write" ? "bg-blue-50/30" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Truck size={12} className="text-blue-600" /> Transit
            </h4>

            {isEditing && perms.transit === "write" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <input
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    placeholder="Vehicle #"
                    value={editData.vehicleNumber || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        vehicleNumber: e.target.value,
                      })
                    }
                  />

                  <select
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    value={editData.vehicleType || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, vehicleType: e.target.value })
                    }
                  >
                    <option value="">Vehicle Type</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Container Carrier">Container Carrier</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <input
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    placeholder="Driver Name"
                    value={editData.driverName || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, driverName: e.target.value })
                    }
                  />

                  <input
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    placeholder="Driver Phone"
                    value={editData.driverPhone || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, driverPhone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    ID Card & Docs
                  </label>
                  <div className="flex gap-1">
                    <FileUploader
                      label={
                        editData.driverIdCardUrl
                          ? "ID Attached"
                          : "Attach ID Card"
                      }
                      onUpload={(url) =>
                        setEditData({ ...editData, driverIdCardUrl: url })
                      }
                      className="flex-1"
                      accept="image/*,application/pdf"
                    />

                    <FileUploader
                      label="Add Document"
                      onUpload={(url, name) => {
                        const newDoc = { name, url };
                        setEditData({
                          ...editData,
                          transporterDocs: [
                            ...(editData.transporterDocs || []),
                            newDoc,
                          ],
                        });
                      }}
                      className="flex-1"
                      accept="image/*,application/pdf"
                    />
                  </div>
                </div>

                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  placeholder="Live Tracking URL"
                  value={editData.liveTrackingUrl || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      liveTrackingUrl: e.target.value,
                    })
                  }
                />

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Actual Lifting Time
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="date"
                    value={editData.actualLiftingTime || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        actualLiftingTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm text-zinc-900 font-medium">
                    {shipment.vehicleNumber || "No Vehicle"}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {shipment.vehicleType || "N/A"}
                  </p>
                </div>

                <div className="p-2 bg-zinc-50/50 rounded border border-zinc-100 space-y-1">
                  <p className="text-[10px] text-zinc-700 font-medium">
                    {shipment.driverName || "No Driver"}
                  </p>
                  <p className="text-[9px] text-zinc-400">
                    {shipment.driverPhone || "-"}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {shipment.driverIdCardUrl && (
                      <a
                        href={shipment.driverIdCardUrl}
                        target="_blank"
                        className="text-[8px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText size={8} /> ID CARD
                      </a>
                    )}
                    {(shipment.transporterDocs || []).length > 0 && (
                      <span className="text-[8px] text-zinc-400 flex items-center gap-1">
                        <Paperclip size={8} />{" "}
                        {(shipment.transporterDocs || []).length} DOCS
                      </span>
                    )}
                  </div>
                </div>

                {shipment.actualLiftingTime && (
                  <p className="text-[10px] text-green-600 font-mono uppercase tracking-tighter">
                    Lifted: {shipment.actualLiftingTime}
                  </p>
                )}

                {shipment.liveTrackingUrl ? (
                  <a
                    href={shipment.liveTrackingUrl}
                    target="_blank"
                    className="text-[9px] text-blue-600 underline block flex items-center gap-1"
                  >
                    <MapPin size={10} /> Live Tracking
                  </a>
                ) : (
                  <p className="text-[9px] text-zinc-300 italic">No Tracking</p>
                )}
                <p className="text-[10px] text-blue-600/70">
                  ETA:{" "}
                  {shipment.etaToDestination
                    ? new Date(shipment.etaToDestination).toLocaleString()
                    : "TBD"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stage 5: Unloading */}
        {perms.unloading !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.unloading === "write" ? "bg-green-50/30" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-600" /> Unloading
            </h4>
            {isEditing && perms.unloading === "write" ? (
              <div className="space-y-2">
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-1 py-1 text-[9px] text-zinc-900"
                  placeholder="Location"
                  value={editData.unloadingLocation || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      unloadingLocation: e.target.value,
                    })
                  }
                />

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Factory Gate In
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-1 py-1 text-[9px] text-zinc-900"
                    type="date"
                    value={editData.factoryGateInTime || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        factoryGateInTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Unloading Date
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-1 py-1 text-[9px] text-zinc-900"
                    type="date"
                    value={editData.unloadingDate || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        unloadingDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Factory Gate Out
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-1 py-1 text-[9px] text-zinc-900"
                    type="date"
                    value={editData.factoryGateOutTime || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        factoryGateOutTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Receiving Document
                  </label>
                  <FileUploader
                    label={
                      editData.receivingDocUrl
                        ? "Document Attached"
                        : "Attach Receiving Doc"
                    }
                    onUpload={(url) =>
                      setEditData({ ...editData, receivingDocUrl: url })
                    }
                    accept="image/*,application/pdf"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium">
                  {shipment.factoryGateOutTime ? "Completed" : "Pending"}
                </p>
                <div className="flex flex-col text-[9px] text-zinc-400">
                  {shipment.unloadingLocation && (
                    <span>Location: {shipment.unloadingLocation}</span>
                  )}
                  {shipment.factoryGateInTime && (
                    <span>Factory Gate In: {shipment.factoryGateInTime}</span>
                  )}
                  {shipment.unloadingDate && (
                    <span>Unloading Date: {shipment.unloadingDate}</span>
                  )}
                  {shipment.factoryGateOutTime && (
                    <span>Factory Gate Out: {shipment.factoryGateOutTime}</span>
                  )}
                </div>
                {shipment.receivingDocUrl && (
                  <a
                    href={shipment.receivingDocUrl}
                    target="_blank"
                    className="text-[9px] text-green-600 underline block"
                  >
                    View Doc
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage 6: Return Load */}
        {perms.returnLoad !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.returnLoad === "write" ? "bg-purple-50/30" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Clock size={12} className="text-purple-600" /> Return Load
            </h4>
            {isEditing && perms.returnLoad === "write" ? (
              <div className="space-y-2">
                <select
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  value={editData.returnWarehouseDetails || ""}
                  onChange={(e) => {
                    const warehouse = e.target.value;
                    setEditData({
                      ...editData,
                      returnWarehouseDetails: warehouse,
                      returnLoadDestination: warehouse, // Automatically set destination
                    });
                  }}
                >
                  <option value="">Select Warehouse</option>
                  <option value="Karachi Warehouse">Karachi Warehouse</option>
                  <option value="Hyderabad Warehouse">
                    Hyderabad Warehouse
                  </option>
                  <option value="Sukkur Warehouse">Sukkur Warehouse</option>
                </select>
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  placeholder="Destination"
                  value={editData.returnLoadDestination || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      returnLoadDestination: e.target.value,
                    })
                  }
                  disabled // Disabled because it's auto-filled from warehouse
                />
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  placeholder="Materials (Cartons etc)"
                  value={editData.returnLoadMaterialDetails || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      returnLoadMaterialDetails: e.target.value,
                    })
                  }
                />

                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  placeholder="Quantity"
                  value={editData.returnLoadQuantity || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      returnLoadQuantity: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium truncate">
                  {shipment.returnWarehouseDetails ||
                    shipment.returnLoadDestination ||
                    "None"}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {shipment.returnLoadMaterialDetails || "-"}
                </p>
                <p className="text-[10px] text-purple-500/70">
                  Qty: {shipment.returnLoadQuantity || "0"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stage 7: Financials */}
        {(profile?.role === "admin" || profile?.role === "sub_admin") && (
          <div className={cn("p-4 space-y-3 bg-orange-500/5")}>
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <TrendingUp size={12} className="text-orange-500" /> Financials
            </h4>
            {isEditing ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[8px] text-zinc-500 uppercase font-mono">
                    Transport
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="number"
                    value={editData.transportCost || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditData({
                        ...editData,
                        transportCost: val,
                        totalCost:
                          val +
                          (editData.clearingCost || 0) +
                          (editData.otherCosts || 0),
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-zinc-500 uppercase font-mono">
                    Clearing
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="number"
                    value={editData.clearingCost || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditData({
                        ...editData,
                        clearingCost: val,
                        totalCost:
                          (editData.transportCost || 0) +
                          val +
                          (editData.otherCosts || 0),
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-zinc-500 uppercase font-mono">
                    Other Costs
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="number"
                    value={editData.otherCosts || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditData({
                        ...editData,
                        otherCosts: val,
                        totalCost:
                          (editData.transportCost || 0) +
                          (editData.clearingCost || 0) +
                          val,
                      });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-zinc-500">Transport:</span>
                  <span className="text-zinc-300 font-mono">
                    PKR {(shipment.transportCost || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-zinc-500">Clearing:</span>
                  <span className="text-zinc-300 font-mono">
                    PKR {(shipment.clearingCost || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-zinc-500">Other:</span>
                  <span className="text-zinc-300 font-mono">
                    PKR {(shipment.otherCosts || 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-1 mt-1 border-t border-zinc-800 flex justify-between text-[10px]">
                  <span className="text-orange-500 font-bold">Total:</span>
                  <span className="text-orange-500 font-bold font-mono">
                    PKR {(shipment.totalCost || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 8: Completion */}
        {perms.completion !== "none" && (
          <div
            className={cn(
              "p-4 space-y-3",
              perms.completion === "write" ? "bg-zinc-900/40" : "opacity-50",
            )}
          >
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-zinc-400" /> Completion
            </h4>
            {isEditing && perms.completion === "write" ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-mono">
                    Empty Return Time
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="datetime-local"
                    value={editData.emptyContainerReturnTime || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        emptyContainerReturnTime: e.target.value,
                      })
                    }
                  />
                </div>
                <select
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                  value={editData.status}
                  onChange={(e) =>
                    setEditData({ ...editData, status: e.target.value })
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-200 font-medium">
                  {shipment.status === "Completed" ? "Finished" : "In Progress"}
                </p>
                {shipment.emptyContainerReturnTime && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500">Empty Returned:</p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(
                        shipment.emptyContainerReturnTime,
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compliance & SLA Tracking Table */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
              <ShieldAlert size={12} /> Compliance & SLA Tracking
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-200">
                    <th className="text-left py-2 font-medium">METRIC</th>
                    <th className="text-left py-2 font-medium">LIMIT</th>
                    <th className="text-left py-2 font-medium">START DATE</th>
                    <th className="text-left py-2 font-medium">COMPLETION</th>
                    <th className="text-left py-2 font-medium">BALANCE DAYS</th>
                    <th className="text-left py-2 font-medium">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="py-2 text-zinc-700">
                      Lifting (Vessel Arrival to Lift)
                    </td>
                    <td className="py-2 text-zinc-500">10 Days</td>
                    <td className="py-2 text-zinc-500">
                      {shipment.vesselArrivalDate || "N/A"}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {shipment.actualLiftingTime ||
                        shipment.actualPickupTime ||
                        "Pending"}
                    </td>
                    <td
                      className={cn(
                        "py-2 font-bold",
                        demurrageDays !== null && demurrageDays < 0
                          ? "text-red-500"
                          : demurrageDays !== null && demurrageDays < 3
                            ? "text-orange-500"
                            : "text-zinc-600",
                      )}
                    >
                      {demurrageDays !== null ? `${demurrageDays} Days` : "-"}
                    </td>
                    <td className="py-2">
                      {demurrageDays !== null && demurrageDays < 0 ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded border border-red-200">
                          DEMURRAGE
                        </span>
                      ) : shipment.actualLiftingTime ||
                        shipment.actualPickupTime ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded border border-green-200">
                          COMPLIANT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded border border-zinc-200">
                          ON TRACK
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-zinc-700">
                      Empty Return (Port to Port)
                    </td>
                    <td className="py-2 text-zinc-500">21 Days</td>
                    <td className="py-2 text-zinc-500">
                      {shipment.vesselArrivalDate || "N/A"}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {shipment.emptyContainerReturnTime || "Pending"}
                    </td>
                    <td
                      className={cn(
                        "py-2 font-bold",
                        detentionDays !== null && detentionDays < 0
                          ? "text-red-500"
                          : detentionDays !== null && detentionDays < 5
                            ? "text-orange-500"
                            : "text-zinc-600",
                      )}
                    >
                      {detentionDays !== null ? `${detentionDays} Days` : "-"}
                    </td>
                    <td className="py-2">
                      {detentionDays !== null && detentionDays < 0 ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded border border-red-200">
                          DETENTION
                        </span>
                      ) : shipment.emptyContainerReturnTime ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded border border-green-200">
                          COMPLIANT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded border border-zinc-200">
                          ON TRACK
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
              <Paperclip size={12} /> Shipment Documents
            </h4>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(shipment.transporterDocs || []).map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] text-zinc-600 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <FileText size={12} /> {doc.name}
                  </a>
                ))}
                {shipment.driverIdCardUrl && (
                  <a
                    href={shipment.driverIdCardUrl}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] text-zinc-600 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <ShieldAlert size={12} /> DRIVER ID
                  </a>
                )}
                {shipment.receivingDocUrl && (
                  <a
                    href={shipment.receivingDocUrl}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] text-zinc-600 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <CheckCircle2 size={12} /> RECEIVING DOC
                  </a>
                )}
              </div>
              {isEditing && (
                <div className="p-4 bg-white border border-dashed border-zinc-200 rounded-xl">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                    Add New Document
                  </p>
                  <FileUploader
                    label="Upload PDF or Picture"
                    onUpload={(url, name) => {
                      const newDoc = { name, url };
                      setEditData({
                        ...editData,
                        transporterDocs: [
                          ...(editData.transporterDocs || []),
                          newDoc,
                        ],
                      });
                    }}
                    accept="image/*,application/pdf"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({
  shipments,
  vessels,
  profile,
  setActiveTab,
  rolePermissions,
  users,
  onStartChat,
}) => {
  const [timeRange, setTimeRange] = useState("monthly");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedStat, setSelectedStat] = useState(null);

  const filteredShipments = shipments.filter((s) => {
    const matchesCompany =
      selectedCompany === "all" || s.companyName === selectedCompany;
    const matchesWarehouse =
      profile?.role === "warehouse_manager" && profile.warehouseLocation
        ? s.returnWarehouseDetails === profile.warehouseLocation
        : true;
    return matchesCompany && matchesWarehouse;
  });

  const getChartData = () => {
    const now = new Date();
    const data = [];

    if (timeRange === "weekly") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const dayShipments = filteredShipments.filter((s) => {
          const sDate = s.actualPickupTime || s.vesselArrivalDate || "";
          return sDate.startsWith(dateStr);
        });

        data.push({
          name: dayName,
          shipments: dayShipments.length,
          cost: dayShipments.reduce((acc, s) => acc + (s.totalCost || 0), 0),
        });
      }
    } else if (timeRange === "monthly") {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthName = d.toLocaleDateString("en-US", { month: "short" });
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        const monthShipments = filteredShipments.filter((s) => {
          const sDate = s.actualPickupTime || s.vesselArrivalDate || "";
          return sDate.startsWith(yearMonth);
        });

        data.push({
          name: monthName,
          shipments: monthShipments.length,
          cost: monthShipments.reduce((acc, s) => acc + (s.totalCost || 0), 0),
        });
      }
    } else {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearShipments = filteredShipments.filter((s) => {
          const sDate = s.actualPickupTime || s.vesselArrivalDate || "";
          return sDate.startsWith(year.toString());
        });

        data.push({
          name: year.toString(),
          shipments: yearShipments.length,
          cost: yearShipments.reduce((acc, s) => acc + (s.totalCost || 0), 0),
        });
      }
    }
    return data;
  };

  const chartData = getChartData();

  const nextVessel = [...vessels]
    .filter((v) => new Date(v.expectedDate) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime(),
    )[0];

  const totalRemaining = vessels.reduce((acc, v) => {
    const picked = filteredShipments.filter(
      (s) => s.vesselName === v.name && s.actualPickupTime,
    ).length;
    return acc + (v.totalContainers - picked);
  }, 0);

  const stats = [
    {
      label: "Active Shipments",
      value: filteredShipments.filter(
        (s) => s.status !== "Delivered" && s.status !== "Completed",
      ).length,
      icon: Truck,
      color: "bg-blue-500",
      trend: "+12%",
    },
    {
      label: "Containers Remaining",
      value: totalRemaining,
      icon: Package,
      color: "bg-orange-500",
      trend: "Vessel Total",
    },
    {
      label: "Next Vessel",
      value: nextVessel?.name || "None",
      icon: ShieldAlert,
      color: "bg-purple-500",
      trend: nextVessel?.expectedDate || "TBD",
    },
    {
      label: "Delivered (MTD)",
      value: filteredShipments.filter((s) => s.status === "Delivered").length,
      icon: CheckCircle2,
      color: "bg-green-500",
      trend: "+18%",
    },
  ];

  // Vessel Progress Analytics
  const vesselStats = filteredShipments.reduce((acc, s) => {
    if (!s.vesselName) return acc;
    if (!acc[s.vesselName]) {
      acc[s.vesselName] = { total: s.totalContainersInVessel || 0, picked: 0 };
    }
    acc[s.vesselName].picked += 1;
    return acc;
  }, {});

  // Transporter Performance Analytics
  const transporterStats = filteredShipments.reduce((acc, s) => {
    if (!s.transporterName) return acc;
    if (!acc[s.transporterName]) {
      acc[s.transporterName] = { pending: 0, picked: 0 };
    }
    if (s.actualPickupTime) acc[s.transporterName].picked += 1;
    else acc[s.transporterName].pending += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Dashboard Overview
          </h2>
          <p className="text-zinc-500 text-sm">
            Real-time logistics and cost analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onStartChat}
            className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <MessageSquare size={14} /> Chat with Team
          </button>
          <select
            className="bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-orange-500 shadow-sm"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="all">All Companies</option>
            {COMPANIES.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg">
            {["weekly", "monthly", "yearly"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                  timeRange === range
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700",
                )}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <BarChart3 size={14} /> Shipment Progress
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
              COUNT
            </span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorShipments"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f1f1"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="shipments"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorShipments)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <TrendingUp size={14} /> Cost Progress
            </h3>
            <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">
              PKR
            </span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f1f1"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value) => [
                    `Rs. ${value.toLocaleString()}`,
                    "Cost",
                  ]}
                />

                <Bar
                  dataKey="cost"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                  barSize={timeRange === "weekly" ? 30 : 40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard
            key={i}
            label={stat.label}
            value={stat.value.toString()}
            trend={stat.trend}
            icon={stat.icon}
            color={stat.color}
            onClick={() => setSelectedStat(stat.label)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedStat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">
                  {selectedStat} Details
                </h3>
                <p className="text-zinc-500 text-xs">
                  Detailed breakdown of {selectedStat.toLowerCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedStat(null)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} className="text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedStat === "Active Shipments" && (
                <div className="space-y-4">
                  {filteredShipments
                    .filter(
                      (s) =>
                        s.status !== "Delivered" && s.status !== "Completed",
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-4 border border-zinc-100 rounded-xl hover:border-blue-200 transition-colors bg-zinc-50/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">
                              {s.containerNumber || "No Container"}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                              {s.trackingId}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                            {s.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-zinc-600">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase font-mono">
                              Vessel
                            </p>
                            <p>{s.vesselName || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase font-mono">
                              Company
                            </p>
                            <p>{s.companyName || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {filteredShipments.filter(
                    (s) => s.status !== "Delivered" && s.status !== "Completed",
                  ).length === 0 && (
                    <p className="text-center text-zinc-400 py-8">
                      No active shipments found.
                    </p>
                  )}
                </div>
              )}

              {selectedStat === "Containers Remaining" && (
                <div className="space-y-6">
                  {vessels.map((v) => {
                    const picked = filteredShipments.filter(
                      (s) => s.vesselName === v.name && s.actualPickupTime,
                    ).length;
                    const remaining = v.totalContainers - picked;
                    return (
                      <div key={v.id} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900">
                              {v.name}
                            </h4>
                            <p className="text-[10px] text-zinc-500">
                              Expected: {v.expectedDate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-orange-600">
                              {remaining}
                            </p>
                            <p className="text-[10px] text-zinc-400 uppercase font-mono">
                              Remaining
                            </p>
                          </div>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 transition-all duration-500"
                            style={{
                              width: `${(picked / v.totalContainers) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                          <span>Picked: {picked}</span>
                          <span>Total: {v.totalContainers}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedStat === "Next Vessel" && (
                <div className="space-y-6">
                  {nextVessel ? (
                    <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-200">
                        <ShieldAlert size={32} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-zinc-900">
                          {nextVessel.name}
                        </h4>
                        <p className="text-purple-600 font-medium">
                          {nextVessel.status}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                          <p className="text-[10px] text-zinc-400 uppercase font-mono mb-1">
                            Expected Date
                          </p>
                          <p className="text-sm font-bold text-zinc-900">
                            {nextVessel.expectedDate}
                          </p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                          <p className="text-[10px] text-zinc-400 uppercase font-mono mb-1">
                            Total Containers
                          </p>
                          <p className="text-sm font-bold text-zinc-900">
                            {nextVessel.totalContainers}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-zinc-400 py-8">
                      No upcoming vessels scheduled.
                    </p>
                  )}
                </div>
              )}

              {selectedStat === "Delivered (MTD)" && (
                <div className="space-y-4">
                  {filteredShipments
                    .filter((s) => s.status === "Delivered")
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-4 border border-zinc-100 rounded-xl hover:border-green-200 transition-colors bg-zinc-50/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">
                              {s.containerNumber || "No Container"}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                              {s.trackingId}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                            Delivered
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-zinc-600">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase font-mono">
                              Vessel
                            </p>
                            <p>{s.vesselName || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase font-mono">
                              Delivered At
                            </p>
                            <p>
                              {s.actualArrivalTime ||
                                s.updatedAt?.toDate?.()?.toLocaleString() ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {filteredShipments.filter((s) => s.status === "Delivered")
                    .length === 0 && (
                    <p className="text-center text-zinc-400 py-8">
                      No delivered shipments recorded this month.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setSelectedStat(null)}
                className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vessel Progress - Hide for transporters */}
        {profile?.role !== "transporter" && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <LayoutDashboard size={14} /> Vessel Discharge Progress
            </h3>
            <div className="space-y-6">
              {Object.entries(vesselStats).map(([name, data]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700 font-medium">{name}</span>
                    <span className="text-zinc-500">
                      {data.picked} / {data.total || "?"} Containers
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
                      style={{
                        width: `${data.total ? (data.picked / data.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {Object.keys(vesselStats).length === 0 && (
                <p className="text-xs text-zinc-400 italic">
                  No active vessel data available
                </p>
              )}
            </div>
          </div>
        )}

        {/* Transporter Load Board - Hide for transporters */}
        {profile?.role !== "transporter" && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Truck size={14} /> Transporter Load Board
            </h3>
            <div className="space-y-4">
              {Object.entries(transporterStats).map(([name, data]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100 rounded-xl"
                >
                  <div>
                    <p className="text-sm text-zinc-900 font-medium">{name}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-tighter">
                      Active Carrier
                    </p>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <p className="text-xs text-blue-600 font-bold">
                        {data.pending}
                      </p>
                      <p className="text-[9px] text-zinc-500 uppercase">
                        Pending
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-bold">
                        {data.picked}
                      </p>
                      <p className="text-[9px] text-zinc-500 uppercase">
                        Picked
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(transporterStats).length === 0 && (
                <p className="text-xs text-zinc-400 italic">
                  No transporter activity recorded
                </p>
              )}
            </div>
          </div>
        )}

        {/* Transporter Specific Summary */}
        {profile?.role === "transporter" && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 lg:col-span-2 shadow-sm">
            <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Truck size={14} /> My Fleet Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                  Assigned Shipments
                </p>
                <p className="text-2xl font-bold text-zinc-900">
                  {shipments.length}
                </p>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                  Completed Deliveries
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {shipments.filter((s) => s.status === "Completed").length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unified Shipment Progress View */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Clock size={14} /> Shipment Lifecycle Tracking
          </h3>
          <button
            onClick={() => setActiveTab("Shipments")}
            className="text-xs text-orange-600 hover:underline font-medium"
          >
            View All Shipments
          </button>
        </div>
        {shipments.length > 0 ? (
          shipments
            .slice(0, 5)
            .map((shipment) => (
              <ShipmentRow
                key={shipment.id}
                shipment={shipment}
                profile={profile}
                vessels={vessels}
                rolePermissions={rolePermissions}
                users={users}
              />
            ))
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 font-mono text-xs uppercase tracking-widest shadow-sm">
            No active shipments found
          </div>
        )}
      </div>
    </div>
  );
};

const VesselPlanningView = ({ vessels, shipments }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingVesselId, setEditingVesselId] = useState(null);
  const [expandedVessel, setExpandedVessel] = useState(null);
  const [expandedBL, setExpandedBL] = useState(null);
  const [newVessel, setNewVessel] = useState({
    status: "Expected",
    bls: [{ blNumber: "", containers: "" }]
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newVessel.name) return;
    try {
      const isEditing = !!editingVesselId;
      const vesselId = isEditing ? editingVesselId : doc(collection(db, "vessels")).id;
      
      let totalContainers = 0;
      const processedBls = (newVessel.bls || []).map(bl => {
        const containerList = bl.containers.split(',').map(c => c.trim()).filter(c => c !== "");
        totalContainers += containerList.length;
        return {
          blNumber: bl.blNumber,
          containers: containerList
        };
      });

      await setDoc(doc(db, "vessels", vesselId), {
        name: newVessel.name,
        arrivalDate: newVessel.arrivalDate || "",
        expectedDate: newVessel.expectedDate || newVessel.arrivalDate || "",
        clearanceDate: newVessel.clearanceDate || "",
        status: newVessel.status || "Expected",
        bls: processedBls,
        totalContainers,
        id: vesselId,
        updatedAt: Timestamp.now(),
      });

      // Auto-create shipments for NEW containers
      for (const bl of processedBls) {
        for (const container of bl.containers) {
          const exists = shipments.some(s => s.vesselName === newVessel.name && s.blNumber === bl.blNumber && s.containerNumber === container);
          if (!exists) {
            const shipmentId = doc(collection(db, "shipments")).id;
            await setDoc(doc(db, "shipments", shipmentId), {
              id: shipmentId,
              trackingId: `SHP-${Math.floor(Math.random() * 100000)}`,
              vesselName: newVessel.name,
              blNumber: bl.blNumber,
              containerNumber: container,
              status: "Planning",
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      // Notify about vessel
      await createNotification(
        "admin",
        isEditing ? "Vessel Updated" : "New Vessel Added",
        `Vessel ${newVessel.name} has been ${isEditing ? 'updated' : 'added'} with ${totalContainers} containers.`,
        "success",
        "Vessel Planning",
      );

      setIsAdding(false);
      setEditingVesselId(null);
      setNewVessel({ status: "Expected", bls: [{ blNumber: "", containers: "" }] });
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, "vessels");
    }
  };

  const handleEditClick = (vessel) => {
    setEditingVesselId(vessel.id);
    setNewVessel({
      name: vessel.name || "",
      arrivalDate: vessel.arrivalDate || "",
      expectedDate: vessel.expectedDate || "",
      clearanceDate: vessel.clearanceDate || "",
      status: vessel.status || "Expected",
      bls: vessel.bls && vessel.bls.length > 0 
        ? vessel.bls.map(bl => ({ blNumber: bl.blNumber, containers: bl.containers.join(', ') }))
        : [{ blNumber: "", containers: "" }]
    });
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
          Vessel Planning & Schedule
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors shadow-lg shadow-orange-600/20"
        >
          + Add Vessel Plan
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border border-zinc-200 p-6 rounded-xl mb-8 shadow-sm">
          <h3 className="text-zinc-900 font-medium mb-4">
            {editingVesselId ? "Edit Vessel Schedule" : "New Vessel Schedule"}
          </h3>
          <form
            onSubmit={handleCreate}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                placeholder="Vessel Name"
                value={newVessel.name || ""}
                onChange={(e) =>
                  setNewVessel({ ...newVessel, name: e.target.value })
                }
                required
              />

              <input
                className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                placeholder="Expected Date"
                type="date"
                value={newVessel.expectedDate || ""}
                onChange={(e) =>
                  setNewVessel({ ...newVessel, expectedDate: e.target.value })
                }
                required
              />

              <input
                className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                placeholder="Arrival Date"
                type="date"
                value={newVessel.arrivalDate || ""}
                onChange={(e) =>
                  setNewVessel({ ...newVessel, arrivalDate: e.target.value })
                }
              />

              <input
                className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                placeholder="Clearance Date"
                type="date"
                value={newVessel.clearanceDate || ""}
                onChange={(e) =>
                  setNewVessel({ ...newVessel, clearanceDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-zinc-900">Bills of Lading (BL) & Containers</h4>
                <button
                  type="button"
                  onClick={() => setNewVessel({...newVessel, bls: [...(newVessel.bls || []), { blNumber: "", containers: "" }]})}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  + Add BL
                </button>
              </div>
              {(newVessel.bls || []).map((bl, index) => (
                <div key={index} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <input
                      className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full max-w-xs"
                      placeholder="BL Number"
                      value={bl.blNumber}
                      onChange={(e) => {
                        const updated = [...newVessel.bls];
                        updated[index].blNumber = e.target.value;
                        setNewVessel({ ...newVessel, bls: updated });
                      }}
                      required
                    />
                    {newVessel.bls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = newVessel.bls.filter((_, i) => i !== index);
                          setNewVessel({ ...newVessel, bls: updated });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <textarea
                    className="bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"
                    placeholder="Container Numbers (comma separated)"
                    rows={2}
                    value={bl.containers}
                    onChange={(e) => {
                      const updated = [...newVessel.bls];
                      updated[index].containers = e.target.value;
                      setNewVessel({ ...newVessel, bls: updated });
                    }}
                    required
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
              >
                {editingVesselId ? "Update Plan" : "Save Plan & Create Shipments"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingVesselId(null);
                  setNewVessel({ status: "Expected", bls: [{ blNumber: "", containers: "" }] });
                }}
                className="px-6 py-2 bg-zinc-100 text-zinc-600 rounded font-medium hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-50">
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Vessel Name
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Expected
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Arrival
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Cleared
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Total Cont.
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Remaining
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {vessels.map((vessel) => {
              const picked = shipments.filter(
                (s) => s.vesselName === vessel.name && s.actualPickupTime,
              ).length;
              const remaining = vessel.totalContainers - picked;
              const isExpanded = expandedVessel === vessel.id;

              return (
                <React.Fragment key={vessel.id}>
                  <tr
                    onClick={() => setExpandedVessel(isExpanded ? null : vessel.id)}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm text-zinc-900 font-medium">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
                        {vessel.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {vessel.expectedDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {vessel.arrivalDate || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {vessel.clearanceDate || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {vessel.totalContainers || 0}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          "font-bold",
                          remaining > 0 ? "text-orange-600" : "text-green-600",
                        )}
                      >
                        {remaining} Left
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                            vessel.status === "Arrived"
                              ? "bg-blue-100 text-blue-700"
                              : vessel.status === "Discharged"
                                ? "bg-green-100 text-green-700"
                                : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {vessel.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(vessel);
                          }}
                          className="text-zinc-400 hover:text-orange-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-zinc-100 bg-zinc-50/30">
                        <div className="px-12 py-4 space-y-4">
                          <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Bills of Lading</h4>
                          {vessel.bls && vessel.bls.length > 0 ? (
                            <div className="space-y-2">
                              {vessel.bls.map((bl, idx) => {
                                const isBlExpanded = expandedBL === bl.blNumber;
                                const blShipments = shipments.filter(s => s.vesselName === vessel.name && s.blNumber === bl.blNumber);
                                return (
                                  <div key={idx} className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                                    <div 
                                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                                      onClick={() => setExpandedBL(isBlExpanded ? null : bl.blNumber)}
                                    >
                                      <div className="flex items-center gap-3">
                                        {isBlExpanded ? <ChevronDown size={14} className="text-zinc-400"/> : <ChevronRight size={14} className="text-zinc-400"/>}
                                        <span className="font-mono text-sm font-bold text-zinc-800">BL: {bl.blNumber}</span>
                                      </div>
                                      <span className="text-xs text-zinc-500 font-medium">{bl.containers?.length || 0} Containers</span>
                                    </div>
                                    {isBlExpanded && (
                                      <div className="border-t border-zinc-100 bg-zinc-50 p-4">
                                        {blShipments.length > 0 ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {blShipments.map(shipment => (
                                              <div key={shipment.id} className="bg-white border border-zinc-200 p-3 rounded-md shadow-sm flex flex-col gap-1">
                                                <div className="flex justify-between items-start">
                                                  <span className="font-bold text-sm text-zinc-900">{shipment.containerNumber}</span>
                                                  <span className="text-[10px] uppercase px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded font-bold">{shipment.status}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-zinc-400">ID: {shipment.trackingId}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-zinc-500 italic">No shipments found for this BL.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 italic">No BLs added to this vessel.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- UI Components ---
const FileUploader = ({
  onUpload,
  label = "Upload File",
  accept = "image/*,application/pdf",
  className = "",
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 800KB for Firestore base64 storage)
    if (file.size > 800 * 1024) {
      alert("File is too large. Please upload a file smaller than 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      onUpload(result, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded text-[10px] font-mono uppercase tracking-tighter text-zinc-600 transition-colors"
      >
        <Paperclip size={12} />
        {label}
      </button>
    </div>
  );
};

function ShipmentsView({
  shipments,
  vessels,
  profile,
  rolePermissions,
  users,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newShipment, setNewShipment] = useState({
    trackingId: `VTL-${Math.floor(Math.random() * 10000)}`,
    status: "Pending",
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newShipment.trackingId) return;
    try {
      await setDoc(doc(db, "shipments", newShipment.trackingId), {
        ...newShipment,
        updatedAt: Timestamp.now(),
      });

      // Notify about new shipment
      await createNotification(
        "admin",
        "New Shipment Created",
        `Shipment ${newShipment.trackingId} has been created.`,
        "success",
        "Shipments",
      );

      setIsAdding(false);
      setNewShipment({
        trackingId: `VTL-${Math.floor(Math.random() * 10000)}`,
        status: "Pending",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "shipments");
    }
  };

  const filteredShipments = shipments.filter((shipment) => {
    if (profile?.role === "warehouse_manager" && profile.warehouseLocation) {
      return shipment.returnWarehouseDetails === profile.warehouseLocation;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
          Shipment Management
        </h2>
        {rolePermissions[profile?.role || "transporter"]?.canCreateShipments && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors shadow-lg shadow-orange-600/20"
          >
            + Create New Shipment
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border border-zinc-200 p-6 rounded-xl mb-8 shadow-sm">
          <h3 className="text-zinc-900 font-medium mb-4">New Shipment</h3>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <input
              className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Tracking ID"
              value={newShipment.trackingId || ""}
              onChange={(e) =>
                setNewShipment({ ...newShipment, trackingId: e.target.value })
              }
              required
            />

            <select
              className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              value={newShipment.companyName || ""}
              onChange={(e) =>
                setNewShipment({ ...newShipment, companyName: e.target.value })
              }
              required
            >
              <option value="">Select Company</option>
              {COMPANIES.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
            <input
              className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Port of Loading"
              value={newShipment.portOfLoading || ""}
              onChange={(e) =>
                setNewShipment({
                  ...newShipment,
                  portOfLoading: e.target.value,
                })
              }
            />

            <select
              className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              value={newShipment.vesselName || ""}
              onChange={(e) => {
                const selectedVessel = vessels.find(
                  (v) => v.name === e.target.value,
                );
                setNewShipment({
                  ...newShipment,
                  vesselName: e.target.value,
                  totalContainersInVessel: selectedVessel?.totalContainers || 0,
                });
              }}
              required
            >
              <option value="">Select Vessel</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <input
              className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Total Containers"
              type="number"
              value={newShipment.totalContainersInVessel || ""}
              onChange={(e) =>
                setNewShipment({
                  ...newShipment,
                  totalContainersInVessel: parseInt(e.target.value),
                })
              }
            />

            <input
              className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Assign Transporter"
              value={newShipment.transporterName || ""}
              onChange={(e) =>
                setNewShipment({
                  ...newShipment,
                  transporterName: e.target.value,
                })
              }
            />

            <div className="flex gap-2 md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 bg-zinc-100 text-zinc-600 rounded font-medium hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredShipments.map((shipment) => (
          <ShipmentRow
            key={shipment.id}
            shipment={shipment}
            profile={profile}
            vessels={vessels}
            rolePermissions={rolePermissions}
            users={users}
          />
        ))}
      </div>
    </div>
  );
}

const PermissionsView = ({ rolePermissions }) => {
  const handlePermissionChange = async (role, section, value) => {
    try {
      const newPermissions = {
        ...rolePermissions,
        [role]: {
          ...rolePermissions[role],
          [section]: value,
        },
      };
      await setDoc(doc(db, "settings", "rolePermissions"), newPermissions);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        "settings/rolePermissions",
      );
    }
  };

  const roles = [
    "admin",
    "sub_admin",
    "dispatcher",
    "clearing_agent",
    "transporter",
    "receiver",
    "warehouse_manager",
  ];
  const sections = [
    "planning",
    "clearing",
    "assignment",
    "transit",
    "unloading",
    "returnLoad",
    "completion",
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
          Role-Based Access Control
        </h2>
        <div className="px-3 py-1 bg-zinc-100 rounded text-[10px] font-mono text-zinc-500 uppercase tracking-widest border border-zinc-200">
          System Permissions
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-50">
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Role
              </th>
              {sections.map((s) => (
                <th
                  key={s}
                  className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center"
                >
                  {s}
                </th>
              ))}
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">
                Create Shipments
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">
                Manage Users
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">
                Manage Vessels
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {roles.map((role) => (
              <tr key={role} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm text-zinc-900 font-medium capitalize">
                    {role.replace("_", " ")}
                  </span>
                </td>
                {sections.map((section) => (
                  <td key={section} className="px-6 py-4 text-center">
                    <select
                      value={rolePermissions[role][section]}
                      onChange={(e) =>
                        handlePermissionChange(role, section, e.target.value)
                      }
                      className="bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900 focus:border-orange-500 outline-none"
                    >
                      <option value="none">None</option>
                      <option value="read">Read</option>
                      <option value="write">Write</option>
                    </select>
                  </td>
                ))}
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={rolePermissions[role].canCreateShipments}
                    onChange={(e) =>
                      handlePermissionChange(
                        role,
                        "canCreateShipments",
                        e.target.checked,
                      )
                    }
                    className="w-4 h-4 rounded border-zinc-300 bg-white text-orange-600 focus:ring-orange-500"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={rolePermissions[role].canManageUsers}
                    onChange={(e) =>
                      handlePermissionChange(
                        role,
                        "canManageUsers",
                        e.target.checked,
                      )
                    }
                    className="w-4 h-4 rounded border-zinc-300 bg-white text-orange-600 focus:ring-orange-500"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={rolePermissions[role].canManageVessels}
                    onChange={(e) =>
                      handlePermissionChange(
                        role,
                        "canManageVessels",
                        e.target.checked,
                      )
                    }
                    className="w-4 h-4 rounded border-zinc-300 bg-white text-orange-600 focus:ring-orange-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-4">
            Permission Levels
          </h3>
          <ul className="space-y-3">
            <li className="flex gap-3 text-xs">
              <span className="text-red-500 font-bold w-12">None:</span>
              <span className="text-zinc-500 text-[11px]">
                Section is completely hidden from the user.
              </span>
            </li>
            <li className="flex gap-3 text-xs">
              <span className="text-blue-500 font-bold w-12">Read:</span>
              <span className="text-zinc-500 text-[11px]">
                User can view the data but cannot make any changes.
              </span>
            </li>
            <li className="flex gap-3 text-xs">
              <span className="text-green-500 font-bold w-12">Write:</span>
              <span className="text-zinc-500 text-[11px]">
                User has full permission to edit and update fields in this
                section.
              </span>
            </li>
          </ul>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-4">
            Security Note
          </h3>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Changes to role permissions are applied instantly across the system.
            Ensure you have at least one role with 'Write' access to critical
            sections to avoid workflow deadlocks. Admins always retain full
            access regardless of these settings.
          </p>
        </div>
      </div>
    </div>
  );
};

const ReportsView = ({ shipments, profile }) => {
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const companies = Array.from(
    new Set(shipments.map((s) => s.companyName).filter(Boolean)),
  );

  const toggleCompany = (company) => {
    setSelectedCompanies((prev) =>
      prev.includes(company)
        ? prev.filter((c) => c !== company)
        : [...prev, company],
    );
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesTransporter =
      profile?.role === "transporter"
        ? s.transporterId === profile.uid
        : transporterFilter === "all" || s.transporterId === transporterFilter;
    const matchesWarehouse =
      profile?.role === "warehouse_manager" && profile.warehouseLocation
        ? s.returnWarehouseDetails === profile.warehouseLocation
        : true;

    const matchesCompany =
      selectedCompanies.length === 0 ||
      (s.companyName && selectedCompanies.includes(s.companyName));
    const shipmentDate = s.updatedAt?.toDate
      ? s.updatedAt.toDate()
      : new Date(s.updatedAt);
    const matchesStartDate = !startDate || shipmentDate >= new Date(startDate);
    const matchesEndDate = !endDate || shipmentDate <= new Date(endDate);

    return (
      matchesTransporter &&
      matchesWarehouse &&
      matchesCompany &&
      matchesStartDate &&
      matchesEndDate
    );
  });

  const totalShipments = filteredShipments.length;
  const completedShipments = filteredShipments.filter(
    (s) => s.status === "Completed",
  ).length;
  const inTransitShipments = filteredShipments.filter(
    (s) => s.status === "In Transit",
  ).length;
  const totalCost = filteredShipments.reduce(
    (acc, s) => acc + (s.totalCost || 0),
    0,
  );

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Logistics Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #18181b; line-height: 1.5; }
            .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { margin: 0; font-size: 24px; font-weight: 600; color: #09090b; }
            .meta { color: #71717a; font-size: 12px; margin-top: 4px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
            .stat-card { border: 1px solid #e4e4e7; padding: 16px; border-radius: 12px; background: #fafafa; }
            .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 4px; font-weight: 600; }
            .stat-value { font-size: 18px; font-weight: 700; color: #18181b; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { text-align: left; padding: 12px 16px; border-bottom: 2px solid #e4e4e7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; font-weight: 600; background: #f4f4f5; }
            td { padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 11px; color: #27272a; }
            .status { font-weight: 700; text-transform: uppercase; font-size: 9px; padding: 2px 6px; border-radius: 4px; }
            .status-completed { background: #dcfce7; color: #166534; }
            .status-transit { background: #dbeafe; color: #1e40af; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .cost { font-family: monospace; font-weight: 600; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              .stat-card { break-inside: avoid; }
              tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Logistics Performance Report</h1>
            <div class="meta">Generated on ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="summary">
            <div class="stat-card">
              <div class="stat-label">Total Shipments</div>
              <div class="stat-value">${totalShipments}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Completed</div>
              <div class="stat-value">${completedShipments}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">In Transit</div>
              <div class="stat-value">${inTransitShipments}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Cost</div>
              <div class="stat-value">PKR ${totalCost.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Tracking ID</th>
                <th>Company</th>
                <th>Transporter</th>
                <th>Vehicle</th>
                <th>Container</th>
                <th>Size/Type</th>
                <th>Status</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${filteredShipments
                .map(
                  (s) => `
                <tr>
                  <td>${s.actualPickupTime || (s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleDateString() : new Date(s.updatedAt).toLocaleDateString())}</td>
                  <td>${s.trackingId}</td>
                  <td>${s.companyName || "N/A"}</td>
                  <td>${s.transporterName || "Unassigned"}</td>
                  <td>${s.vehicleNumber || "N/A"}</td>
                  <td>${s.containerNumber || "N/A"}</td>
                  <td>${s.containerSizeAndType || "N/A"}</td>
                  <td>
                    <span class="status ${s.status === "Completed" ? "status-completed" : s.status === "In Transit" ? "status-transit" : "status-pending"}">
                      ${s.status}
                    </span>
                  </td>
                  <td class="cost">PKR ${(s.totalCost || 0).toLocaleString()}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Tracking ID",
      "Company",
      "Transporter",
      "Vehicle",
      "Container",
      "Size/Type",
      "Status",
      "Cost",
    ];
    const rows = filteredShipments.map((s) => [
      s.actualPickupTime ||
        (s.updatedAt?.toDate
          ? s.updatedAt.toDate().toLocaleDateString()
          : new Date(s.updatedAt).toLocaleDateString()),
      s.trackingId,
      s.companyName || "N/A",
      s.transporterName || "Unassigned",
      s.vehicleNumber || "N/A",
      s.containerNumber || "N/A",
      s.containerSizeAndType || "N/A",
      s.status,
      s.totalCost || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `logistics_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
            Logistics Reports
          </h2>
          <p className="text-zinc-500 text-xs mt-1">
            Performance and financial insights
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
              Companies
            </label>
            <div className="flex flex-wrap gap-2">
              {companies.map((company) => (
                <button
                  key={company}
                  onClick={() => toggleCompany(company)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono uppercase transition-all border",
                    selectedCompanies.includes(company)
                      ? "bg-orange-500/10 border-orange-500 text-orange-600"
                      : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300",
                  )}
                >
                  {company}
                </button>
              ))}
              {selectedCompanies.length > 0 && (
                <button
                  onClick={() => setSelectedCompanies([])}
                  className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-400 hover:text-zinc-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {profile?.role !== "transporter" && (
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                Transporter
              </label>
              <select
                value={transporterFilter}
                onChange={(e) => setTransporterFilter(e.target.value)}
                className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-zinc-900 focus:border-orange-500 outline-none"
              >
                <option value="all">All Transporters</option>
                {Array.from(
                  new Set(
                    shipments.map((s) => s.transporterName).filter(Boolean),
                  ),
                ).map((name) => (
                  <option
                    key={name}
                    value={
                      shipments.find((s) => s.transporterName === name)
                        ?.transporterId
                    }
                  >
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900 focus:border-orange-500 outline-none"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900 focus:border-orange-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded text-xs font-medium hover:bg-zinc-200 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-zinc-900 text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10"
            >
              Print PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            Total Shipments
          </p>
          <p className="text-2xl font-bold text-zinc-900 tracking-tight">
            {totalShipments}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            Completed
          </p>
          <p className="text-2xl font-bold text-green-600 tracking-tight">
            {completedShipments}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            In Transit
          </p>
          <p className="text-2xl font-bold text-blue-600 tracking-tight">
            {inTransitShipments}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            Total Cost
          </p>
          <p className="text-2xl font-bold text-orange-600 tracking-tight">
            PKR {totalCost.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-50">
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Vehicle Entry Date
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Tracking ID
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Company
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Transporter
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Vehicle Detail
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Container Details
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredShipments.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {s.actualPickupTime ||
                    (s.updatedAt?.toDate
                      ? s.updatedAt.toDate().toLocaleDateString()
                      : new Date(s.updatedAt).toLocaleDateString())}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-mono">
                  {s.trackingId}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-700 font-medium">
                  {s.companyName || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {s.transporterName || "Unassigned"}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {s.vehicleNumber || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {s.containerNumber || "N/A"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                      s.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : s.status === "In Transit"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700",
                    )}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-orange-600 font-bold">
                  PKR {(s.totalCost || 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {filteredShipments.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-zinc-400 font-mono text-xs uppercase tracking-widest"
                >
                  No report data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsView = ({ profile }) => {
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile?.uid) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      setMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Settings</h2>
        <p className="text-zinc-500 text-sm">
          Manage your account and preferences
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-900">
            Profile Information
          </h3>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-2xl overflow-hidden border-2 border-zinc-100">
              {photoURL && photoURL.trim() !== "" ? (
                <img
                  src={photoURL}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (
                  profile?.displayName?.[0] ||
                  profile?.email?.[0] ||
                  "?"
                ).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                Profile Photo URL
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            {message && (
              <p
                className={cn(
                  "text-xs font-medium",
                  message.type === "success"
                    ? "text-green-600"
                    : "text-red-600",
                )}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="ml-auto bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-900">
            Account Security
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Role</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                {profile?.role.replace("_", " ")}
              </p>
            </div>
            <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Verified
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersView = ({ users, profile }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingTemp, setIsAddingTemp] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    role: "transporter",
    displayName: "",
    warehouseLocation: "",
  });
  const [newTempData, setNewTempData] = useState({
    username: "",
    password: "",
    role: "transporter",
    displayName: "",
    warehouseLocation: "",
  });
  const [error, setError] = useState("");

  const handleCreateUser = async () => {
    if (!newUserData.email) return;
    if (newUserData.role === "admin" && profile?.role !== "admin") {
      alert("You do not have permission to create an admin.");
      return;
    }
    try {
      // For Google users, we just pre-create the profile
      const dummyUid = `user-${Date.now()}`;
      await setDoc(doc(db, "users", dummyUid), {
        uid: dummyUid,
        email: newUserData.email,
        displayName: newUserData.displayName,
        role: newUserData.role,
        warehouseLocation:
          newUserData.role === "warehouse_manager"
            ? newUserData.warehouseLocation
            : null,
        createdAt: Timestamp.now(),
      });
      setIsAdding(false);
      setNewUserData({
        email: "",
        role: "transporter",
        displayName: "",
        warehouseLocation: "",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "users");
    }
  };

  const handleCreateTempUser = async () => {
    if (!newTempData.username || !newTempData.password) return;
    if (newTempData.role === "admin" && profile?.role !== "admin") {
      alert("You do not have permission to create an admin.");
      return;
    }
    if (newTempData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    try {
      // Use a secondary app instance to create the user without signing out the admin
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      const email = `${newTempData.username}@temp.app`;
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        newTempData.password,
      );
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        username: newTempData.username,
        displayName: newTempData.displayName || newTempData.username,
        role: newTempData.role,
        warehouseLocation:
          newTempData.role === "warehouse_manager"
            ? newTempData.warehouseLocation
            : null,
        isTemporary: true,
        createdAt: Timestamp.now(),
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      setIsAddingTemp(false);
      setNewTempData({
        username: "",
        password: "",
        role: "transporter",
        displayName: "",
        warehouseLocation: "",
      });
      alert(`Temporary user ${newTempData.username} created successfully!`);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email/Password Login is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.",
        );
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Failed to create temporary user");
      }
    }
  };

  const handleDeleteUser = async (uid, role) => {
    if (role === "admin" && profile?.role !== "admin") {
      alert("You do not have permission to remove an admin.");
      return;
    }
    if (window.confirm("Are you sure you want to remove this user?")) {
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, "users");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Personnel Management
          </h2>
          <p className="text-zinc-500 text-sm">
            Manage logistics team roles and access credentials.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsAddingTemp(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
          >
            <Users size={16} /> Create Temp ID
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all shadow-sm"
          >
            <Users size={16} /> Pre-auth Google User
          </button>
        </div>
      </div>

      {isAddingTemp && (
        <div className="bg-white border border-orange-500/30 p-6 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-4 shadow-xl">
          <h3 className="text-zinc-900 font-medium flex items-center gap-2">
            <Clock size={16} className="text-orange-500" /> Create Temporary
            Login Credentials
          </h3>
          {error && (
            <p className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-100">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Username / ID"
              value={newTempData.username}
              onChange={(e) =>
                setNewTempData({ ...newTempData, username: e.target.value })
              }
            />

            <input
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Password"
              type="password"
              value={newTempData.password}
              onChange={(e) =>
                setNewTempData({ ...newTempData, password: e.target.value })
              }
            />

            <input
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Display Name"
              value={newTempData.displayName}
              onChange={(e) =>
                setNewTempData({ ...newTempData, displayName: e.target.value })
              }
            />

            <select
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              value={newTempData.role}
              onChange={(e) =>
                setNewTempData({ ...newTempData, role: e.target.value })
              }
            >
              {profile?.role === "admin" && (
                <option value="admin">Admin</option>
              )}
              <option value="sub_admin">Sub Admin</option>
              <option value="transporter">Transporter</option>
              <option value="clearing_agent">Clearing Agent</option>
              <option value="receiver">Receiver</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
            {newTempData.role === "warehouse_manager" && (
              <select
                className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                value={newTempData.warehouseLocation}
                onChange={(e) =>
                  setNewTempData({
                    ...newTempData,
                    warehouseLocation: e.target.value,
                  })
                }
              >
                <option value="">Select Warehouse</option>
                <option value="Karachi Warehouse">Karachi Warehouse</option>
                <option value="Hyderabad Warehouse">Hyderabad Warehouse</option>
                <option value="Sukkur Warehouse">Sukkur Warehouse</option>
              </select>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsAddingTemp(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTempUser}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 shadow-lg shadow-orange-600/20"
            >
              Create Credentials
            </button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-zinc-900 font-medium">
            Pre-authorize Google User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Email Address"
              value={newUserData.email}
              onChange={(e) =>
                setNewUserData({ ...newUserData, email: e.target.value })
              }
            />

            <input
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              placeholder="Display Name"
              value={newUserData.displayName}
              onChange={(e) =>
                setNewUserData({ ...newUserData, displayName: e.target.value })
              }
            />

            <select
              className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
              value={newUserData.role}
              onChange={(e) =>
                setNewUserData({ ...newUserData, role: e.target.value })
              }
            >
              {profile?.role === "admin" && (
                <option value="admin">Admin</option>
              )}
              <option value="sub_admin">Sub Admin</option>
              <option value="transporter">Transporter</option>
              <option value="clearing_agent">Clearing Agent</option>
              <option value="receiver">Receiver</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
            {newUserData.role === "warehouse_manager" && (
              <select
                className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                value={newUserData.warehouseLocation}
                onChange={(e) =>
                  setNewUserData({
                    ...newUserData,
                    warehouseLocation: e.target.value,
                  })
                }
              >
                <option value="">Select Warehouse</option>
                <option value="Karachi Warehouse">Karachi Warehouse</option>
                <option value="Hyderabad Warehouse">Hyderabad Warehouse</option>
                <option value="Sukkur Warehouse">Sukkur Warehouse</option>
              </select>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 shadow-lg shadow-zinc-900/10"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <div
            key={u.uid}
            className="bg-white border border-zinc-200 p-6 rounded-2xl relative group shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-xl font-bold text-orange-600">
                {u.photoURL && u.photoURL.trim() !== "" ? (
                  <img
                    src={u.photoURL}
                    className="w-full h-full rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (u.displayName?.[0] || u.email[0]).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-zinc-900 font-medium">
                  {u.displayName || "Unnamed User"}
                </h4>
                <p className="text-xs text-zinc-500 font-mono">{u.email}</p>
                {u.username && (
                  <p className="text-[10px] text-orange-600 font-mono mt-1">
                    ID: {u.username}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="px-2 py-1 bg-zinc-100 text-zinc-500 text-[10px] rounded uppercase tracking-widest border border-zinc-200 w-fit">
                  {u.role.replace("_", " ")}
                </span>
                {u.role === "warehouse_manager" && u.warehouseLocation && (
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">
                    {u.warehouseLocation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {u.isTemporary && (
                  <span className="flex items-center gap-1 text-[10px] text-orange-600 font-mono">
                    <Clock size={10} /> TEMP ID
                  </span>
                )}
                <button
                  onClick={() => handleDeleteUser(u.uid, u.role)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove User"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App Content ---
function MainApp() {
  const { user, profile, loading } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_PERMISSIONS);

  // Chat State
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    const promises = unread.map((n) =>
      setDoc(doc(db, "notifications", n.id), { ...n, read: true }),
    );
    await Promise.all(promises);
  };
  // Login State
  const [loginMode, setLoginMode] = useState("google");
  const [tempId, setTempId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (!user || !profile) return;

    const unsubPermissions = onSnapshot(
      doc(db, "settings", "rolePermissions"),
      (snapshot) => {
        if (snapshot.exists()) {
          setRolePermissions(snapshot.data());
        }
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          "settings/rolePermissions",
        ),
    );

    const q =
      profile.role === "admin"
        ? query(
            collection(db, "shipments"),
            orderBy("updatedAt", "desc"),
            limit(50),
          )
        : query(collection(db, "shipments"), orderBy("updatedAt", "desc"));

    const unsubShipments = onSnapshot(
      q,
      (snapshot) => {
        const allShipments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Client-side filtering for roles (since Firestore composite indexes might not be ready)
        if (profile.role === "admin" || profile.role === "dispatcher") {
          setShipments(allShipments);
        } else if (profile.role === "transporter") {
          // STRICT FILTERING: Transporters only see shipments assigned to them
          setShipments(
            allShipments.filter((s) => s.transporterId === profile.uid),
          );
        } else if (profile.role === "clearing_agent") {
          setShipments(
            allShipments.filter(
              (s) => s.clearingAgentId === profile.uid || s.vesselName,
            ),
          );
        } else if (profile.role === "receiver") {
          setShipments(
            allShipments.filter((s) => s.receiverId === profile.uid),
          );
        } else if (profile.role === "warehouse_manager") {
          setShipments(allShipments); // For now, warehouse managers see all
        } else {
          setShipments(allShipments);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "shipments"),
    );

    const unsubVessels = onSnapshot(
      query(collection(db, "vessels"), orderBy("expectedDate", "asc")),
      (snapshot) => {
        setVessels(snapshot.docs.map((doc) => doc.data()));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "vessels"),
    );

    const notifQuery =
      profile.role === "admin"
        ? query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc"),
            limit(20),
          )
        : query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(20),
          );

    const unsubNotifications = onSnapshot(
      notifQuery,
      (snapshot) => {
        setNotifications(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "notifications"),
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => doc.data()));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "users"),
    );

    const unsubChats = onSnapshot(
      query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid),
        orderBy("updatedAt", "desc"),
      ),
      (snapshot) => {
        setChats(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "chats"),
    );

    return () => {
      unsubPermissions();
      unsubShipments();
      unsubVessels();
      unsubNotifications();
      unsubUsers();
      unsubChats();
    };
  }, [user, profile]);

  useEffect(() => {
    if (!activeChat || !user) {
      setChatMessages([]);
      return;
    }

    const unsubMessages = onSnapshot(
      query(
        collection(db, "chats", activeChat.id, "messages"),
        orderBy("createdAt", "asc"),
      ),
      (snapshot) => {
        setChatMessages(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `chats/${activeChat.id}/messages`,
        ),
    );

    return () => unsubMessages();
  }, [activeChat, user]);

  const handleStartChat = async (targetUserId) => {
    if (!user) return;
    // Check if chat already exists
    const existingChat = chats.find(
      (c) =>
        c.participants.includes(user.uid) &&
        c.participants.includes(targetUserId),
    );

    if (existingChat) {
      setActiveChat(existingChat);
      setIsUserListOpen(false);
      setIsChatOpen(true);
      return;
    }

    // Create new chat
    try {
      const chatId = [user.uid, targetUserId].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatData = {
        id: chatId,
        participants: [user.uid, targetUserId],
        updatedAt: Timestamp.now(),
      };
      await setDoc(chatRef, chatData);
      setActiveChat(chatData);
      setIsUserListOpen(false);
      setIsChatOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "chats");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const messageId = doc(
        collection(db, "chats", activeChat.id, "messages"),
      ).id;
      const messageData = {
        id: messageId,
        chatId: activeChat.id,
        senderId: user.uid,
        text: messageText,
        createdAt: Timestamp.now(),
      };

      await setDoc(
        doc(db, "chats", activeChat.id, "messages", messageId),
        messageData,
      );
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: messageText,
        lastMessageAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "messages");
    }
  };

  const handleSeedData = async () => {
    if (profile?.role !== "admin") return;
    try {
      // Seed Shipments
      const sId = `VTL-${Math.floor(Math.random() * 10000)}`;
      await setDoc(doc(db, "shipments", sId), {
        trackingId: sId,
        status: "In Transit",
        vesselName: "Ever Given II",
        containerNumber: "MSCU-1234567",
        containerSizeAndType: "40HC",
        grossWeight: "28,500 KG",
        numberOfPackages: 450,
        commodityDescription: "Premium Quality Black Tea",
        dutyPayDate: "2026-03-28",
        clearanceDate: "2026-03-30",
        customsClearanceStatus: "Cleared",
        clearingAgentId: "agent-001",
        transporterId: "trans-001",
        vehicleDetails: "Truck KAE-9988",
        driverDetails: "John Doe (+92-300-1234567)",
        estimatedLiftingTime: "2026-04-01 10:00",
        estimatedArrivalTime: "2026-04-02 14:00",
        updatedAt: Timestamp.now(),
      });

      // Seed Vessel
      const vId = doc(collection(db, "vessels")).id;
      await setDoc(doc(db, "vessels", vId), {
        id: vId,
        name: "Ever Given II",
        expectedDate: "2026-04-05",
        totalContainers: 150,
        status: "Expected",
        updatedAt: Timestamp.now(),
      });

      alert("Logistics data seeded successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "seed");
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      if (error.code === "auth/operation-not-allowed") {
        setLoginError(
          "Google Login is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.",
        );
      } else {
        setLoginError("Google login failed. Please try again.");
      }
    }
  };

  const handleTempLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!tempId || !tempPassword) return;
    try {
      const email = `${tempId}@temp.app`;
      await signInWithEmailAndPassword(auth, email, tempPassword);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setLoginError(
          "Email/Password Login is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.",
        );
      } else {
        setLoginError("Invalid ID or Password. Please check your credentials.");
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-mono text-xs tracking-widest uppercase">
            Initializing Vital ERP...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 p-8">
        <div className="w-full max-w-md bg-white border border-zinc-200 p-10 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-orange-500/20">
              V
            </div>
            <span className="font-bold text-zinc-900 tracking-tighter text-2xl">
              VITAL ERP
            </span>
          </div>
          <h2 className="text-zinc-900 text-xl font-medium text-center mb-2">
            Welcome Back
          </h2>
          <p className="text-zinc-500 text-center text-sm mb-8">
            Sign in to manage Vital Group logistics operations.
          </p>

          <div className="flex bg-zinc-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setLoginMode("google")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-md transition-all",
                loginMode === "google"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              Google Account
            </button>
            <button
              onClick={() => setLoginMode("temp")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-md transition-all",
                loginMode === "temp"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              Temporary ID
            </button>
          </div>

          {loginError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs text-center animate-in fade-in slide-in-from-top-2">
              {loginError}
            </div>
          )}

          {loginMode === "google" ? (
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-3 rounded-lg font-medium hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/10"
            >
              <LogIn size={20} />
              Sign in with Google
            </button>
          ) : (
            <form onSubmit={handleTempLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono ml-1">
                  User ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your temporary ID"
                  className="w-full bg-white border border-zinc-200 rounded-lg py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-orange-500/50 transition-all"
                  value={tempId}
                  onChange={(e) => setTempId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono ml-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white border border-zinc-200 rounded-lg py-3 px-4 text-sm text-zinc-900 focus:outline-none focus:border-orange-500/50 transition-all"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition-all active:scale-[0.98] mt-2 shadow-lg shadow-orange-600/20"
              >
                Sign In
              </button>
            </form>
          )}

          <p className="mt-8 text-[10px] text-zinc-400 text-center uppercase tracking-widest leading-relaxed">
            Enterprise Logistics Management System
            <br />© 2026 Vital Group of Companies
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-500/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col shadow-sm z-30 md:relative",
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64 md:w-20",
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-zinc-100">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-600/20">
            V
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-zinc-900 tracking-tighter text-lg">
              VITAL GROUP
            </span>
          )}
        </div>

        <nav className="flex-1 mt-4">
          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeTab === "Dashboard"}
            onClick={() => setActiveTab("Dashboard")}
          />

          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={Truck}
            label="Shipments"
            active={activeTab === "Shipments"}
            onClick={() => setActiveTab("Shipments")}
          />

          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={FileText}
            label="Reports"
            active={activeTab === "Reports"}
            onClick={() => setActiveTab("Reports")}
          />

          {(profile?.role === "admin" ||
            profile?.role === "clearing_agent" ||
            rolePermissions[profile?.role || "transporter"]
              .canManageVessels) && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={Package}
              label="Vessel Planning"
              active={activeTab === "Vessels"}
              onClick={() => setActiveTab("Vessels")}
            />
          )}

          {(profile?.role === "admin" ||
            rolePermissions[profile?.role || "transporter"]?.canManageUsers) && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={Users}
              label="User Management"
              active={activeTab === "Users"}
              onClick={() => setActiveTab("Users")}
            />
          )}
          {profile?.role === "admin" && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={ShieldAlert}
              label="Permissions"
              active={activeTab === "Permissions"}
              onClick={() => setActiveTab("Permissions")}
            />
          )}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          {profile?.role === "admin" && (
            <button
              onClick={handleSeedData}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-all border-l-4 border-transparent mb-2"
            >
              <TrendingUp size={16} />
              {isSidebarOpen && <span>Seed Mock Data</span>}
            </button>
          )}
          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={Settings}
            label="Settings"
            active={activeTab === "Settings"}
            onClick={() => setActiveTab("Settings")}
          />
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all border-l-4 border-transparent"
          >
            <LogOut size={18} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-md transition-colors text-zinc-600"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-medium text-zinc-900 italic font-serif tracking-wide">
              {activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search shipments, orders..."
                className="bg-zinc-100 border border-zinc-200 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50 w-64 transition-all text-zinc-900 placeholder:text-zinc-500"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
              >
                <MessageSquare size={20} />
                {chats.some((c) => c.updatedAt > (c.lastMessageAt || 0)) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
              >
                <Bell size={20} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                      Notifications
                    </h3>
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-orange-600 hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-height-[400px] overflow-y-auto divide-y divide-zinc-50">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "p-4 hover:bg-zinc-50 transition-colors cursor-pointer",
                            !n.read && "bg-orange-50/30",
                          )}
                          onClick={async () => {
                            await setDoc(doc(db, "notifications", n.id), {
                              ...n,
                              read: true,
                            });
                            if (n.link) setActiveTab(n.link);
                            setIsNotificationsOpen(false);
                          }}
                        >
                          <div className="flex gap-3">
                            <div
                              className={cn(
                                "w-2 h-2 mt-1 rounded-full shrink-0",
                                n.type === "success"
                                  ? "bg-green-500"
                                  : n.type === "warning"
                                    ? "bg-orange-500"
                                    : n.type === "error"
                                      ? "bg-red-500"
                                      : "bg-blue-500",
                              )}
                            />
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-900">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[9px] text-zinc-400">
                                {n.createdAt?.toDate
                                  ? n.createdAt.toDate().toLocaleString()
                                  : "Just now"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Bell
                          className="mx-auto text-zinc-200 mb-2"
                          size={24}
                        />
                        <p className="text-xs text-zinc-400">
                          No notifications yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-zinc-900">
                  {user.displayName || "User"}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  {profile?.role || "Authorized Personnel"}
                </p>
              </div>
              {user.photoURL && user.photoURL.trim() !== "" ? (
                <img
                  src={user.photoURL}
                  className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                  {(
                    user.displayName?.[0] ||
                    user.email?.[0] ||
                    "?"
                  ).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/50">
          {activeTab === "Dashboard" && (
            <DashboardView
              shipments={shipments}
              vessels={vessels}
              profile={profile}
              setActiveTab={setActiveTab}
              rolePermissions={rolePermissions}
              users={users}
              onStartChat={() => setIsUserListOpen(true)}
            />
          )}
          {activeTab === "Shipments" && (
            <ShipmentsView
              shipments={shipments}
              vessels={vessels}
              profile={profile}
              rolePermissions={rolePermissions}
              users={users}
            />
          )}
          {activeTab === "Vessels" && (
            <VesselPlanningView vessels={vessels} shipments={shipments} />
          )}
          {activeTab === "Users" && <UsersView users={users} profile={profile} />}
          {activeTab === "Permissions" && (
            <PermissionsView rolePermissions={rolePermissions} />
          )}
          {activeTab === "Reports" && (
            <ReportsView shipments={shipments} profile={profile} />
          )}
          {activeTab === "Settings" && <SettingsView profile={profile} />}
        </div>
      </main>

      {/* Chat Overlay */}
      {isChatOpen && activeChat && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-[100dvh] md:h-[500px] bg-white border border-zinc-200 md:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-zinc-100 bg-zinc-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
                {users.find(
                  (u) =>
                    u.uid ===
                    activeChat.participants.find((p) => p !== user?.uid),
                )?.displayName?.[0] || "?"}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {users.find(
                    (u) =>
                      u.uid ===
                      activeChat.participants.find((p) => p !== user?.uid),
                  )?.displayName || "Chat"}
                </p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-tighter">
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveChat(null)}
                className="p-1 hover:bg-zinc-800 rounded-md transition-colors mr-1"
              >
                <Users size={16} />
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.senderId === user?.uid
                    ? "ml-auto items-end"
                    : "mr-auto items-start",
                )}
              >
                <div
                  className={cn(
                    "p-3 rounded-2xl text-sm shadow-sm",
                    msg.senderId === user?.uid
                      ? "bg-orange-600 text-white rounded-tr-none"
                      : "bg-white text-zinc-900 border border-zinc-100 rounded-tl-none",
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 font-mono">
                  {msg.createdAt
                    ?.toDate?.()
                    ?.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || "Sending..."}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-zinc-100 bg-white flex gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-zinc-100 border border-zinc-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
            />

            <button
              type="submit"
              className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Chat List Overlay (when no active chat) */}
      {isChatOpen && !activeChat && (
        <div className="fixed bottom-6 right-6 w-80 h-[400px] bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-zinc-100 bg-zinc-900 text-white flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-widest">
              Recent Chats
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUserListOpen(true)}
                className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <UserPlus size={18} />
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
            {chats.map((chat) => {
              const otherUserId = chat.participants.find(
                (p) => p !== user?.uid,
              );
              const otherUser = users.find((u) => u.uid === otherUserId);
              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className="w-full p-4 hover:bg-zinc-50 transition-colors flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold">
                    {otherUser?.photoURL && otherUser.photoURL.trim() !== "" ? (
                      <img
                        src={otherUser.photoURL}
                        className="w-full h-full rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      (
                        otherUser?.displayName?.[0] ||
                        otherUser?.email?.[0] ||
                        "?"
                      ).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {otherUser?.displayName || "Unknown User"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {chat.updatedAt
                        ?.toDate?.()
                        ?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </p>
                  </div>
                </button>
              );
            })}
            {chats.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-zinc-400 text-xs italic mb-4">
                  No active conversations
                </p>
                <button
                  onClick={() => setIsUserListOpen(true)}
                  className="text-xs text-orange-600 font-medium hover:underline"
                >
                  Start a new chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User List Modal for New Chat */}
      {isUserListOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">
                  Start a Conversation
                </h3>
                <p className="text-zinc-500 text-xs">
                  Select a team member to chat with
                </p>
              </div>
              <button
                onClick={() => setIsUserListOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} className="text-zinc-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {users
                .filter((u) => u.uid !== user?.uid)
                .map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => handleStartChat(u.uid)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-zinc-50 rounded-xl transition-colors border border-transparent hover:border-zinc-100 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                      {u.photoURL && u.photoURL.trim() !== "" ? (
                        <img
                          src={u.photoURL}
                          className="w-full h-full rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        (u.displayName?.[0] || u.email[0]).toUpperCase()
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-zinc-900">
                        {u.displayName || "Unnamed User"}
                      </p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                        {u.role.replace("_", " ")}
                      </p>
                    </div>
                    <UserPlus
                      size={16}
                      className="ml-auto text-zinc-300 group-hover:text-orange-600 transition-colors"
                    />
                  </button>
                ))}
              {users.filter((u) => u.uid !== user?.uid).length === 0 && (
                <p className="text-center text-zinc-400 py-8 text-sm italic">
                  No other team members found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SidebarItem = ({ icon: Icon, label, active, onClick, isSidebarOpen = true }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border-l-4",
      active
        ? "bg-orange-50 text-orange-600 border-orange-600"
        : "text-zinc-500 border-transparent hover:bg-zinc-50 hover:text-zinc-900",
      !isSidebarOpen && "justify-center px-0"
    )}
    title={!isSidebarOpen ? label : undefined}
  >
    <Icon size={18} className="shrink-0" />
    {isSidebarOpen && <span className="truncate">{label}</span>}
  </button>
);

const StatCard = ({ label, value, trend, icon: Icon, color, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm transition-all group",
      onClick &&
        "cursor-pointer hover:shadow-md hover:border-zinc-300 active:scale-[0.98]",
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-lg bg-opacity-10", color)}>
        <Icon size={20} className={color.replace("bg-", "text-")} />
      </div>
      <span
        className={cn(
          "text-xs font-mono font-bold",
          trend.startsWith("+") ? "text-green-600" : "text-zinc-500",
        )}
      >
        {trend}
      </span>
    </div>
    <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
      {label}
    </h3>
    <p className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</p>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
