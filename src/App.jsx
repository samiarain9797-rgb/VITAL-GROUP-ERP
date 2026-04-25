import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
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
  MessageSquareWarning,
  Send,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Printer,
  AlertOctagon,
  Mic,
  Image as ImageIcon,
  File as FileIcon,
  Play,
  Square,
  Download,
  DollarSign,
  FileSpreadsheet,
  History,
  Mail,
  MessageCircle,
  Star,
  Upload,
  Building2,
} from "lucide-react";
import Papa from "papaparse";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Firebase Imports
import { auth, db, storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
} from "firebase/auth";
import { initializeApp, deleteApp, getApp, getApps } from "firebase/app";
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
  getDocs,
  setDoc,
  addDoc,
  Timestamp,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocFromServer,
  arrayUnion,
  deleteField,
} from "firebase/firestore";
import AIAssistant from './components/AIAssistant';
import ComplaintsView from './components/ComplaintsView';
import CostingView from './components/CostingView';
import FreightRatesView from './components/FreightRatesView';
import SearchableSelect from './components/SearchableSelect';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import DocumentGallery from './components/DocumentGallery';
import Earth3DTrucks from './components/Earth3DTrucks';
import InvoicesView from './components/InvoicesView';

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
  accountant: {
    planning: "read",
    clearing: "read",
    assignment: "read",
    transit: "read",
    unloading: "read",
    returnLoad: "read",
    completion: "read",
    costing: "read",
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
            
            if (newProfile.role === "transporter") {
              await addDoc(collection(db, "companies"), {
                name: newProfile.displayName,
                email: newProfile.email,
                address: "",
                ntn: "",
                contactNumber: "",
                logoUrl: newProfile.photoURL || "",
                type: "transporter",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }

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
  companiesData = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState(shipment);
  const [showContainerPopup, setShowContainerPopup] = useState(false);

  const loadedVessel = useMemo(() => {
    if (!editData.vesselName || !editData.arrivalDate) return null;
    return vessels?.find(v => v.name === editData.vesselName && (v.arrivalDate === editData.arrivalDate || v.expectedDate === editData.arrivalDate)) || null;
  }, [editData.vesselName, editData.arrivalDate, vessels]);

  const perms = profile?.role
    ? rolePermissions[profile.role] || DEFAULT_PERMISSIONS[profile.role] || DEFAULT_PERMISSIONS.transporter
    : DEFAULT_PERMISSIONS.admin;

  const isAssignedWarehouse = profile?.role === "warehouse_manager" && shipment.returnWarehouseDetails === profile.warehouseLocation;

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
    shipment.arrivalDate,
    10,
    shipment.actualLiftingTime || shipment.actualPickupTime,
  );
  const detentionDays = calculateDaysRemaining(
    shipment.arrivalDate,
    21,
    shipment.emptyContainerReturnTime,
  );

  const calculateTotalShipmentDays = (liftDateStr, gateInDateStr) => {
    if (!liftDateStr || !gateInDateStr) return null;
    const lift = new Date(liftDateStr);
    const gateIn = new Date(gateInDateStr);
    if (isNaN(lift.getTime()) || isNaN(gateIn.getTime())) return null;
    const diffTime = gateIn.getTime() - lift.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const totalShipmentDays = calculateTotalShipmentDays(shipment.actualPickupTime || shipment.actualLiftingTime, shipment.factoryGateInTime);

  const updateFinancials = (field, value) => {
    const val = parseFloat(value) || 0;
    const newData = { ...editData, [field]: val };

    if (field === 'transportCost' || field === 'actualWeight') {
      const weight = newData.actualWeight || 0;
      if (weight > 32000) {
        const excess = weight - 32000;
        const transport = newData.transportCost || 0;
        newData.excessWeightCost = Math.round((transport / 32000) * excess);
      } else {
        newData.excessWeightCost = 0;
      }
    }

    newData.totalCost = 
      (newData.transportCost || 0) + 
      (newData.excessWeightCost || 0) +
      (newData.returnLoadCost || 0) +
      (newData.clearingCost || 0) + 
      (newData.otherCosts || 0);
    setEditData(newData);
  };

  const handleGenerateInvoice = async (shipment) => {
    try {
      const invoiceId = `INV-${shipment.trackingId}`;
      const invoiceDocData = {
        id: invoiceId,
        type: "single",
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: null,
        customerName: shipment.companyName || "N/A",
        totalAmount: shipment.totalCost || 0,
        shipmentIds: [shipment.id],
        paymentStatus: "Pending",
        payments: [],
        createdAt: serverTimestamp(),
        createdBy: profile?.uid
      };
      
      // Mark as invoiced in Firestore
      await updateDoc(doc(db, "shipments", shipment.id), {
        invoiced: true,
        invoiceId: invoiceId,
        invoiceDate: invoiceDocData.invoiceDate,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, "invoices", invoiceId), invoiceDocData);
      alert("Invoice generated and tracked. You can now manage its payment in the Invoices tab.");
    } catch (err) {
      console.error("Error creating single invoice:", err);
      alert("Failed to track this invoice payment, but attempting print anyway.");
    }

    const content = `
      <html>
        <head>
          <title>Invoice - ${shipment.trackingId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #18181b; line-height: 1.5; background: #fafaf9; }
            .invoice-wrapper { width: 210mm; min-height: 297mm; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-top: 8px solid #ea580c; border-bottom: 8px solid #1e3a8a; box-sizing: border-box; }
            .header { display: flex; justify-content: flex-end; align-items: flex-end; border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 30px; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { margin: 0; font-size: 24px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.1em; }
            .meta-grid { display: grid; grid-template-columns: auto auto; gap: 8px 24px; margin-top: 16px; text-align: right; justify-content: end; }
            .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #c2410c; font-weight: 700; }
            .meta-value { font-size: 12px; font-weight: 700; color: #18181b; }
            
            .addresses { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 30px; }
            .issue-to, .bill-to { flex: 1; padding: 20px; border-radius: 12px; }
            .issue-to { background: #eff6ff; border: 1px solid #e0e7ff; border-left: 4px solid #1e3a8a; }
            .bill-to { background: #fff7ed; border: 1px solid #ffedd5; border-left: 4px solid #ea580c; }
            .issue-to h3, .bill-to h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; font-weight: 700; }
            .issue-to h3 { color: #1e3a8a; }
            .bill-to h3 { color: #c2410c; }
            .issue-to p.title, .bill-to p.title { margin: 2px 0; font-size: 16px; font-weight: 800; }
            .issue-to p.title { color: #1e3a8a; }
            .bill-to p.title { color: #ea580c; }
            .issue-to .details, .bill-to .details { font-size: 12px; color: #52525b; font-weight: 500; margin: 4px 0 0 0; }

            .shipment-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; }
            .info-item { padding: 12px; border-bottom: 1px solid #e0e7ff; background: #eff6ff; border-radius: 8px; break-inside: avoid; }
            .info-label { font-size: 10px; text-transform: uppercase; color: #4f46e5; margin-bottom: 4px; font-weight: 600; }
            .info-value { font-size: 12px; font-weight: 600; color: #1e3a8a; }
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
            th { text-align: left; padding: 12px 16px; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; font-weight: 700; background: #1e3a8a; }
            td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; font-weight: 500; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .amount { text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; }
            .total-row td { font-size: 16px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #1e3a8a, #312e81); border: none; }
            .total-row .amount { color: #ffffff; font-size: 18px; }
            .footer { margin-top: 60px; padding-top: 20px; text-align: center; color: #64748b; font-size: 11px; font-weight: 500; page-break-inside: avoid; clear: both; }
            
            @page { size: A4 portrait; margin: 10mm; }
            @media print {
              body { padding: 0 !important; margin: 0; background: white !important; }
              .invoice-wrapper { width: 100%; box-shadow: none; border-top: 0; border-bottom: 0; padding: 10px; margin: 0; min-height: auto; }
              .no-print { display: none; }
              .total-row td { background: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              th { background: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .issue-to { background: #eff6ff !important; border-left: 4px solid #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .bill-to { background: #fff7ed !important; border-left: 4px solid #ea580c !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .info-item { background: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="header">
              <div class="invoice-details">
                <h2>INVOICE</h2>
                <div class="meta-grid">
                  <div class="meta-label">Invoice Number</div>
                  <div class="meta-value">INV-${shipment.trackingId}</div>
                  <div class="meta-label">Date of Invoice</div>
                  <div class="meta-value">${new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <div class="addresses">
              <div class="issue-to">
                <h3>Issuer</h3>
                <p class="title">Logistics Pro</p>
                <p class="details">123 Shipping Lane, Port City<br/>contact@logisticspro.com | +1 234 567 8900</p>
              </div>
              <div class="bill-to">
                <h3>Bill To</h3>
                <p class="title">${shipment.companyName || "N/A"}</p>
              </div>
            </div>

            <div class="shipment-info">
            <div class="info-item">
              <div class="info-label">Tracking ID</div>
              <div class="info-value">${shipment.trackingId}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Container</div>
              <div class="info-value">${shipment.containerNumber || "N/A"} (${shipment.containerSizeAndType || "N/A"})</div>
            </div>
            <div class="info-item">
              <div class="info-label">Route</div>
              <div class="info-value">${shipment.loadingPoint || "N/A"} → ${shipment.unloadingPoint || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Transporter</div>
              <div class="info-value">${shipment.transporterName || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Vessel / BL Number</div>
              <div class="info-value">${shipment.vesselName || "N/A"} / ${shipment.blNumber || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Delivery Date</div>
              <div class="info-value">${shipment.expectedDeliveryDate || shipment.etaToDestination ? new Date(shipment.expectedDeliveryDate || shipment.etaToDestination).toLocaleDateString() : "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Vehicle & Driver</div>
              <div class="info-value">${shipment.vehicleNumber || "N/A"} / ${shipment.driverName || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Dispatch Time</div>
              <div class="info-value">${shipment.actualPickupTime || shipment.actualLiftingTime || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Gate In / Out</div>
              <div class="info-value">${shipment.factoryGateInTime || "N/A"} / ${shipment.factoryGateOutTime || "N/A"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Empty Container Return</div>
              <div class="info-value">${shipment.emptyContainerReturnTime || "N/A"}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${shipment.transportCost ? `
              <tr>
                <td>Base Transport Cost ${shipment.psoFuelPriceApplied ? `<br/><span style="font-size: 10px; color: #64748b; font-weight: 600;">Applied PSO Rate: ${shipment.psoFuelPriceApplied} PKR ${shipment.psoFuelDateApplied ? `(${shipment.psoFuelDateApplied})` : ''}</span>` : ''}</td>
                <td class="amount">${shipment.transportCost.toLocaleString()}</td>
              </tr>` : ''}
              ${shipment.excessWeightCost ? `
              <tr>
                <td>Excess Weight Charges</td>
                <td class="amount">${shipment.excessWeightCost.toLocaleString()}</td>
              </tr>` : ''}
              ${shipment.clearingCost ? `
              <tr>
                <td>Clearing Charges</td>
                <td class="amount">${shipment.clearingCost.toLocaleString()}</td>
              </tr>` : ''}
              ${shipment.otherCosts ? `
              <tr>
                <td>Other Costs</td>
                <td class="amount">${shipment.otherCosts.toLocaleString()}</td>
              </tr>` : ''}
              <tr class="total-row">
                <td>Total Amount Due</td>
                <td class="amount">${(shipment.totalCost || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Payment is due within 30 days. Please include invoice number on your check.</p>
          </div>
          </div>
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

    const blob = new Blob([content], { type: "text/html" });
    const localUrl = URL.createObjectURL(blob);
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = `Invoice_${shipment.trackingId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSave = async () => {
    // Stage 1: Basic validation for ANY edit matching the user's role permission
    if (perms.planning === "write" && shipment.type !== "local") {
        if (!editData.containerNumber || !editData.containerSizeAndType) {
            alert("Container Number and Container Size & Type are mandatory fields.");
            return;
        }
    }

    // Strict validation blocks based on status progression:
    const statuses = ["Planning", "Customs Cleared", "In Transit", "Delivered", "Return Load", "Completed"];
    const statusIndex = statuses.indexOf(editData.status);

    if (statusIndex >= statuses.indexOf("Customs Cleared") && shipment.type !== "local") {
        if (!editData.grossWeight || !editData.numberOfPackages || !editData.commodityDescription) {
            alert("Gross Weight, Number of Packages, and Commodity Description are mandatory fields from Customs Cleared onwards.");
            return;
        }
    }

    if (statusIndex >= statuses.indexOf("In Transit")) {
        if (!editData.transporterId) {
             alert("Assigned Transporter Company is mandatory to move to In Transit.");
             return;
        }
        if (!editData.vehicleNumber || !editData.vehicleType || !editData.driverName || !editData.driverPhone || !editData.actualPickupTime) {
             alert("Vehicle Number, Vehicle Type, Driver Name, Driver Phone, and Actual Dispatch Time are mandatory once Transit begins.");
             return;
        }
        if (!editData.driverIdCardUrl || !editData.transporterDocs || editData.transporterDocs.length === 0) {
             alert("Driver ID Card and Transporter Documents must be attached.");
             return;
        }
    }

    if (statusIndex >= statuses.indexOf("Delivered")) {
        const unloadingLocation = editData.unloadingLocation || editData.unloadingPoint;
        if (!unloadingLocation || !editData.factoryGateInTime || !editData.factoryGateOutTime || !editData.unloadingDate || !editData.receivingDocUrl) {
            alert("Unloading Location, Gate In/Out Times, Unloading Date, and Receiving Document are mandatory for Delivery/Completion.");
            return;
        }
    }

    if (statusIndex >= statuses.indexOf("Return Load") && shipment.type !== "local") {
       if (!editData.returnWarehouseDetails || !editData.returnLoadDestination || !editData.returnLoadMaterialDetails || !editData.returnLoadQuantity) {
            alert("Return Warehouse, Destination, Materials, and Quantity are mandatory for Return Load.");
            return;
       }
    }

    // Validation for Empty Container Return and Return Load Receipt before Completion
    if (editData.status === "Completed" && shipment.type !== "local") {
      if (!editData.emptyContainerReturnTime) {
        alert("Empty Container Return Date/Time is required to mark the shipment as Completed.");
        return;
      }
      if (!editData.returnLoadReceivedStatus || !editData.returnLoadDocument) {
        alert("Return Load Receipt Status and Document are required by the receiving warehouse to mark the shipment as Completed.");
        return;
      }
    }

    try {
      const updates = { ...editData };
      // If vehicle number is being added for the first time, set actualPickupTime based on actualLiftingTime if provided or current date
      if (
        editData.vehicleNumber &&
        !shipment.vehicleNumber &&
        !shipment.actualPickupTime &&
        !updates.actualPickupTime
      ) {
        updates.actualPickupTime = new Date().toISOString().split("T")[0];
      }

      if (shipment.type === "local" && editData.factoryGateOutTime && !shipment.factoryGateOutTime) {
        updates.status = "Completed";
      }

      const historyEntry = {
        action: "Updated shipment details",
        user: profile?.displayName || profile?.email || "Unknown User",
        role: profile?.role || "Unknown Role",
        timestamp: new Date().toISOString(),
      };

      await setDoc(
        doc(db, "shipments", shipment.id),
        {
          ...updates,
          history: arrayUnion(historyEntry),
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
        
        // Simulate Email Notification
        const transporterUser = users.find(u => u.uid === editData.transporterId);
        if (transporterUser && transporterUser.email) {
          const emailHistoryEntry = {
            action: `Automated Email Sent to ${transporterUser.email}`,
            user: "System",
            role: "system",
            timestamp: new Date().toISOString(),
          };
          await setDoc(
            doc(db, "shipments", shipment.id),
            {
              history: arrayUnion(historyEntry, emailHistoryEntry),
            },
            { merge: true }
          );
          console.log(`[SIMULATED EMAIL] To: ${transporterUser.email} - Subject: New Shipment Assigned (${shipment.trackingId})`);
        }
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
      if (error?.message && error.message.includes("exceeds the maximum allowed size")) {
        const confirmWipe = window.confirm(
          "This shipment is locked securely because it contains an old attachment that exceeded the database size limit.\n\nWould you like the AI system to automatically wipe the oversized files from this document so you can continue working with it?"
        );
        
        if (confirmWipe) {
          try {
            await updateDoc(doc(db, "shipments", shipment.id), {
              localDispatchDocUrl: deleteField(),
              driverIdCardUrl: deleteField(),
              receivingDocUrl: deleteField(),
              emptyContainerEirUrl: deleteField(),
              returnLoadDocument: deleteField(),
              transporterDocs: deleteField(),
              incidentDocs: deleteField(),
              insuranceDocs: deleteField()
            });
            alert("Success! The bloated attachments have been cleared. You can now re-upload them using the newly patched Storage System.");
            // Reload window to clear bloated memory states
            window.location.reload();
          } catch (wipeError) {
             console.error("Failed to wipe:", wipeError);
             alert("Could not clear the bloated files automatically. You may need to delete this shipment and re-create it.");
          }
        }
      } else {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `shipments/${shipment.id}`,
        );
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "shipments", shipment.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shipments/${shipment.id}`);
    }
  };

  return (
    <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] transition-all mb-4">
      <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-mono text-zinc-600 uppercase tracking-wider font-medium">
            {shipment.trackingId}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                shipment.status === "Completed"
                  ? "bg-green-500"
                  : shipment.status === "In Transit"
                    ? "bg-blue-500"
                    : "bg-orange-500",
              )}
            />
            <span className="text-[11px] font-medium text-zinc-700">
              {shipment.status}
            </span>
          </div>
          {shipment.companyName && (
            <span className="text-[10px] text-zinc-500 font-mono uppercase px-2 border-l border-zinc-200">
              {shipment.companyName}
            </span>
          )}
          {shipment.transporterName && (
            <span className="text-[10px] text-orange-600 font-mono uppercase px-2 border-l border-zinc-200 flex items-center gap-1">
              <Truck size={10} /> {shipment.transporterName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex gap-1.5">
            {demurrageDays !== null && (
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border",
                  shipment.actualLiftingTime || shipment.actualPickupTime
                    ? "bg-green-50 border-green-100 text-green-600"
                    : demurrageDays < 3
                      ? "bg-red-50 border-red-100 text-red-600 animate-pulse"
                      : demurrageDays < 5
                        ? "bg-orange-50 border-orange-100 text-orange-600"
                        : "bg-zinc-50 border-zinc-100 text-zinc-500",
                )}
              >
                <Truck size={10} />
                {shipment.actualLiftingTime || shipment.actualPickupTime
                  ? "LIFTED"
                  : `${demurrageDays}D LIFTING`}
              </div>
            )}
            {detentionDays !== null && (
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border",
                  shipment.emptyContainerReturnTime
                    ? "bg-green-50 border-green-100 text-green-600"
                    : detentionDays < 5
                      ? "bg-red-50 border-red-100 text-red-600 animate-pulse"
                      : detentionDays < 10
                        ? "bg-orange-50 border-orange-100 text-orange-600"
                        : "bg-zinc-50 border-zinc-100 text-zinc-500",
                )}
              >
                <Clock size={10} />
                {shipment.emptyContainerReturnTime
                  ? "RETURNED"
                  : `${detentionDays}D RETURN`}
              </div>
            )}
          </div>
          {Object.values(perms).some((v) => v === "write") &&
            (isEditing ? (
              <div className="flex gap-1.5">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2.5 py-1 bg-green-500 border-b-2 border-green-700 text-white rounded-lg hover:bg-green-600 transition-all shadow-[0_2px_0_rgb(21,128,61)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(21,128,61)] active:translate-y-0 active:shadow-[0_0px_0_rgb(21,128,61)] text-[10px] font-bold"
                >
                  <CheckCircle2 size={12} /> Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 border-b-2 border-zinc-300 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-all shadow-[0_2px_0_rgb(212,212,216)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(212,212,216)] active:translate-y-0 active:shadow-[0_0px_0_rgb(212,212,216)] text-[10px] font-bold"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border-b-2 border-orange-200 text-orange-600 rounded-lg hover:bg-orange-100 transition-all shadow-[0_2px_0_rgb(254,215,170)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(254,215,170)] active:translate-y-0 active:shadow-[0_0px_0_rgb(254,215,170)] text-[10px] font-bold"
                >
                  <Settings size={12} /> Update
                </button>
                {profile?.role === "admin" && (
                  showDeleteConfirm ? (
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[10px] text-red-600 font-bold">Sure?</span>
                      <button onClick={handleDelete} className="px-2.5 py-1 bg-red-600 border-b-2 border-red-800 text-white rounded-lg hover:bg-red-700 transition-all shadow-[0_2px_0_rgb(153,27,27)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(153,27,27)] active:translate-y-0 active:shadow-[0_0px_0_rgb(153,27,27)] text-[10px] font-bold">Yes</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-2.5 py-1 bg-zinc-200 border-b-2 border-zinc-400 text-zinc-700 rounded-lg hover:bg-zinc-300 transition-all shadow-[0_2px_0_rgb(161,161,170)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(161,161,170)] active:translate-y-0 active:shadow-[0_0px_0_rgb(161,161,170)] text-[10px] font-bold">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-50 border-b-2 border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all shadow-[0_2px_0_rgb(254,202,202)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(254,202,202)] active:translate-y-0 active:shadow-[0_0px_0_rgb(254,202,202)] text-[10px] font-bold"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )
                )}
                {!shipment.hasIncident && (profile?.role === "transporter" || profile?.role === "admin") && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditData({ ...editData, hasIncident: true, incidentStatus: "Reported" });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-500 border-b-2 border-red-700 text-white rounded-lg hover:bg-red-600 transition-all shadow-[0_2px_0_rgb(185,28,28)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(185,28,28)] active:translate-y-0 active:shadow-[0_0px_0_rgb(185,28,28)] text-[10px] font-bold"
                    title="Report Theft/Incident"
                  >
                    <AlertOctagon size={12} /> Report Incident
                  </button>
                )}
              </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 bg-zinc-50/50 rounded-b-xl border-t border-zinc-200">
        {/* Local Shipment Description */}
        {(perms.planning !== "none" || perms.clearing !== "none") && shipment.type === "local" && (
          <div
            className={cn(
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              (perms.planning === "write" || perms.clearing === "write") ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <LayoutDashboard size={10} /> Local Shipment Description
            </h4>
            {isEditing && (perms.planning === "write" || perms.clearing === "write") ? (
              <div className="space-y-2">
                <div className="bg-zinc-50 p-2 rounded border border-zinc-200 mb-2">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Loading Point</span>
                  <span className="text-xs font-medium text-zinc-900">{editData.loadingPoint || "Not set"}</span>
                </div>
                <textarea
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                  placeholder="Address"
                  rows={2}
                  value={editData.localAddress || ""}
                  onChange={(e) => setEditData({ ...editData, localAddress: e.target.value })}
                />
                <textarea
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                  placeholder="Shipment Details"
                  rows={2}
                  value={editData.localShipmentDetails || ""}
                  onChange={(e) => setEditData({ ...editData, localShipmentDetails: e.target.value })}
                />
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Dispatch Details
                  </label>
                  <FileUploader
                    label={editData.localDispatchDocUrl ? "Document Attached" : "Attach Document"}
                    onUpload={(url) => setEditData({ ...editData, localDispatchDocUrl: url })}
                    accept="image/*,application/pdf"
                  />
                </div>
                <textarea
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                  placeholder="Other Details"
                  rows={2}
                  value={editData.localOtherDetails || ""}
                  onChange={(e) => setEditData({ ...editData, localOtherDetails: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500">
                  <span className="font-medium text-zinc-700">Loading Point:</span> {shipment.loadingPoint || "N/A"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  <span className="font-medium text-zinc-700">Address:</span> {shipment.localAddress || "N/A"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  <span className="font-medium text-zinc-700">Details:</span> {shipment.localShipmentDetails || "N/A"}
                </p>
                {shipment.localDispatchDocUrl && (
                  <a href={shipment.localDispatchDocUrl} target="_blank" className="text-[10px] text-blue-600 underline">
                    View Dispatch Document
                  </a>
                )}
                <p className="text-[10px] text-zinc-500">
                  <span className="font-medium text-zinc-700">Other:</span> {shipment.localOtherDetails || "N/A"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stage 1: Planning */}
        {perms.planning !== "none" && shipment.type !== "local" && (
          <div
            className={cn(
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              perms.planning === "write" ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <LayoutDashboard size={10} /> Planning
            </h4>
            {isEditing && perms.planning === "write" ? (
              <div className="space-y-2">
                {shipment.type !== "local" && (
                  <div className="flex flex-col gap-2">
                    <select
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                      value={editData.vesselName || ""}
                      onChange={(e) => {
                        setEditData({
                          ...editData,
                          vesselName: e.target.value,
                        });
                      }}
                    >
                      <option value="">Select Vessel</option>
                      {[...new Set(vessels.map(v => v.name))].map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
                        type="date"
                        value={editData.arrivalDate || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            arrivalDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-2">
                  <select
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                    value={editData.companyName || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        companyName: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Company</option>
                    {companiesData?.filter(c => c.type !== 'transporter').map((company) => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {shipment.type !== "local" && (
                  <div className="grid grid-cols-1 gap-2">
                    {loadedVessel ? (
                      <select
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                        value={editData.blNumber || ""}
                        onChange={(e) => {
                          setEditData({ ...editData, blNumber: e.target.value, containerNumber: "", containerSizeAndType: "", grossWeight: "" });
                          if (e.target.value) {
                            setShowContainerPopup(true);
                          }
                        }}
                      >
                        <option value="">Select BL Number</option>
                        {loadedVessel.bls?.map(bl => (
                          <option key={bl.blNumber} value={bl.blNumber}>{bl.blNumber}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                        placeholder="BL Number"
                        value={editData.blNumber || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, blNumber: e.target.value })
                        }
                      />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <SearchableSelect
                    options={locationOptions}
                    value={editData.loadingPoint || ""}
                    onChange={(val) => setEditData({ ...editData, loadingPoint: val })}
                    placeholder="Loading Point"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium truncate">
                  {shipment.type === "local" ? "Local Shipment" : (shipment.vesselName || "No Vessel")}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  Company: {shipment.companyName || "N/A"}
                </p>
                {shipment.type !== "local" && (
                  <>
                    <p className="text-[10px] text-zinc-500 truncate">
                      Arrival: {shipment.arrivalDate || "TBD"}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      BL: {shipment.blNumber || "N/A"}
                    </p>
                  </>
                )}
                <p className="text-[10px] text-zinc-500 truncate">
                  Loading: {shipment.loadingPoint || "N/A"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stage 2: Clearing */}
        {perms.clearing !== "none" && shipment.type !== "local" && (
          <div
            className={cn(
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              perms.clearing === "write" ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <ShieldAlert size={10} className="text-orange-500" /> Clearing
            </h4>
            {isEditing && perms.clearing === "write" ? (
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  {editData.vesselName && editData.arrivalDate && editData.blNumber && (
                    <button
                      type="button"
                      onClick={() => setShowContainerPopup(true)}
                      className="w-full px-3 py-1.5 bg-orange-100 border-b-2 border-orange-300 text-orange-700 text-xs rounded-lg hover:bg-orange-200 whitespace-nowrap transition-all shadow-[0_2px_0_rgb(253,186,116)] hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(253,186,116)] active:translate-y-0 active:shadow-[0_0px_0_rgb(253,186,116)] font-bold"
                    >
                      Select Container
                    </button>
                  )}
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                    placeholder="Container # *"
                    value={editData.containerNumber || ""}
                    onChange={(e) => {
                      const newContainerNumber = e.target.value;
                      let newSize = editData.containerSizeAndType;
                      let newWeight = editData.grossWeight;
                      
                      if (editData.vesselName && editData.arrivalDate && editData.blNumber) {
                        const vessel = loadedVessel || vessels?.find(v => v.name === editData.vesselName && (v.arrivalDate === editData.arrivalDate || v.expectedDate === editData.arrivalDate));
                        if (vessel) {
                          const bl = vessel.bls?.find(b => b.blNumber === editData.blNumber);
                          if (bl) {
                            const container = bl.containers?.find(c => c.containerNumber === newContainerNumber);
                            if (container) {
                              newSize = container.size;
                              newWeight = container.weight;
                            }
                          }
                        }
                      }
                      
                      setEditData({
                        ...editData,
                        containerNumber: newContainerNumber,
                        containerSizeAndType: newSize,
                        grossWeight: newWeight,
                      });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                    value={editData.containerSizeAndType || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        containerSizeAndType: e.target.value,
                      })
                    }
                  >
                    <option value="">Size & Type *</option>
                    <option value="20FT">20FT</option>
                    <option value="40FT">40FT</option>
                    <option value="40HC">40HC</option>
                  </select>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                    placeholder="Gross Weight *"
                    value={editData.grossWeight || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, grossWeight: e.target.value })
                    }
                  />
                </div>

                <input
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                  placeholder="No. of Packages *"
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
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-900"
                  placeholder="Commodity Description *"
                  rows={2}
                  value={editData.commodityDescription || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      commodityDescription: e.target.value,
                    })
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                      Duty Pay Date
                    </label>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
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
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
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
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              perms.assignment === "write" ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Users size={10} className="text-yellow-600" /> Assignment
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
                  <option value="">Assign Transporter *</option>
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
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              perms.transit === "write" ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Truck size={10} className="text-blue-600" /> Transit
            </h4>

            {isEditing && perms.transit === "write" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <input
                    className="bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
                    placeholder="Vehicle # *"
                    value={editData.vehicleNumber || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        vehicleNumber: e.target.value,
                      })
                    }
                  />

                  <select
                    className="bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
                    value={editData.vehicleType || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, vehicleType: e.target.value })
                    }
                  >
                    <option value="">Vehicle Type *</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Container Carrier">Container Carrier</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <input
                    className="bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
                    placeholder="Driver Name *"
                    value={editData.driverName || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, driverName: e.target.value })
                    }
                  />

                  <input
                    className="bg-white border border-zinc-200 rounded px-2 py-1.5 text-[10px] text-zinc-900"
                    placeholder="Driver Phone *"
                    value={editData.driverPhone || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, driverPhone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    ID Card & Docs <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <FileUploader
                      label={
                        editData.driverIdCardUrl
                          ? "ID Attached"
                          : "Attach ID Card *"
                      }
                      onUpload={(url) =>
                        setEditData({ ...editData, driverIdCardUrl: url })
                      }
                      className="flex-1"
                      accept="image/*,application/pdf"
                    />

                    <FileUploader
                      label="Add Document *"
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                      {shipment.type === "local" ? "Loading Date and Time" : "Actual Lifting Time"}
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
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                      {shipment.type === "local" ? "Actual Dispatch Time *" : "Actual Dispatch Time *"}
                    </label>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      type="date"
                      value={editData.actualPickupTime || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          actualPickupTime: e.target.value,
                        })
                      }
                    />
                  </div>
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
                  <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-tighter">
                    {shipment.type === "local" ? "Loaded" : "Lifted"}: {shipment.actualLiftingTime}
                  </p>
                )}
                
                {shipment.actualPickupTime && (
                  <p className="text-[10px] text-green-600 font-mono uppercase tracking-tighter">
                    Dispatched: {shipment.actualPickupTime}
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
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              perms.unloading === "write" ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <CheckCircle2 size={10} className="text-green-600" /> {shipment.type === "local" ? "Receiver" : "Unloading"}
            </h4>
            {isEditing && perms.unloading === "write" ? (
              !(shipment.actualLiftingTime || shipment.actualPickupTime) ? (
                <div className="text-[10px] text-red-500 italic p-2 bg-red-50 rounded border border-red-100">
                  {shipment.type === "local" ? "Waiting for Transporter to load the shipment before unloading details can be entered." : "Waiting for Transporter to lift the container before unloading details can be entered."}
                </div>
              ) : (
              <div className="space-y-2">
                <input
                  className="w-full bg-white border border-zinc-200 rounded px-1 py-1 text-[9px] text-zinc-900"
                  placeholder="Location *"
                  value={editData.unloadingLocation || editData.unloadingPoint || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      unloadingLocation: e.target.value,
                    })
                  }
                />

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-400 font-mono">
                    Factory Gate In *
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
                    Unloading Date *
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
                    Factory Gate Out *
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
                    Receiving Document *
                  </label>
                  <FileUploader
                    label={
                      editData.receivingDocUrl
                        ? "Document Attached"
                        : "Attach Receiving Doc *"
                    }
                    onUpload={(url) =>
                      setEditData({ ...editData, receivingDocUrl: url })
                    }
                    accept="image/*,application/pdf"
                  />
                </div>
              </div>
              )
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium">
                  {shipment.factoryGateOutTime ? "Completed" : "Pending"}
                </p>
                <div className="flex flex-col text-[9px] text-zinc-400">
                  {(shipment.unloadingLocation || shipment.unloadingPoint) && (
                    <span>Location: {shipment.unloadingLocation || shipment.unloadingPoint}</span>
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
        {(perms.returnLoad !== "none" || isAssignedWarehouse) && shipment.type !== "local" && (
          <div
            className={cn(
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              (perms.returnLoad === "write" || isAssignedWarehouse) ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Clock size={10} className="text-purple-600" /> Return Load
            </h4>
            {isEditing && (perms.returnLoad === "write" || isAssignedWarehouse) ? (
              <div className="space-y-2">
                {perms.returnLoad === "write" ? (
                  <>
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
                      <option value="">Select Warehouse *</option>
                      <option value="Karachi Warehouse">Karachi Warehouse</option>
                      <option value="Hyderabad Warehouse">
                        Hyderabad Warehouse
                      </option>
                      <option value="Sukkur Warehouse">Sukkur Warehouse</option>
                    </select>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      placeholder="Destination *"
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
                      placeholder="Materials (Cartons etc) *"
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
                      placeholder="Quantity *"
                      value={editData.returnLoadQuantity || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          returnLoadQuantity: e.target.value,
                        })
                      }
                    />
                  </>
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

                {/* Receiving Details (editable by both admin and assigned warehouse) */}
                {(isAssignedWarehouse || profile?.role === "admin" || profile?.role === "sub_admin" || profile?.role === "dispatcher") && (
                  <div className="pt-2 mt-2 border-t border-purple-100 space-y-2">
                    <h5 className="text-[9px] font-mono uppercase tracking-wider text-purple-600">Receiving Details</h5>
                    <select
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      value={editData.returnLoadReceivedStatus || ""}
                      onChange={(e) => setEditData({ ...editData, returnLoadReceivedStatus: e.target.value })}
                    >
                      <option value="">Select Status * (Req. for Complete)</option>
                      <option value="Received">Received</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-mono">
                      Received Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      value={editData.returnLoadReceivedDate || ""}
                      onChange={(e) => setEditData({ ...editData, returnLoadReceivedDate: e.target.value })}
                    />
                    <FileUploader
                      label={editData.returnLoadDocumentName || "Attach Document * (Req. for Complete)"}
                      onUpload={(base64, name) => setEditData({ ...editData, returnLoadDocument: base64, returnLoadDocumentName: name })}
                    />
                  </div>
                )}
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
                {/* Display Receiving Details if they exist */}
                {shipment.returnLoadReceivedStatus && (
                  <div className="pt-2 mt-2 border-t border-purple-100/50 space-y-1">
                    <p className="text-[10px] text-zinc-700">Status: <span className="font-medium">{shipment.returnLoadReceivedStatus}</span></p>
                    {shipment.returnLoadReceivedDate && <p className="text-[10px] text-zinc-500">Date: {shipment.returnLoadReceivedDate}</p>}
                    {shipment.returnLoadDocument && (
                      <a href={shipment.returnLoadDocument} target="_blank" className="text-[10px] text-purple-600 underline">View Document</a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stage 7: Financials */}
        {(profile?.role === "admin" || profile?.role === "sub_admin") && (
          <div className={cn("p-4 space-y-3 bg-orange-50 border-2 border-orange-200 rounded-xl shadow-[0_4px_0_rgb(254,215,170)]")}>
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <TrendingUp size={10} className="text-orange-500" /> Financials
            </h4>
            {isEditing ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[8px] text-zinc-500 uppercase font-mono">
                      Transport
                    </label>
                    <button 
                      onClick={async () => {
                        try {
                          if (!editData.transporterName || !editData.loadingPoint || !editData.unloadingPoint) {
                            alert("Please assign a transporter, loading point, and unloading point first.");
                            return;
                          }
                          
                          // 1. Get active fuel price
                          const fuelSnapshot = await getDocs(query(collection(db, 'fuel_prices'), orderBy('effectiveDate', 'desc')));
                          const fuelPrices = fuelSnapshot.docs.map(d => d.data());
                          
                          // Use shipment creation date or today
                          const currentDate = shipment.createdAt ? new Date(shipment.createdAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                          const activeFuel = fuelPrices.find(f => f.effectiveDate <= currentDate) || fuelPrices[fuelPrices.length - 1];
                          
                          if (!activeFuel) {
                            alert("No fuel prices found in the system.");
                            return;
                          }

                          // 2. Get rate sheet
                          const ratesSnapshot = await getDocs(query(
                            collection(db, 'transporter_rates'),
                            where('transporterName', '==', editData.transporterName),
                            where('origin', '==', editData.loadingPoint),
                            where('destination', '==', editData.unloadingPoint)
                          ));
                          
                          if (ratesSnapshot.empty) {
                            alert(`No rate sheet found for ${editData.transporterName} from ${editData.loadingPoint} to ${editData.unloadingPoint}.`);
                            return;
                          }
                          
                          const rateSheet = ratesSnapshot.docs[0].data();
                          
                          // 3. Find slab
                          const slab = rateSheet.slabs.find(s => activeFuel.price >= s.minFuel && activeFuel.price <= s.maxFuel);
                          
                          if (slab) {
                            // Update financials AND store PSO price metadata
                            setEditData(prev => {
                              const val = parseFloat(slab.freightRate) || 0;
                              const newData = { 
                                ...prev, 
                                transportCost: val,
                                psoFuelPriceApplied: activeFuel.price,
                                psoFuelDateApplied: activeFuel.effectiveDate
                              };

                              const weight = newData.actualWeight || 0;
                              if (weight > 32000) {
                                const excess = weight - 32000;
                                newData.excessWeightCost = Math.round((val / 32000) * excess);
                              } else {
                                newData.excessWeightCost = 0;
                              }

                              newData.totalCost = 
                                (newData.transportCost || 0) + 
                                (newData.excessWeightCost || 0) +
                                (newData.returnLoadCost || 0) +
                                (newData.clearingCost || 0) + 
                                (newData.otherCosts || 0);

                              return newData;
                            });
                            alert(`Auto-calculated transport cost: PKR ${slab.freightRate.toLocaleString()} (PSO Price: ${activeFuel.price} on ${activeFuel.effectiveDate})`);
                          } else {
                            alert(`No matching slab found for PSO price ${activeFuel.price} in the rate sheet.`);
                          }
                        } catch (error) {
                          console.error("Error auto-calculating freight:", error);
                          alert("Failed to auto-calculate freight.");
                        }
                      }}
                      className="text-[8px] text-blue-600 hover:text-blue-800 underline font-mono"
                    >
                      Auto-Calc (PSO Rates)
                    </button>
                  </div>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="number"
                    value={editData.transportCost || 0}
                    onChange={(e) => updateFinancials('transportCost', e.target.value)}
                  />
                </div>
                {shipment.type !== "local" && (
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-mono">
                      Actual Weight (KG)
                    </label>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      type="number"
                      placeholder="Enter weight in KG"
                      value={editData.actualWeight || ""}
                      onChange={(e) => updateFinancials('actualWeight', e.target.value)}
                    />
                    {editData.actualWeight > 32000 && (
                      <p className="text-[9px] text-orange-600 font-mono mt-1">
                        Excess Cost: PKR {(editData.excessWeightCost || 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                {shipment.type !== "local" && (
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-mono">
                      Return Load Cost
                    </label>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      type="number"
                      value={editData.returnLoadCost || 0}
                      onChange={(e) => updateFinancials('returnLoadCost', e.target.value)}
                    />
                  </div>
                )}
                {shipment.type !== "local" && (
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-mono">
                      Clearing
                    </label>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                      type="number"
                      value={editData.clearingCost || 0}
                      onChange={(e) => updateFinancials('clearingCost', e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[8px] text-zinc-500 uppercase font-mono">
                    Other Costs
                  </label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    type="number"
                    value={editData.otherCosts || 0}
                    onChange={(e) => updateFinancials('otherCosts', e.target.value)}
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
                {shipment.type !== "local" && shipment.actualWeight && (
                  <div className="flex justify-between text-[9px]">
                    <span className="text-zinc-500">Actual Weight:</span>
                    <span className="text-zinc-300 font-mono">
                      {shipment.actualWeight.toLocaleString()} KG
                    </span>
                  </div>
                )}
                {shipment.type !== "local" && shipment.excessWeightCost > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span className="text-zinc-500">Excess Weight:</span>
                    <span className="text-zinc-300 font-mono">
                      PKR {(shipment.excessWeightCost || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                {shipment.type !== "local" && shipment.returnLoadCost > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span className="text-zinc-500">Return Load:</span>
                    <span className="text-zinc-300 font-mono">
                      PKR {(shipment.returnLoadCost || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                {shipment.type !== "local" && (
                  <div className="flex justify-between text-[9px]">
                    <span className="text-zinc-500">Clearing:</span>
                    <span className="text-zinc-300 font-mono">
                      PKR {(shipment.clearingCost || 0).toLocaleString()}
                    </span>
                  </div>
                )}
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
              "p-4 space-y-3 bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]",
              perms.completion === "write" ? "" : "opacity-50",
            )}
          >
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <CheckCircle2 size={10} className="text-zinc-400" /> Completion
            </h4>
            {isEditing && perms.completion === "write" ? (
              <div className="space-y-2">
                {shipment.type !== "local" && (
                  <div className="space-y-2 border-b border-zinc-100 pb-2 mb-2">
                    <h5 className="text-[9px] font-mono uppercase tracking-wider text-zinc-600">Empty Container Return</h5>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-mono flex flex-wrap items-center gap-1">
                        Return Date & Time
                        <span className="text-red-500">* (Req. for Complete)</span>
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
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-mono flex items-center gap-1">
                        EIR Document
                      </label>
                      <FileUploader
                        label={
                          editData.emptyContainerEirUrl
                            ? "EIR Attached"
                            : "Attach EIR PDF/Image"
                        }
                        onUpload={(url) =>
                          setEditData({ ...editData, emptyContainerEirUrl: url })
                        }
                        accept="image/*,application/pdf"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-mono">
                    Final Status
                  </label>
                  <select
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] text-zinc-900"
                    value={editData.status}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option value="Planning">Planning</option>
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-zinc-900 font-medium">
                  {shipment.status === "Completed" ? "Finished" : "In Progress"}
                </p>
                {shipment.type !== "local" && (shipment.emptyContainerReturnTime || shipment.emptyContainerEirUrl) && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1">
                    <h5 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Empty Container Return</h5>
                    {shipment.emptyContainerReturnTime && (
                      <p className="text-[10px] text-zinc-600">
                        Date: <span className="font-medium">{new Date(shipment.emptyContainerReturnTime).toLocaleString()}</span>
                      </p>
                    )}
                    {shipment.emptyContainerEirUrl && (
                      <a
                        href={shipment.emptyContainerEirUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 underline"
                      >
                        View EIR Document
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            {shipment.status === "Completed" && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <button
                  onClick={() => handleGenerateInvoice(shipment)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-colors"
                >
                  <FileText size={12} /> Generate Final Invoice
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Incident & Insurance Details */}
      {editData.hasIncident && (
        <div className="p-4 bg-red-50/30 border-t border-red-100">
          <h4 className="text-xs font-bold text-red-800 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertOctagon size={14} /> Theft & Incident Details
          </h4>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transporter Section */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-red-700 uppercase border-b border-red-100 pb-1">Incident Report (Transporter)</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-600">Incident Type</label>
                    <select
                      className="w-full bg-white border border-red-200 rounded px-2 py-1.5 text-xs"
                      value={editData.incidentType || ""}
                      onChange={e => setEditData({...editData, incidentType: e.target.value})}
                    >
                      <option value="">Select Type</option>
                      <option value="Theft">Theft</option>
                      <option value="Robbery Attempt">Robbery Attempt</option>
                      <option value="Accident">Accident</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-600">Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-white border border-red-200 rounded px-2 py-1.5 text-xs"
                      value={editData.incidentDate || ""}
                      onChange={e => setEditData({...editData, incidentDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-600">Location</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-red-200 rounded px-2 py-1.5 text-xs"
                    value={editData.incidentLocation || ""}
                    onChange={e => setEditData({...editData, incidentLocation: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-600">Description</label>
                  <textarea
                    className="w-full bg-white border border-red-200 rounded px-2 py-1.5 text-xs"
                    rows={2}
                    value={editData.incidentDescription || ""}
                    onChange={e => setEditData({...editData, incidentDescription: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-600">Documents (FIR, Photos)</label>
                  <FileUploader
                    label="Upload Evidence"
                    onUpload={(url, name) => {
                      setEditData({
                        ...editData,
                        incidentDocs: [...(editData.incidentDocs || []), { url, name }]
                      });
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editData.incidentDocs || []).map((doc, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white border border-red-200 rounded text-[10px] text-red-600">
                        <FileText size={10} /> {doc.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin / Insurance Section */}
              {(profile?.role === "admin" || profile?.role === "sub_admin") && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-blue-700 uppercase border-b border-blue-100 pb-1">Insurance & Resolution (Admin)</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-600">Insurance Status</label>
                      <select
                        className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs"
                        value={editData.insuranceStatus || ""}
                        onChange={e => setEditData({...editData, insuranceStatus: e.target.value})}
                      >
                        <option value="">Select Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Claim Filed">Claim Filed</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Settled">Settled</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-600">Claim Number</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs"
                        value={editData.insuranceClaimNumber || ""}
                        onChange={e => setEditData({...editData, insuranceClaimNumber: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-600">Claim Amount</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs"
                        value={editData.insuranceClaimAmount || ""}
                        onChange={e => setEditData({...editData, insuranceClaimAmount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-600">Settlement Amount</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs"
                        value={editData.insuranceSettlementAmount || ""}
                        onChange={e => setEditData({...editData, insuranceSettlementAmount: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-600">Insurance Documents</label>
                    <FileUploader
                      label="Upload Insurance Doc"
                      onUpload={(url, name) => {
                        setEditData({
                          ...editData,
                          insuranceDocs: [...(editData.insuranceDocs || []), { url, name }]
                        });
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(editData.insuranceDocs || []).map((doc, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-[10px] text-blue-600">
                          <FileText size={10} /> {doc.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Transporter Info */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-red-700 uppercase border-b border-red-100 pb-1">Incident Report</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Type</span>
                    <span className="font-medium">{shipment.incidentType || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Date</span>
                    <span className="font-medium">{shipment.incidentDate ? new Date(shipment.incidentDate).toLocaleString() : "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block text-[10px]">Location</span>
                    <span className="font-medium">{shipment.incidentLocation || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block text-[10px]">Description</span>
                    <p className="text-zinc-700 mt-0.5">{shipment.incidentDescription || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block text-[10px] mb-1">Evidence Documents</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(shipment.incidentDocs || []).map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white border border-red-200 rounded text-[10px] text-red-600 hover:bg-red-50">
                          <FileText size={10} /> {doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Insurance Info */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-blue-700 uppercase border-b border-blue-100 pb-1">Insurance & Resolution</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Status</span>
                    <span className="font-medium">{shipment.insuranceStatus || "Pending"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Claim Number</span>
                    <span className="font-medium">{shipment.insuranceClaimNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Claim Amount</span>
                    <span className="font-medium">{shipment.insuranceClaimAmount ? `PKR ${shipment.insuranceClaimAmount}` : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Settlement Amount</span>
                    <span className="font-medium">{shipment.insuranceSettlementAmount ? `PKR ${shipment.insuranceSettlementAmount}` : "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 block text-[10px] mb-1">Insurance Documents</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(shipment.insuranceDocs || []).map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-[10px] text-blue-600 hover:bg-blue-50">
                          <FileText size={10} /> {doc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance & SLA Tracking Table */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {shipment.type === "local" ? (
              <>
                <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={10} /> Total Shipment Day
                </h4>
                <div className="bg-white p-3 rounded border border-zinc-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-zinc-600">Loading Date to Receiver Gate In</span>
                    <span className="text-lg font-bold text-orange-600">
                      {totalShipmentDays !== null ? `${totalShipmentDays} Days` : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
                    <span>Dispatch: {shipment.actualPickupTime || shipment.actualLiftingTime || "N/A"}</span>
                    <span>Gate In: {shipment.factoryGateInTime || "N/A"}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={10} /> Compliance & SLA Tracking
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
              </>
            )}
          </div>

          <div>
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Paperclip size={10} /> Shipment Documents
            </h4>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(shipment.transporterDocs || []).map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded text-[9px] text-zinc-600 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <FileText size={10} /> {doc.name}
                  </a>
                ))}
                {shipment.driverIdCardUrl && (
                  <a
                    href={shipment.driverIdCardUrl}
                    target="_blank"
                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded text-[9px] text-zinc-600 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <ShieldAlert size={10} /> DRIVER ID
                  </a>
                )}
                {shipment.receivingDocUrl && (
                  <a
                    href={shipment.receivingDocUrl}
                    target="_blank"
                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded text-[9px] text-zinc-600 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                  >
                    <CheckCircle2 size={10} /> RECEIVING DOC
                  </a>
                )}
              </div>
              {isEditing && (
                <div className="p-3 bg-white border border-dashed border-zinc-200 rounded-lg">
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1.5">
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
          <div className="col-span-1 lg:col-span-2 mt-4">
            <h4 className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <History size={10} /> History & Audit Log
            </h4>
            <div className="bg-white border border-zinc-200 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-3">
              {shipment.history && shipment.history.length > 0 ? (
                shipment.history.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5"></div>
                      {idx !== shipment.history.length - 1 && <div className="w-px h-full bg-zinc-200 my-1"></div>}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-zinc-900 font-medium">{entry.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-zinc-500">{entry.user} ({entry.role})</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-zinc-400 font-mono text-[9px]">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-400 italic text-center py-4">No history recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container Selection Popup */}
      {showContainerPopup && loadedVessel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-lg w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Select Container for BL: {editData.blNumber}</h3>
              <button onClick={() => setShowContainerPopup(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {loadedVessel.bls?.find(bl => bl.blNumber === editData.blNumber)?.containers?.map((c, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setEditData({
                        ...editData,
                        containerNumber: c.containerNumber,
                        containerSizeAndType: c.size,
                        grossWeight: c.weight
                      });
                      setShowContainerPopup(false);
                    }}
                    className="p-3 bg-white border-2 border-zinc-200 rounded-xl hover:border-orange-500 cursor-pointer hover:bg-orange-50 transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(249,115,22)] active:translate-y-0 active:shadow-[0_0px_0_rgb(249,115,22)]"
                  >
                    <div className="font-bold text-sm text-zinc-900">{c.containerNumber}</div>
                    <div className="text-xs text-zinc-500 mt-1">Size: {c.size || "N/A"} | Weight: {c.weight || "N/A"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
  companiesData,
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

  const generateSparkline = (base, volatility) => {
    return Array.from({ length: 7 }, (_, i) => ({ value: base + Math.random() * volatility - (volatility/2) }));
  };

  const stats = [
    {
      label: "Active Shipments",
      value: filteredShipments.filter(
        (s) => s.status !== "Delivered" && s.status !== "Completed",
      ).length,
      icon: Truck,
      color: "bg-blue-500",
      trend: "+12%",
      sparklineData: generateSparkline(40, 10)
    },
    {
      label: "Containers Remaining",
      value: totalRemaining,
      icon: Package,
      color: "bg-orange-500",
      trend: "-5%",
      sparklineData: generateSparkline(100, 20).sort((a,b) => b.value - a.value) // Trending down
    },
    {
      label: "Avg Transit Time",
      value: "4.2 Days",
      icon: Clock,
      color: "bg-purple-500",
      trend: "-0.5 Days",
      sparklineData: generateSparkline(4.5, 1)
    },
    {
      label: "Delivered (MTD)",
      value: filteredShipments.filter((s) => s.status === "Delivered").length,
      icon: CheckCircle2,
      color: "bg-green-500",
      trend: "+18%",
      sparklineData: generateSparkline(20, 5).sort((a,b) => a.value - b.value) // Trending up
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

  const containerStats = useMemo(() => {
    const counts = { '20ft': 0, '40ft': 0, '40HC': 0, 'Other': 0 };
    filteredShipments.forEach(s => {
      if (s.status === 'Completed' || s.status === 'Delivered') return;
      const size = s.containerSizeAndType || '';
      if (size.includes('20')) counts['20ft']++;
      else if (size === '40ft' || size === '40FT') counts['40ft']++;
      else if (size.includes('40HC') || size.includes('40HQ')) counts['40HC']++;
      else counts['Other']++;
    });
    return [
      { name: '20ft', value: counts['20ft'], color: '#3b82f6' },
      { name: '40ft', value: counts['40ft'], color: '#10b981' },
      { name: '40HC', value: counts['40HC'], color: '#f97316' },
      { name: 'Other', value: counts['Other'], color: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [filteredShipments]);

  const upcomingVessels = useMemo(() => {
    return vessels
      .filter(v => new Date(v.expectedDate || v.arrivalDate) >= new Date(new Date().setHours(0,0,0,0)))
      .sort((a, b) => new Date(a.expectedDate || a.arrivalDate) - new Date(b.expectedDate || b.arrivalDate))
      .slice(0, 4);
  }, [vessels]);

  const activeIncidents = useMemo(() => {
    return filteredShipments.filter(s => s.hasIncident && s.incidentStatus !== 'Resolved');
  }, [filteredShipments]);

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
      {/* 3D Global Logistics Map */}
      <Earth3DTrucks />

      {/* Analytics Header & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">
            Dashboard Overview
          </h2>
          <p className="text-zinc-500 text-sm">
            Real-time logistics and cost analytics
          </p>
        </div>
        
        {/* Quick Actions Bento */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border-2 border-zinc-200 shadow-[0_4px_0_rgb(228,228,231)]">
          <button
            onClick={() => setActiveTab("Shipments")}
            className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            <Package size={14} /> New Shipment
          </button>
          <button
            onClick={() => window.print()}
            className="bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1.5"
          >
            <Download size={14} /> Export Report
          </button>
          <button
            onClick={onStartChat}
            className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
          >
            <MessageSquare size={14} /> Team Chat
          </button>

          <div className="h-6 w-px bg-zinc-200 mx-1 hidden sm:block"></div>

          <select
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-700 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="all">All Companies</option>
            {companiesData.filter(c => c.type !== 'transporter').map((company) => (
              <option key={company.id} value={company.name}>
                {company.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            {["weekly", "monthly", "yearly"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                  timeRange === range
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700",
                )}
              >
                {range.charAt(0)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(228,228,231)] transition-transform hover:-translate-y-1 hover:shadow-[0_8px_0_rgb(228,228,231)]">
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
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorShipments)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(228,228,231)] transition-transform hover:-translate-y-1 hover:shadow-[0_8px_0_rgb(228,228,231)]">
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

      {/* Demurrage & Detention Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-red-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(254,226,226)]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-red-500" />
              <h3 className="text-lg font-bold text-zinc-900">Demurrage & Detention Alerts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredShipments.filter(s => {
                const start = s.arrivalDate ? new Date(s.arrivalDate) : null;
                if (!start) return false;
                const stop = (s.actualLiftingTime || s.actualPickupTime) ? new Date(s.actualLiftingTime || s.actualPickupTime) : new Date();
                const diffDays = Math.floor((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const remaining = 10 - diffDays;
                return remaining < 3 && !(s.actualLiftingTime || s.actualPickupTime);
              }).map(s => {
                const start = new Date(s.arrivalDate);
                const diffDays = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const remaining = 10 - diffDays;
                return (
                  <div key={s.id} className="p-3 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-red-900">{s.trackingId}</div>
                      <div className="text-[10px] text-red-600">Demurrage Risk</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-red-600">{remaining < 0 ? 'LATE' : `${remaining}d left`}</div>
                    </div>
                  </div>
                );
              })}
              {filteredShipments.filter(s => {
                const start = (s.actualLiftingTime || s.actualPickupTime) ? new Date(s.actualLiftingTime || s.actualPickupTime) : null;
                if (!start) return false;
                const stop = s.emptyContainerReturnTime ? new Date(s.emptyContainerReturnTime) : new Date();
                const diffDays = Math.floor((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const remaining = 14 - diffDays;
                return remaining < 5 && !s.emptyContainerReturnTime;
              }).map(s => {
                const start = new Date(s.actualLiftingTime || s.actualPickupTime);
                const diffDays = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const remaining = 14 - diffDays;
                return (
                  <div key={s.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-orange-900">{s.trackingId}</div>
                      <div className="text-[10px] text-orange-600">Detention Risk</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-orange-600">{remaining < 0 ? 'LATE' : `${remaining}d left`}</div>
                    </div>
                  </div>
                );
              })}
              {filteredShipments.filter(s => {
                const start1 = s.arrivalDate ? new Date(s.arrivalDate) : null;
                const stop1 = (s.actualLiftingTime || s.actualPickupTime) ? new Date(s.actualLiftingTime || s.actualPickupTime) : new Date();
                const rem1 = start1 ? 10 - Math.floor((stop1.getTime() - start1.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const risk1 = rem1 !== null && rem1 < 3 && !(s.actualLiftingTime || s.actualPickupTime);

                const start2 = (s.actualLiftingTime || s.actualPickupTime) ? new Date(s.actualLiftingTime || s.actualPickupTime) : null;
                const stop2 = s.emptyContainerReturnTime ? new Date(s.emptyContainerReturnTime) : new Date();
                const rem2 = start2 ? 14 - Math.floor((stop2.getTime() - start2.getTime()) / (1000 * 60 * 60 * 24)) : null;
                const risk2 = rem2 !== null && rem2 < 5 && !s.emptyContainerReturnTime;

                return risk1 || risk2;
              }).length === 0 && (
                <div className="col-span-full text-center py-4 text-zinc-500 text-sm">
                  No shipments currently at risk of demurrage or detention.
                </div>
              )}
            </div>
          </div>

          {/* Active Route Progress Bars */}
          <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(228,228,231)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" /> Active Routes
              </h3>
            </div>
            <div className="space-y-4">
              {filteredShipments.filter(s => s.status === 'In Transit' || s.status === 'Planning').slice(0, 4).map(s => {
                let progress = 10;
                if (s.actualLiftingTime || s.actualPickupTime) progress = 40;
                if (s.factoryGateInTime) progress = 60;
                if (s.unloadingDate) progress = 80;
                if (s.emptyContainerReturnTime) progress = 100;

                return (
                  <div key={s.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-700">
                      <span>{s.trackingId}</span>
                      <span className="text-blue-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{s.loadingPoint || 'Port'}</span>
                      <span>{s.unloadingLocation || s.unloadingPoint || 'Destination'}</span>
                    </div>
                  </div>
                );
              })}
              {filteredShipments.filter(s => s.status === 'In Transit' || s.status === 'Planning').length === 0 && (
                <div className="text-center py-4 text-zinc-500 text-sm">No active routes.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Port Status / Weather Widget */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-indigo-700 rounded-2xl p-6 shadow-[0_6px_0_rgb(67,56,202)] text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Truck size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Port Status</h3>
              <p className="text-xl font-black mb-4">Karachi Port</p>
              <div className="flex items-center gap-4">
                <div className="text-3xl">🌤️</div>
                <div>
                  <div className="text-2xl font-bold">28°C</div>
                  <div className="text-xs text-blue-100">Clear Weather</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-100">Congestion</span>
                  <span className="font-bold text-orange-300">Moderate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Container Fleet Distribution */}
          <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(228,228,231)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Package size={16} className="text-zinc-500" /> Active Fleet
              </h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={containerStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {containerStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {containerStats.map(stat => (
                <div key={stat.name} className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                  {stat.name} ({stat.value})
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(228,228,231)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Clock size={16} className="text-zinc-500" /> Live Activity
              </h3>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(() => {
                let activities = [];
                filteredShipments.forEach(s => {
                  if (s.history) {
                    s.history.forEach(h => {
                      activities.push({
                        ...h,
                        shipmentId: s.trackingId,
                        time: h.date?.toDate ? h.date.toDate() : new Date(h.date)
                      });
                    });
                  }
                });
                return activities.sort((a, b) => b.time - a.time).slice(0, 6).map((activity, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="mt-0.5">
                      {activity.action.includes('Incident') ? (
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                      ) : activity.action.includes('Completed') ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-800">
                        <span className="font-bold">{activity.shipmentId}</span>: {activity.action}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {activity.time.toLocaleString()} • {activity.user}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
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
          <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_4px_0_rgb(228,228,231)]">
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
          <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_4px_0_rgb(228,228,231)]">
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
          <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 lg:col-span-2 shadow-[0_4px_0_rgb(228,228,231)]">
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

      {/* Shipment Progress Tracker */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl p-6 shadow-[0_6px_0_rgb(228,228,231)] mt-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20} />
            Shipment Progress Tracker
          </h3>
          <p className="text-sm text-zinc-500">Track section completion for active shipments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b-2 border-zinc-100">
                <th className="pb-3 text-xs font-mono uppercase tracking-widest text-zinc-500">Shipment</th>
                <th className="pb-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">Clearing</th>
                <th className="pb-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">Outbound Transport</th>
                <th className="pb-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">Unloading</th>
                <th className="pb-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">Return Transport</th>
                <th className="pb-3 text-xs font-mono uppercase tracking-widest text-zinc-500 text-center">Warehouse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredShipments.filter(s => s.status !== "Delivered" && s.status !== "Completed").map(s => {
                const isClearingDone = !!s.clearanceDate;
                const isOutboundDone = !!(s.actualLiftingTime || s.actualPickupTime);
                const isUnloadingDone = !!(s.unloadingDate || s.factoryGateOutTime);
                const isReturnDone = !!s.emptyContainerReturnTime;
                const isWarehouseDone = !!s.returnLoadReceivedStatus;

                const renderStatus = (isDone) => (
                  <div className="flex justify-center">
                    {isDone ? (
                      <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center" title="Completed">
                        <CheckCircle2 size={14} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded border-2 border-zinc-200 bg-zinc-50 flex items-center justify-center" title="Pending">
                        <Clock size={12} className="text-zinc-300" />
                      </div>
                    )}
                  </div>
                );

                return (
                  <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-sm text-zinc-900">{s.containerNumber || "Pending Container"}</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">{s.trackingId}</div>
                    </td>
                    <td className="py-4">{renderStatus(isClearingDone)}</td>
                    <td className="py-4">{renderStatus(isOutboundDone)}</td>
                    <td className="py-4">{renderStatus(isUnloadingDone)}</td>
                    <td className="py-4">{renderStatus(isReturnDone)}</td>
                    <td className="py-4">{renderStatus(isWarehouseDone)}</td>
                  </tr>
                );
              })}
              {filteredShipments.filter(s => s.status !== "Delivered" && s.status !== "Completed").length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-sm text-zinc-500">No active shipments to track.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VesselPlanningView = ({ vessels, shipments, profile }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingVesselId, setEditingVesselId] = useState(null);
  const [vesselToDelete, setVesselToDelete] = useState(null);
  const [expandedVessel, setExpandedVessel] = useState(null);
  const [expandedBL, setExpandedBL] = useState(null);
  
  const [newVessel, setNewVessel] = useState({
    name: "",
    arrivalDate: "",
    clearingAgent: profile?.name || "",
    loadingPoint: "",
    status: "Expected",
  });
  const [bls, setBls] = useState([{ id: "bl-1", blNumber: "" }]);
  const [containers, setContainers] = useState([{ id: "c-1", blId: "bl-1", containerNumber: "", size: "20", weight: "" }]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newVessel.name) return;
    try {
      const isEditing = !!editingVesselId;
      const vesselId = isEditing ? editingVesselId : doc(collection(db, "vessels")).id;
      
      let totalContainers = 0;
      const processedBls = bls.map(bl => {
        const blContainers = containers
          .filter(c => c.blId === bl.id && c.containerNumber.trim() !== "")
          .map(c => ({
            containerNumber: c.containerNumber,
            size: c.size,
            weight: c.weight
          }));
        totalContainers += blContainers.length;
        return {
          blNumber: bl.blNumber,
          containers: blContainers
        };
      }).filter(bl => bl.blNumber.trim() !== "");

      if (isEditing) {
        const oldVessel = vessels.find(v => v.id === vesselId);
        if (oldVessel) {
          const oldContainerNumbers = (oldVessel.bls || []).flatMap(bl => (bl.containers || []).map(c => c.containerNumber));
          const newContainerNumbers = processedBls.flatMap(bl => bl.containers.map(c => c.containerNumber));
          
          const removedContainers = oldContainerNumbers.filter(c => !newContainerNumbers.includes(c));
          
          if (removedContainers.length > 0) {
            const shipmentsQuery = query(
              collection(db, "shipments"), 
              where("vesselName", "==", oldVessel.name)
            );
            const shipmentsSnapshot = await getDocs(shipmentsQuery);
            
            const deletePromises = shipmentsSnapshot.docs
              .filter(docSnap => removedContainers.includes(docSnap.data().containerNumber))
              .map(docSnap => deleteDoc(doc(db, "shipments", docSnap.id)));
              
            await Promise.all(deletePromises);
          }
        }
      }

      await setDoc(doc(db, "vessels", vesselId), {
        name: newVessel.name,
        arrivalDate: newVessel.arrivalDate || "",
        clearingAgent: newVessel.clearingAgent || "",
        loadingPoint: newVessel.loadingPoint || "",
        expectedDate: newVessel.arrivalDate || "",
        clearanceDate: "",
        status: newVessel.status || "Expected",
        bls: processedBls,
        totalContainers,
        id: vesselId,
        updatedAt: Timestamp.now(),
      });

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
      setNewVessel({ name: "", arrivalDate: "", clearingAgent: profile?.name || "", loadingPoint: "", status: "Expected" });
      setBls([{ id: "bl-1", blNumber: "" }]);
      setContainers([{ id: "c-1", blId: "bl-1", containerNumber: "", size: "20", weight: "" }]);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, "vessels");
    }
  };

  const handleEditClick = (vessel) => {
    setEditingVesselId(vessel.id);
    setNewVessel({
      name: vessel.name || "",
      arrivalDate: vessel.arrivalDate || "",
      clearingAgent: vessel.clearingAgent || profile?.name || "",
      loadingPoint: vessel.loadingPoint || "",
      status: vessel.status || "Expected",
    });
    
    const initialBls = [];
    const initialContainers = [];
    
    if (vessel.bls && vessel.bls.length > 0) {
      vessel.bls.forEach((bl, bIndex) => {
        const blId = `bl-${bIndex}`;
        initialBls.push({ id: blId, blNumber: bl.blNumber });
        if (bl.containers && bl.containers.length > 0) {
          bl.containers.forEach((c, cIndex) => {
            initialContainers.push({
              id: `c-${bIndex}-${cIndex}`,
              blId: blId,
              containerNumber: typeof c === 'string' ? c : c.containerNumber,
              size: typeof c === 'string' ? "20" : (c.size || "20"),
              weight: typeof c === 'string' ? "" : (c.weight || "")
            });
          });
        }
      });
    }
    
    setBls(initialBls.length > 0 ? initialBls : [{ id: "bl-1", blNumber: "" }]);
    setContainers(initialContainers.length > 0 ? initialContainers : [{ id: "c-1", blId: "bl-1", containerNumber: "", size: "20", weight: "" }]);
    setIsAdding(true);
  };

  const handleDeleteVessel = async (vessel, e) => {
    e.stopPropagation();
    try {
      // Find all shipments associated with this vessel
      const shipmentsQuery = query(collection(db, "shipments"), where("vesselName", "==", vessel.name));
      const shipmentsSnapshot = await getDocs(shipmentsQuery);
      
      // Delete all associated shipments
      const deletePromises = shipmentsSnapshot.docs.map(docSnap => deleteDoc(doc(db, "shipments", docSnap.id)));
      await Promise.all(deletePromises);

      // Delete the vessel itself
      await deleteDoc(doc(db, "vessels", vessel.id));
      setVesselToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vessels/${vessel.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
          Vessel Planning & Schedule
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-orange-500 border-2 border-orange-700 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
        >
          + Add Vessel Plan
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-xl mb-8 shadow-[0_4px_0_rgb(228,228,231)]">
          <h3 className="text-zinc-900 font-medium mb-4">
            {editingVesselId ? "Edit Vessel Schedule" : "New Vessel Schedule"}
          </h3>
          <form
            onSubmit={handleCreate}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="Arrival Date"
                type="date"
                value={newVessel.arrivalDate || ""}
                onChange={(e) =>
                  setNewVessel({ ...newVessel, arrivalDate: e.target.value })
                }
              />

              <input
                className="bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                placeholder="Clearing Agent Name"
                value={newVessel.clearingAgent || ""}
                onChange={(e) =>
                  setNewVessel({ ...newVessel, clearingAgent: e.target.value })
                }
              />
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-zinc-900">Bills of Lading (BL)</h4>
                <button
                  type="button"
                  onClick={() => setBls([...bls, { id: `bl-${Date.now()}`, blNumber: "" }])}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  + Add BL
                </button>
              </div>
              <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden shadow-[0_4px_0_rgb(228,228,231)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">BL Number</th>
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Total Containers</th>
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {bls.map((bl, index) => (
                      <tr key={bl.id}>
                        <td className="px-4 py-2">
                          <input
                            className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"
                            placeholder="BL Number"
                            value={bl.blNumber}
                            onChange={(e) => {
                              const updated = [...bls];
                              updated[index].blNumber = e.target.value;
                              setBls(updated);
                            }}
                            required
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-zinc-600 font-medium">
                          {containers.filter(c => c.blId === bl.id).length}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setBls(bls.filter(b => b.id !== bl.id));
                              setContainers(containers.filter(c => c.blId !== bl.id));
                            }}
                            className="text-zinc-400 hover:text-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-zinc-900">Container Details</h4>
                <button
                  type="button"
                  onClick={() => setContainers([...containers, { id: `c-${Date.now()}`, blId: bls[0]?.id || "", containerNumber: "", size: "20", weight: "" }])}
                  className="text-xs text-orange-600 hover:underline font-medium"
                >
                  + Add Container
                </button>
              </div>
              <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-[0_4px_0_rgb(228,228,231)]">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Container No</th>
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Size (20/40)</th>
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Weight</th>
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">BL Number</th>
                      <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {containers.map((container, index) => (
                      <tr key={container.id}>
                        <td className="px-4 py-2">
                          <input
                            className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"
                            placeholder="Container No"
                            value={container.containerNumber}
                            onChange={(e) => {
                              const updated = [...containers];
                              updated[index].containerNumber = e.target.value;
                              setContainers(updated);
                            }}
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"
                            value={container.size}
                            onChange={(e) => {
                              const updated = [...containers];
                              updated[index].size = e.target.value;
                              setContainers(updated);
                            }}
                          >
                            <option value="20">20</option>
                            <option value="40">40</option>
                            <option value="40HC">40HC</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"
                            placeholder="Weight"
                            value={container.weight}
                            onChange={(e) => {
                              const updated = [...containers];
                              updated[index].weight = e.target.value;
                              setContainers(updated);
                            }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            className="bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-zinc-900 focus:border-orange-500 outline-none w-full"
                            value={container.blId}
                            onChange={(e) => {
                              const updated = [...containers];
                              updated[index].blId = e.target.value;
                              setContainers(updated);
                            }}
                          >
                            <option value="">Select BL</option>
                            {bls.map(bl => (
                              <option key={bl.id} value={bl.id}>{bl.blNumber || "Unnamed BL"}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setContainers(containers.filter(c => c.id !== container.id));
                            }}
                            className="text-zinc-400 hover:text-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
              >
                Save Vessel Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingVesselId(null);
                  setNewVessel({ name: "", company: "", arrivalDate: "", clearingAgent: profile?.name || "", status: "Expected" });
                  setBls([{ id: "bl-1", blNumber: "" }]);
                  setContainers([{ id: "c-1", blId: "bl-1", containerNumber: "", size: "20", weight: "" }]);
                }}
                className="px-6 py-2 bg-zinc-100 text-zinc-600 rounded font-medium hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-[0_4px_0_rgb(228,228,231)]">
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
                        {profile?.role === "admin" && (
                          vesselToDelete === vessel.id ? (
                            <div className="flex gap-1.5 items-center ml-2">
                              <span className="text-[10px] text-red-600 font-medium">Sure?</span>
                              <button onClick={(e) => handleDeleteVessel(vessel, e)} className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700">Yes</button>
                              <button onClick={(e) => { e.stopPropagation(); setVesselToDelete(null); }} className="px-2 py-1 bg-zinc-200 text-zinc-700 rounded text-[10px] font-medium hover:bg-zinc-300">No</button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setVesselToDelete(vessel.id);
                              }}
                              className="text-zinc-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="p-0 border-b border-zinc-100 bg-zinc-50/30">
                        <div className="px-12 py-4 space-y-4">
                          <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Bills of Lading</h4>
                          {vessel.bls && vessel.bls.length > 0 ? (
                            <div className="space-y-2">
                              {vessel.bls.map((bl, idx) => {
                                const isBlExpanded = expandedBL === bl.blNumber;
                                const blShipments = shipments.filter(s => s.vesselName === vessel.name && s.blNumber === bl.blNumber);
                                return (
                                  <div key={idx} className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden shadow-[0_4px_0_rgb(228,228,231)]">
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

const AudioRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const uniqueName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
          const storageRef = ref(storage, `uploads/audio/${uniqueName}`);
          
          await uploadBytes(storageRef, audioBlob);
          const downloadURL = await getDownloadURL(storageRef);
          
          onRecordingComplete(downloadURL);
        } catch (error) {
          console.error("Audio upload failed:", error);
          if (error?.code === 'storage/retry-limit-exceeded' || error?.code === 'storage/unauthorized') {
            alert("Storage Access Denied: \n\nPlease enable Firebase Storage in your Firebase Console and set the Rules to allow read/write access.");
          } else {
            alert("Failed to upload audio message. " + (error?.message || ""));
          }
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full border border-red-200">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
          <button onClick={stopRecording} className="ml-2 hover:text-red-800">
            <Square size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="p-2 text-zinc-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
          title="Record Voice Message"
        >
          <Mic size={18} />
        </button>
      )}
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
  const [modalState, setModalState] = useState({ isOpen: false, message: "", isStorageError: false });
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject extremely massive files (e.g., 200MB 4k videos) to prevent silent hangs
    if (file.size > 200 * 1024 * 1024) {
      setModalState({ isOpen: true, message: "File is too large. Please select a file smaller than 200MB.", isStorageError: false });
      return;
    }

    try {
      setIsUploading(true);
      // Generate a unique file name to prevent collision
      const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const storageRef = ref(storage, `uploads/${uniqueName}`);
      
      // Upload raw binary stream directly to Storage
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Return the permanent URL instead of a bloated BASE64 string
      onUpload(downloadURL, file.name);
    } catch (error) {
      console.error("Upload error:", error);
      const isRetryLimit = error?.code === 'storage/retry-limit-exceeded' || error?.code === 'storage/unauthorized';
      setModalState({ 
        isOpen: true, 
        message: isRetryLimit ? "Storage Access Denied" : "Failed to upload file to storage. Please try again.",
        isStorageError: isRetryLimit
      });
    } finally {
      setIsUploading(false);
      // Reset input so the same file could theoretically be uploaded twice if needed
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{modalState.isStorageError ? 'Storage Setup Required' : 'Notice'}</h3>
            <div className="text-zinc-600 text-sm mb-6">
              {modalState.message}
              {modalState.isStorageError && (
                <div className="mt-4 bg-orange-50 text-orange-800 p-3 rounded border border-orange-200">
                  <p className="font-bold mb-1 border-b border-orange-200 pb-1">Please enable Storage:</p>
                  <ol className="list-decimal pl-4 space-y-1 mt-2 text-xs">
                    <li>Go to console.firebase.google.com</li>
                    <li>Click <strong>Storage</strong> → <strong>Get Started</strong></li>
                    <li>Once enabled, go to the <strong>Rules</strong> tab</li>
                    <li>Paste the following and Publish:</li>
                  </ol>
                  <pre className="bg-white p-2 mt-2 rounded border border-orange-100 text-[10px] sm:text-[11px] overflow-x-auto whitespace-pre-wrap">
{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setModalState({ isOpen: false, message: "", isStorageError: false })}
                className="px-4 py-2 text-sm font-bold text-white bg-orange-500 border-2 border-orange-700 hover:bg-orange-600 rounded-xl transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white border-2 border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-tighter text-zinc-600 transition-all shadow-[0_2px_0_rgb(228,228,231)]",
          isUploading ? "opacity-50 cursor-wait bg-zinc-50" : "hover:bg-zinc-50 hover:-translate-y-[1px] hover:shadow-[0_3px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
        )}
      >
        {isUploading ? (
          <div className="w-3 h-3 border-2 border-zinc-400 border-t-zinc-600 rounded-full animate-spin" />
        ) : (
          <Paperclip size={12} />
        )}
        {isUploading ? "Uploading..." : label}
      </button>
    </div>
  );
};

const PAKISTAN_LOCATIONS = {
  "Abbottabad": ["Cantonment", "City Center", "Havelian", "Nawan Shehr", "Mandian"],
  "Attock": ["Attock City", "Hasan Abdal", "Hazro", "Jand", "Pindi Gheb"],
  "Bahawalnagar": ["Bahawalnagar City", "Chishtian", "Fort Abbas", "Haroonabad", "Minchinabad"],
  "Bahawalpur": ["Cantonment", "City Center", "Ahmadpur East", "Hasilpur", "Khairpur Tamewali", "Yazman"],
  "Bannu": ["Bannu City", "Cantonment", "Domel"],
  "Bhakkar": ["Bhakkar City", "Darya Khan", "Kaloorkot", "Mankera"],
  "Bhalwal": ["Bhalwal City", "Bhera", "Kot Momin"],
  "Burewala": ["Burewala City", "Gaggo Mandi"],
  "Chakwal": ["Chakwal City", "Choa Saidan Shah", "Kallar Kahar", "Talagang"],
  "Chaman": ["Chaman City"],
  "Charsadda": ["Charsadda City", "Shabqadar", "Tangi"],
  "Chiniot": ["Chiniot City", "Bhowana", "Lalian"],
  "Chishtian": ["Chishtian City"],
  "Dadu": ["Dadu City", "Johi", "Khairpur Nathan Shah", "Mehar"],
  "Daska": ["Daska City"],
  "Dera Ghazi Khan": ["DG Khan City", "Taunsa", "Kot Chutta"],
  "Dera Ismail Khan": ["DI Khan City", "Cantonment", "Kulachi", "Paharpur"],
  "Faisalabad": ["City Center", "Jaranwala", "Satyana", "Medina Town", "Ghulam Muhammad Abad", "Samanabad", "Chak Jhumra", "Samundri", "Tandlianwala"],
  "Gojra": ["Gojra City"],
  "Gujranwala": ["City Center", "Wazirabad", "Kamoke", "Cantonment", "Satellite Town", "Nowshera Virkan"],
  "Gujrat": ["Gujrat City", "Kharian", "Sarai Alamgir"],
  "Gwadar": ["Port Area", "New Town", "Sanghar Housing Scheme", "Jiwani", "Ormara", "Pasni"],
  "Hafizabad": ["Hafizabad City", "Pindi Bhattian"],
  "Haroonabad": ["Haroonabad City"],
  "Hasan Abdal": ["Hasan Abdal City"],
  "Hyderabad": ["City Center", "Latifabad", "Qasimabad", "Cantonment", "SITE", "Hala", "Matiari", "Tando Allahyar", "Tando Muhammad Khan"],
  "Islamabad": ["F-6", "F-7", "F-8", "F-10", "F-11", "G-6", "G-7", "G-8", "G-9", "G-10", "G-11", "G-13", "G-14", "Blue Area", "I-8", "I-9", "I-10", "DHA", "Bahria Town", "E-11", "Bani Gala", "Chak Shahzad", "Tarnol"],
  "Jacobabad": ["Jacobabad City", "Garhi Khairo", "Thul"],
  "Jaranwala": ["Jaranwala City"],
  "Jhang": ["Jhang City", "Ahmadpur Sial", "Athara Hazari", "Shorkot"],
  "Jhelum": ["Jhelum City", "Cantonment", "Dina", "Pind Dadan Khan", "Sohawa"],
  "Kamalia": ["Kamalia City"],
  "Kamoke": ["Kamoke City"],
  "Kandhkot": ["Kandhkot City"],
  "Karachi": ["Clifton", "DHA", "Saddar", "Gulshan-e-Iqbal", "Korangi", "SITE Area", "Port Qasim", "Keamari", "Landhi", "Malir", "Nazimabad", "North Nazimabad", "Orangi Town", "Lyari", "Gadap", "Bin Qasim", "Gulberg", "Jamshed Town", "Liaquatabad", "New Karachi", "Shah Faisal", "Baldia", "Kemari"],
  "Kasur": ["Kasur City", "Chunian", "Kot Radha Kishan", "Pattoki"],
  "Khairpur": ["Khairpur City", "Faiz Ganj", "Gambat", "Kot Diji", "Nara", "Sobhodero", "Thari Mirwah"],
  "Khanewal": ["Khanewal City", "Jahanian", "Kabirwala", "Mian Channu"],
  "Khanpur": ["Khanpur City"],
  "Khushab": ["Khushab City", "Jauharabad", "Naushera", "Quaidabad"],
  "Kohat": ["Kohat City", "Cantonment", "Lachi"],
  "Kot Addu": ["Kot Addu City"],
  "Lahore": ["Gulberg", "DHA", "Johar Town", "Bahria Town", "Model Town", "Shahdara", "Wagah", "Thokar Niaz Baig", "Cantonment", "Iqbal Town", "Samanabad", "Ravi Town", "Shalimar", "Aziz Bhatti", "Data Ganj Bakhsh", "Nishtar Town", "Walled City"],
  "Larkana": ["Larkana City", "Bakrani", "Dokri", "Ratodero"],
  "Layyah": ["Layyah City", "Chaubara", "Karor Lal Esan"],
  "Lodhran": ["Lodhran City", "Dunyapur", "Kehror Pacca"],
  "Mandi Bahauddin": ["Mandi Bahauddin City", "Malakwal", "Phalia"],
  "Mardan": ["Mardan City", "Cantonment", "Takht Bhai", "Katlang"],
  "Mian Channu": ["Mian Channu City"],
  "Mianwali": ["Mianwali City", "Isa Khel", "Piplan"],
  "Mingora": ["Mingora City", "Saidu Sharif"],
  "Mirpur Khas": ["Mirpur Khas City", "Digri", "Kot Ghulam Muhammad", "Jhuddo", "Sindhri", "Shujabad"],
  "Multan": ["City Center", "Cantonment", "Gulgasht Colony", "Shah Rukn-e-Alam", "Bosan Road", "Sher Shah Road", "Shujabad", "Jalalpur Pirwala"],
  "Muridke": ["Muridke City"],
  "Muzaffargarh": ["Muzaffargarh City", "Alipur", "Jatoi", "Kot Addu"],
  "Nawabshah": ["Nawabshah City", "Daur", "Sakrand", "Qazi Ahmed"],
  "Nowshera": ["Nowshera City", "Cantonment", "Pabbi", "Jehangira"],
  "Okara": ["Okara City", "Cantonment", "Depalpur", "Renala Khurd"],
  "Pakpattan": ["Pakpattan City", "Arifwala"],
  "Peshawar": ["City Center", "Hayatabad", "University Town", "Cantonment", "Charsadda Road", "Kohat Road", "Warsak Road", "Ring Road", "Saddar"],
  "Quetta": ["City Center", "Satellite Town", "Cantonment", "Jinnah Town", "Sariab Road", "Zarghoon Road", "Hanna Urak", "Hazara Town", "Alamdar Road"],
  "Rahim Yar Khan": ["Rahim Yar Khan City", "Khanpur", "Liaquatpur", "Sadiqabad"],
  "Rawalpindi": ["City Center", "Saddar", "Bahria Town", "DHA", "Satellite Town", "Peshawar Road", "Cantonment", "Chaklala", "Westridge", "Adiala Road", "Murree Road", "Taxila", "Gujar Khan", "Kallar Syedan", "Kahuta", "Kotli Sattian"],
  "Sadiqabad": ["Sadiqabad City"],
  "Sahiwal": ["Sahiwal City", "Chichawatni"],
  "Sargodha": ["Sargodha City", "Cantonment", "Bhalwal", "Kot Momin", "Sahiwal (Sargodha)", "Shahpur", "Sillanwali"],
  "Sheikhupura": ["Sheikhupura City", "Ferozewala", "Muridke", "Safdarabad", "Sharaqpur"],
  "Shikarpur": ["Shikarpur City", "Garhi Yasin", "Khanpur", "Lakhi"],
  "Sialkot": ["City Center", "Cantonment", "Daska", "Sambrial", "Pasrur", "Uggoki"],
  "Sukkur": ["Sukkur City", "Pano Akil", "Rohri", "Salehpat"],
  "Swabi": ["Swabi City", "Chota Lahor", "Razar", "Topi"],
  "Tando Adam": ["Tando Adam City"],
  "Tando Allahyar": ["Tando Allahyar City"],
  "Tando Muhammad Khan": ["Tando Muhammad Khan City"],
  "Vehari": ["Vehari City", "Burewala", "Mailsi"],
  "Wah Cantonment": ["Wah Cantt"],
  "Wazirabad": ["Wazirabad City"]
};

const locationOptions = Object.entries(PAKISTAN_LOCATIONS).flatMap(([city, towns]) => [
  city,
  ...towns.map(town => `${town}, ${city}`)
]).sort();

function ShipmentsView({
  shipments,
  vessels,
  profile,
  rolePermissions,
  users,
  companiesData,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("all");
  const [newShipment, setNewShipment] = useState({
    trackingId: `SHP-${Math.floor(Math.random() * 100000)}`,
    status: "Planning",
    type: "vessel",
    vesselName: "",
    arrivalDate: "",
    loadingPoint: "",
    unloadingPoint: "",
  });
  const [selectedVesselData, setSelectedVesselData] = useState(null);
  const [selectedContainers, setSelectedContainers] = useState([]);
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  const handleLoadData = () => {
    if (newShipment.vesselName && newShipment.arrivalDate) {
      const vessel = vessels?.find(
        (v) => v.name === newShipment.vesselName && (v.arrivalDate === newShipment.arrivalDate || v.expectedDate === newShipment.arrivalDate)
      );
      setSelectedVesselData(vessel || null);
      setSelectedContainers([]);
    } else {
      setSelectedVesselData(null);
    }
  };

  const handleContainerToggle = (blNumber, container) => {
    const id = `${blNumber}-${container.containerNumber}`;
    if (selectedContainers.some(c => c.id === id)) {
      setSelectedContainers(selectedContainers.filter(c => c.id !== id));
    } else {
      setSelectedContainers([...selectedContainers, { id, blNumber, container }]);
    }
  };

  const handleCreateShipments = async () => {
    try {
      const companyName = newShipment.companyName || selectedVesselData?.company || '';
      const loadingPoint = newShipment.loadingPoint || '';
      const unloadingPoint = newShipment.unloadingPoint || '';

      if (!companyName || !loadingPoint || !unloadingPoint) {
        alert("Please select Company, Loading Point, and Unloading Point.");
        return;
      }

      for (const item of selectedContainers) {
        const trackingId = `SHP-${Math.floor(Math.random() * 100000)}`;
        const historyEntry = {
          action: "Shipment Created",
          user: profile?.displayName || profile?.email || "Unknown User",
          role: profile?.role || "Unknown Role",
          timestamp: new Date().toISOString(),
        };
        await setDoc(doc(db, "shipments", trackingId), {
          id: trackingId,
          trackingId: trackingId,
          companyName: newShipment.companyName || selectedVesselData?.company || "",
          type: "vessel",
          vesselName: newShipment.vesselName,
          arrivalDate: newShipment.arrivalDate,
          blNumber: item.blNumber,
          containerNumber: item.container.containerNumber,
          containerSizeAndType: item.container.size,
          grossWeight: item.container.weight,
          loadingPoint: loadingPoint,
          unloadingPoint: unloadingPoint,
          status: "Planning",
          history: [historyEntry],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      await createNotification(
        "admin",
        "New Shipments Created",
        `${selectedContainers.length} shipments have been created.`,
        "success",
        "Shipments",
      );
      
      setShowCreatePopup(false);
      setIsAdding(false);
      setSelectedContainers([]);
      setNewShipment({
        trackingId: `SHP-${Math.floor(Math.random() * 100000)}`,
        status: "Planning",
        type: "vessel",
        vesselName: "",
        arrivalDate: "",
        loadingCity: "",
        loadingTown: "",
        unloadingCity: "",
        unloadingTown: "",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "shipments");
    }
  };

  const handleCreateLocalShipment = async () => {
    try {
      const companyName = newShipment.companyName || '';
      const loadingPoint = newShipment.loadingPoint || '';
      const unloadingPoint = newShipment.unloadingPoint || '';

      if (!companyName || !loadingPoint || !unloadingPoint) {
        alert("Please select Company, Loading Point, and Unloading Point.");
        return;
      }

      const trackingId = `LOC-${Math.floor(Math.random() * 100000)}`;
      const historyEntry = {
        action: "Local Shipment Created",
        user: profile?.displayName || profile?.email || "Unknown User",
        role: profile?.role || "Unknown Role",
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(db, "shipments", trackingId), {
        id: trackingId,
        trackingId: trackingId,
        companyName: newShipment.companyName || "",
        type: "local",
        loadingPoint: loadingPoint,
        unloadingPoint: unloadingPoint,
        status: "Planning",
        history: [historyEntry],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await createNotification(
        "admin",
        "New Local Shipment Created",
        `Local shipment ${trackingId} has been created.`,
        "success",
        "Shipments",
      );
      
      setIsAdding(false);
      setNewShipment({
        trackingId: `SHP-${Math.floor(Math.random() * 100000)}`,
        status: "Planning",
        type: "vessel",
        vesselName: "",
        arrivalDate: "",
        loadingCity: "",
        loadingTown: "",
        unloadingCity: "",
        unloadingTown: "",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "shipments");
    }
  };

  const handleBulkImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          for (const row of results.data) {
            const trackingId = `SHP-${Math.floor(Math.random() * 100000)}`;
            const historyEntry = {
              action: "Bulk Imported Shipment",
              user: profile?.displayName || profile?.email || "Unknown User",
              role: profile?.role || "Unknown Role",
              timestamp: new Date().toISOString(),
            };
            await setDoc(doc(db, "shipments", trackingId), {
              id: trackingId,
              trackingId: trackingId,
              companyName: row["Company"] || "",
              type: row["Type"]?.toLowerCase() === "local" ? "local" : "vessel",
              vesselName: row["Vessel Name"] || "",
              arrivalDate: row["Arrival Date"] || "",
              blNumber: row["BL Number"] || "",
              containerNumber: row["Container Number"] || "",
              containerSizeAndType: row["Size/Type"] || "",
              loadingPoint: row["Loading Point"] || "",
              unloadingPoint: row["Unloading Point"] || "",
              status: "Planning",
              history: [historyEntry],
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
          alert(`Successfully imported ${results.data.length} shipments.`);
        } catch (error) {
          console.error("Error importing shipments:", error);
          alert("Error importing shipments. Please check console.");
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        alert("Error parsing CSV file.");
      }
    });
    e.target.value = null; // Reset input
  };

  const filteredShipments = shipments.filter((shipment) => {
    if (selectedCompanyFilter !== "all" && shipment.companyName !== selectedCompanyFilter) {
      return false;
    }
    if (profile?.role === "warehouse_manager" && profile.warehouseLocation) {
      return shipment.returnWarehouseDetails === profile.warehouseLocation;
    }
    return true;
  });

  const handlePrint = () => {
    const content = `
      <html>
        <head>
          <title>Shipments Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #18181b; line-height: 1.5; }
            .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { margin: 0; font-size: 24px; font-weight: 600; color: #09090b; }
            .meta { color: #71717a; font-size: 12px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { text-align: left; padding: 12px 16px; border-bottom: 2px solid #e4e4e7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; font-weight: 600; background: #f4f4f5; }
            td { padding: 12px 16px; border-bottom: 1px solid #e4e4e7; font-size: 11px; color: #27272a; }
            .status { font-weight: 700; text-transform: uppercase; font-size: 9px; padding: 2px 6px; border-radius: 4px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Shipments Report ${selectedCompanyFilter !== "all" ? `- ${selectedCompanyFilter}` : ""}</h1>
            <div class="meta">Generated on ${new Date().toLocaleString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Type</th>
                <th>Company</th>
                <th>Vessel</th>
                <th>Container</th>
                <th>Loading Point</th>
                <th>Unloading Point</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredShipments
                .map(
                  (s) => `
                <tr>
                  <td>${s.trackingId}</td>
                  <td>${s.type === "local" ? "Local" : "Vessel"}</td>
                  <td>${s.companyName || "N/A"}</td>
                  <td>${s.vesselName || "N/A"}</td>
                  <td>${s.containerNumber || "N/A"}</td>
                  <td>${s.loadingPoint || "N/A"}</td>
                  <td>${s.unloadingPoint || "N/A"}</td>
                  <td>
                    <span class="status">
                      ${s.status}
                    </span>
                  </td>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
            Shipment Management
          </h2>
          <select
            className="bg-white border-2 border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-700 outline-none focus:border-orange-500 shadow-[0_4px_0_rgb(212,212,216)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(212,212,216)] transition-all cursor-pointer"
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
          >
            <option value="all">All Companies</option>
            {companiesData?.filter(c => c.type !== 'transporter').map((company) => (
              <option key={company.id} value={company.name}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white border-2 border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-sm font-bold transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)] flex items-center gap-2"
          >
            <Printer size={16} /> Print
          </button>
          {(rolePermissions[profile?.role || "transporter"]?.canCreateShipments ?? DEFAULT_PERMISSIONS[profile?.role || "transporter"]?.canCreateShipments) && (
            <>
              <label className="cursor-pointer px-4 py-2 bg-white border-2 border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-sm font-bold transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)] flex items-center gap-2">
                <Upload size={16} /> Bulk Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleBulkImport} />
              </label>
              <button
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 bg-orange-500 border-2 border-orange-700 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
              >
                + Create New Shipment
              </button>
            </>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="relative group [perspective:2000px] mb-12">
          {/* 3D Background Shadow Layer */}
          <div className="absolute inset-0 bg-zinc-300 rounded-2xl transform [transform:rotateX(8deg)_rotateY(-6deg)_translateZ(-30px)] opacity-50 transition-all duration-500 ease-out group-hover:[transform:rotateX(0deg)_rotateY(0deg)_translateZ(-5px)]"></div>
          
          {/* 3D Main Card */}
          <div className="bg-white border-2 border-zinc-200 p-8 rounded-2xl shadow-[16px_24px_40px_-8px_rgba(0,0,0,0.15),_0_4px_0_rgb(228,228,231)] transform transition-all duration-500 ease-out group-hover:[transform:rotateX(0deg)_rotateY(0deg)_translateZ(0px)] [transform:rotateX(8deg)_rotateY(-6deg)_translateZ(20px)] relative z-10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
              <div className="bg-orange-100 text-orange-600 p-2.5 rounded-xl shadow-inner">
                <Package size={24} />
              </div>
              <div>
                <h3 className="text-zinc-900 font-bold text-xl">New Shipment Planning</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Configure vessel or local shipment details</p>
              </div>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Shipment Type</label>
              <select
                className="w-full bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                value={newShipment.type}
                onChange={(e) => setNewShipment({ ...newShipment, type: e.target.value })}
              >
                <option value="vessel">Vessel / Port Base</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Company *</label>
              <select
                className="w-full bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                value={newShipment.companyName || ""}
                onChange={(e) =>
                  setNewShipment({
                    ...newShipment,
                    companyName: e.target.value,
                  })
                }
              >
                <option value="">Select Company</option>
                {companiesData?.filter(c => c.type !== 'transporter').map((company) => (
                  <option key={company.id} value={company.name}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-700">Loading Point *</label>
              <SearchableSelect
                options={locationOptions}
                value={newShipment.loadingPoint}
                onChange={(val) => setNewShipment({ ...newShipment, loadingPoint: val })}
                placeholder="Search Loading Point..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-700">Unloading Point *</label>
              <SearchableSelect
                options={locationOptions}
                value={newShipment.unloadingPoint}
                onChange={(val) => setNewShipment({ ...newShipment, unloadingPoint: val })}
                placeholder="Search Unloading Point..."
              />
            </div>
          </div>

          {newShipment.type === "vessel" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Vessel Name</label>
                  <select
                    className="w-full bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                    value={newShipment.vesselName || ""}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        vesselName: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Vessel</option>
                    {[...new Set(vessels.map(v => v.name))].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Arrival Date</label>
                  <input
                    className="w-full bg-white border border-zinc-200 rounded px-4 py-2 text-sm text-zinc-900 focus:border-orange-500 outline-none"
                    placeholder="Arrival Date"
                    type="date"
                    value={newShipment.arrivalDate || ""}
                    onChange={(e) =>
                      setNewShipment({
                        ...newShipment,
                        arrivalDate: e.target.value,
                      })
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLoadData}
                  className="px-6 py-2 bg-zinc-800 border-2 border-black text-white rounded-xl font-bold hover:bg-zinc-900 transition-all shadow-[0_4px_0_rgb(0,0,0)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(0,0,0)] active:translate-y-0 active:shadow-[0_0px_0_rgb(0,0,0)]"
                >
                  Load Data
                </button>
              </div>

              {selectedVesselData && selectedVesselData.bls && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h4 className="text-sm font-medium text-zinc-900">Available Containers</h4>
                    {selectedContainers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowCreatePopup(true)}
                        className="px-4 py-1.5 bg-orange-500 border-2 border-orange-700 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
                      >
                        Create Shipment ({selectedContainers.length})
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-[0_4px_0_rgb(228,228,231)]">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                          <th className="px-4 py-2 w-10 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const allAvailable = [];
                                  selectedVesselData.bls.forEach(bl => {
                                    bl.containers?.forEach(c => {
                                      if (!shipments.some(s => s.vesselName === selectedVesselData.name && s.blNumber === bl.blNumber && s.containerNumber === c.containerNumber)) {
                                        allAvailable.push({ id: `${bl.blNumber}-${c.containerNumber}`, blNumber: bl.blNumber, container: c });
                                      }
                                    });
                                  });
                                  setSelectedContainers(allAvailable);
                                } else {
                                  setSelectedContainers([]);
                                }
                              }}
                              checked={
                                selectedContainers.length > 0 && 
                                selectedContainers.length === selectedVesselData.bls.reduce((acc, bl) => acc + (bl.containers?.filter(c => !shipments.some(s => s.vesselName === selectedVesselData.name && s.blNumber === bl.blNumber && s.containerNumber === c.containerNumber)).length || 0), 0)
                              }
                            />
                          </th>
                          <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">BL Number</th>
                          <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Container No</th>
                          <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Size</th>
                          <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Weight</th>
                          <th className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {selectedVesselData.bls.flatMap((bl) => 
                          bl.containers?.map((container, cIdx) => {
                            const isAlreadyCreated = shipments.some(s => s.vesselName === selectedVesselData.name && s.blNumber === bl.blNumber && s.containerNumber === container.containerNumber);
                            const isSelected = selectedContainers.some(c => c.id === `${bl.blNumber}-${container.containerNumber}`);
                            return (
                              <tr key={`${bl.blNumber}-${cIdx}`} className={cn(isAlreadyCreated ? "bg-zinc-50 opacity-60" : "hover:bg-zinc-50")}>
                                <td className="px-4 py-2 text-center">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-zinc-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                                    disabled={isAlreadyCreated}
                                    checked={isSelected}
                                    onChange={() => handleContainerToggle(bl.blNumber, container)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm text-zinc-900 font-medium">{bl.blNumber}</td>
                                <td className="px-4 py-2 text-sm text-zinc-900 font-mono">{container.containerNumber}</td>
                                <td className="px-4 py-2 text-sm text-zinc-600">{container.size || "-"}</td>
                                <td className="px-4 py-2 text-sm text-zinc-600">{container.weight || "-"}</td>
                                <td className="px-4 py-2 text-sm">
                                  {isAlreadyCreated ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-800">
                                      Created
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                      Available
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={handleCreateLocalShipment}
                className="px-6 py-2 bg-orange-500 border-2 border-orange-700 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
              >
                Create Local Shipment
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewShipment({
                  trackingId: `SHP-${Math.floor(Math.random() * 100000)}`,
                  status: "Planning",
                  type: "vessel",
                  vesselName: "",
                  arrivalDate: "",
                  loadingPoint: "",
                  unloadingPoint: "",
                });
                setSelectedContainers([]);
                setSelectedVesselData(null);
              }}
              className="px-6 py-2.5 bg-white border-2 border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
            >
              Cancel
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Shipment Creation Popup */}
      {showCreatePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-zinc-900">Confirm Shipment Creation</h3>
              <button onClick={() => setShowCreatePopup(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-zinc-600 text-sm mb-4">
              You are about to create shipments for the following {selectedContainers.length} containers:
            </p>
            
            <div className="flex-1 overflow-y-auto min-h-[200px] border border-zinc-200 rounded-lg bg-zinc-50 p-2 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedContainers.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded border border-zinc-200 shadow-sm flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Container</span>
                      <span className="text-sm font-mono font-bold text-zinc-900">{item.container.containerNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-zinc-500 uppercase">BL Number</span>
                      <span className="text-sm text-zinc-700">{item.blNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setShowCreatePopup(false)}
                className="px-4 py-2 text-sm font-bold text-zinc-600 bg-white border-2 border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateShipments}
                className="px-6 py-2 text-sm font-bold text-white bg-orange-500 border-2 border-orange-700 hover:bg-orange-600 rounded-xl transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
              >
                Confirm & Create
              </button>
            </div>
          </div>
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
            companiesData={companiesData}
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
          ...(DEFAULT_PERMISSIONS[role] || {}),
          ...(rolePermissions[role] || {}),
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
    "accountant",
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

      <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-[0_4px_0_rgb(228,228,231)]">
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
                      value={rolePermissions[role]?.[section] ?? DEFAULT_PERMISSIONS[role]?.[section] ?? "none"}
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
                    checked={rolePermissions[role]?.canCreateShipments ?? DEFAULT_PERMISSIONS[role]?.canCreateShipments ?? false}
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
                    checked={rolePermissions[role]?.canManageUsers ?? DEFAULT_PERMISSIONS[role]?.canManageUsers ?? false}
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
                    checked={rolePermissions[role]?.canManageVessels ?? DEFAULT_PERMISSIONS[role]?.canManageVessels ?? false}
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
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]">
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
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-xl shadow-[0_4px_0_rgb(228,228,231)]">
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

const ReportsView = ({ shipments, profile, companiesData, setActiveTab }) => {
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showUnbilledOnly, setShowUnbilledOnly] = useState(true);

  // Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedIssuerId, setSelectedIssuerId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: `INV-${Math.floor(Math.random() * 100000)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    salesTaxPercent: 0,
    withholdingTaxAmount: 0,
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    paymentTerms: "15 Days",
    termsConditions: "1. Payment is due within the stated Payment Terms.\n2. Please include the invoice number on your payment.",
    latePaymentCharges: "Late payment is subject to 2% charge per month."
  });
  const [isGenerating, setIsGenerating] = useState(false);

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
    const matchesBilling = showUnbilledOnly ? !s.invoiced : true;

    return (
      matchesTransporter &&
      matchesWarehouse &&
      matchesCompany &&
      matchesStartDate &&
      matchesEndDate &&
      matchesBilling
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

  const handleGenerateInvoice = async () => {
    if (filteredShipments.length === 0) {
      alert("No shipments to invoice.");
      return;
    }
    
    setIsGenerating(true);

    let issuer = null;
    if (profile?.role === "transporter") {
      issuer = {
        name: profile.companyName || profile.displayName || "Transporter",
        address: profile.address || "",
        ntn: profile.ntn || "",
        contactNumber: profile.contactNumber || "",
        email: profile.email || "",
        logoUrl: profile.logoUrl || "",
      };
    } else {
      issuer = companiesData.find(c => c.id === selectedIssuerId) || {
        name: "Vital Logistics",
        address: "123 Shipping Lane, Port City",
        ntn: "1234567-8",
        contactNumber: "+1 234 567 8900",
        email: "contact@vitallogistics.com",
        logoUrl: "https://placehold.co/150x50/png?text=LOGO",
      };
    }

    const customer = companiesData.find(c => c.id === selectedCustomerId) || {
      name: selectedCompanies.length === 1 ? selectedCompanies[0] : 'Multiple Companies / General',
      address: "",
      ntn: "",
      contactNumber: "",
      email: "",
    };

    const subtotal = filteredShipments.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const salesTaxAmount = subtotal * (parseFloat(invoiceDetails.salesTaxPercent) || 0) / 100;
    const withholdingTaxAmount = parseFloat(invoiceDetails.withholdingTaxAmount) || 0;
    const grandTotal = subtotal + salesTaxAmount - withholdingTaxAmount;

    let tableRowsHtml = "";
    filteredShipments.forEach((s) => {
      const shipmentDate = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString();
      tableRowsHtml += `
        <tr>
          <td>${shipmentDate}</td>
          <td>${s.trackingId}</td>
          <td>${s.companyName || "N/A"}</td>
          <td>${s.transporterName || "N/A"}</td>
          <td>${s.vehicleNumber || "N/A"}</td>
          <td>${s.containerNumber || "N/A"}</td>
          <td>${s.containerSizeAndType || "N/A"}</td>
          <td>${s.loadingPoint || "N/A"}</td>
          <td>${s.unloadingPoint || "N/A"}</td>
          <td>${s.status}</td>
          <td class="cost">${(s.totalCost || 0).toLocaleString()}</td>
        </tr>
      `;
    });

    const content = `
      <html>
        <head>
          <title>Invoice ${invoiceDetails.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #18181b; line-height: 1.5; background: #fafaf9; }
            .invoice-wrapper { width: 210mm; min-height: 297mm; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-top: 8px solid #ea580c; border-bottom: 8px solid #1e3a8a; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-area { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; }
            .logo-area img { max-height: 60px; max-width: 180px; object-fit: contain; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { margin: 0; font-size: 32px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.1em; }
            .meta-grid { display: grid; grid-template-columns: auto auto; gap: 8px 24px; margin-top: 16px; text-align: right; justify-content: end; }
            .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #c2410c; font-weight: 700; }
            .meta-value { font-size: 12px; font-weight: 700; color: #18181b; }
            
            .addresses { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 40px; }
            .issue-to, .bill-to { flex: 1; padding: 20px; border-radius: 12px; }
            .issue-to { background: #eff6ff; border: 1px solid #e0e7ff; border-left: 4px solid #1e3a8a; }
            .bill-to { background: #fff7ed; border: 1px solid #ffedd5; border-left: 4px solid #ea580c; }
            .issue-to h3, .bill-to h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; font-weight: 700; }
            .issue-to h3 { color: #1e3a8a; }
            .bill-to h3 { color: #c2410c; }
            .issue-to p.title, .bill-to p.title { margin: 2px 0; font-size: 16px; font-weight: 800; }
            .issue-to p.title { color: #1e3a8a; }
            .bill-to p.title { color: #ea580c; }
            .issue-to .details, .bill-to .details { font-size: 12px; color: #52525b; font-weight: 500; margin: 4px 0 0 0; }

            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; table-layout: fixed; }
            th { text-align: left; padding: 6px 4px; border-bottom: 2px solid #cbd5e1; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; font-weight: 700; background: #1e3a8a; }
            td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 8px; color: #334155; font-weight: 500; line-height: 1.2; word-wrap: break-word; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .cost { font-family: monospace; font-weight: 700; text-align: right; color: #0f172a; }
            th.cost-header { text-align: right; }
            
            .bottom-section { display: flex; justify-content: space-between; margin-top: 30px; gap: 20px; page-break-inside: avoid; flex-wrap: wrap; }
            .payment-info { flex: 1; min-width: 250px; padding: 20px; border: 1px solid #e0e7ff; border-radius: 12px; background: #eff6ff; font-size: 11px; color: #1e3a8a; }
            .payment-info h4 { margin: 0 0 12px 0; font-size: 10px; text-transform: uppercase; color: #4f46e5; font-weight: 700; }
            .payment-grid { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; font-weight: 500; }
            .payment-grid strong { color: #1e3a8a; font-weight: 800; }
            
            .totals { width: 320px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #475569; }
            .total-row.tax-row { color: #64748b; }
            .total-row.grand-total { border-bottom: none; font-size: 18px; font-weight: 800; padding: 16px; margin-top: 8px; background: linear-gradient(135deg, #1e3a8a, #312e81); color: white; border-radius: 8px; }
            .total-row.grand-total .cost { color: white; }
            
            .terms { margin-top: 40px; font-size: 11px; color: #64748b; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 2px solid #94a3b8; page-break-inside: avoid; }
            .terms h4 { margin: 0 0 6px 0; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
            .terms p { margin: 2px 0; white-space: pre-wrap; font-weight: 500; }
            
            .signatures { margin-top: 60px; display: flex; justify-content: space-between; padding-top: 40px; page-break-inside: avoid; }
            .sig-line { width: 220px; border-top: 2px solid #1e3a8a; text-align: center; padding-top: 8px; font-size: 11px; color: #1e3a8a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; padding-top: 20px; clear: both; font-weight: 600; page-break-inside: avoid; }

            @page { size: A4 portrait; margin: 10mm; }
            @media print {
              body { padding: 0 !important; margin: 0; background: white !important; }
              .invoice-wrapper { width: 100%; box-shadow: none; border-top: 0; border-bottom: 0; padding: 10px; margin: 0; min-height: auto; }
              .no-print { display: none; }
              tr { break-inside: avoid; }
              .total-row.grand-total { background: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              th { background: #1e3a8a !important; color: white !important; padding: 4px; font-size: 8px; text-transform: uppercase; border-bottom: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              td { padding: 4px; font-size: 8px; line-height: 1.2; word-break: break-word; }
              .issue-to { background: #eff6ff !important; border-left: 4px solid #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .bill-to { background: #fff7ed !important; border-left: 4px solid #ea580c !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .payment-info { background: #eff6ff !important; border-color: #e0e7ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .totals { background: #f8fafc !important; border-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
          <div class="header">
            <div class="logo-area">
              ${issuer.logoUrl ? `<img src="${issuer.logoUrl}" alt="Logo" />` : ''}
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <div class="meta-grid">
                <div class="meta-label">Invoice Number</div>
                <div class="meta-value">${invoiceDetails.invoiceNumber}</div>
                <div class="meta-label">Date of Invoice</div>
                <div class="meta-value">${new Date(invoiceDetails.invoiceDate).toLocaleDateString()}</div>
                ${invoiceDetails.dueDate ? `
                <div class="meta-label">Due Date</div>
                <div class="meta-value">${new Date(invoiceDetails.dueDate).toLocaleDateString()}</div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <div class="addresses">
            <div class="issue-to">
              <h3>Issuer</h3>
              <p class="title">${issuer.name}</p>
              ${issuer.address ? `<p class="details">${issuer.address}</p>` : ''}
              ${issuer.ntn ? `<p class="details">NTN/STRN: ${issuer.ntn}</p>` : ''}
              ${issuer.contactNumber || issuer.email ? `<p class="details">${issuer.contactNumber ? issuer.contactNumber : ''} ${issuer.contactNumber && issuer.email ? '|' : ''} ${issuer.email ? issuer.email : ''}</p>` : ''}
            </div>
            <div class="bill-to">
              <h3>Bill To</h3>
              <p class="title">${customer.name}</p>
              ${customer.address ? `<p class="details">${customer.address}</p>` : ''}
              ${customer.ntn ? `<p class="details">NTN/STRN: ${customer.ntn}</p>` : ''}
              ${customer.contactNumber || customer.email ? `<p class="details">${customer.contactNumber ? customer.contactNumber : ''} ${customer.contactNumber && customer.email ? '|' : ''} ${customer.email ? customer.email : ''}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>TRACKING ID</th>
                <th>COMPANY</th>
                <th>TRANSPORTER</th>
                <th>VEHICLE</th>
                <th>CONTAINER</th>
                <th>SIZE/TYPE</th>
                <th>LOADING POINT</th>
                <th>UNLOADING POINT</th>
                <th>STATUS</th>
                <th class="cost-header">COST</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          
          <div class="bottom-section">
            <div class="payment-info">
              <h4>Payment Details</h4>
              <div class="payment-grid">
                ${invoiceDetails.bankName ? `<div>Bank Name:</div><strong>${invoiceDetails.bankName}</strong>` : ''}
                ${invoiceDetails.accountTitle ? `<div>Account Title:</div><strong>${invoiceDetails.accountTitle}</strong>` : ''}
                ${invoiceDetails.accountNumber ? `<div>Account Number:</div><strong>${invoiceDetails.accountNumber}</strong>` : ''}
                ${invoiceDetails.paymentTerms ? `<div>Payment Terms:</div><strong>${invoiceDetails.paymentTerms}</strong>` : ''}
              </div>
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span class="cost">PKR ${subtotal.toLocaleString()}</span>
              </div>
              
              ${salesTaxAmount > 0 ? `
              <div class="total-row tax-row">
                <span>Sales Tax (${invoiceDetails.salesTaxPercent}%)</span>
                <span class="cost">PKR ${salesTaxAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              
              ${withholdingTaxAmount > 0 ? `
              <div class="total-row tax-row">
                <span>Withholding Tax</span>
                <span class="cost">- PKR ${withholdingTaxAmount.toLocaleString()}</span>
              </div>
              ` : ''}

              <div class="total-row grand-total">
                <span>Total Amount</span>
                <span class="cost">PKR ${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="terms">
            ${invoiceDetails.termsConditions ? `
            <h4>Terms & Conditions</h4>
            <p>${invoiceDetails.termsConditions}</p>
            ` : ''}
            ${invoiceDetails.latePaymentCharges ? `
            <p><em>${invoiceDetails.latePaymentCharges}</em></p>
            ` : ''}
          </div>

          <div class="signatures">
             <div class="sig-line">Prepared By</div>
             <div class="sig-line">Authorized Signature / Stamp</div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
          </div>

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

    const blob = new Blob([content], { type: "text/html" });
    const localUrl = URL.createObjectURL(blob);

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      // Fallback: If blocked by AI Studio sandbox or popup blockers, download the invoice HTML directly
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = `Invoice_${invoiceDetails.invoiceNumber || 'Report'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Mark as invoiced in Firestore
    try {
      const updatePromises = filteredShipments.map(s => 
        updateDoc(doc(db, "shipments", s.id), {
          invoiced: true,
          invoiceId: invoiceDetails.invoiceNumber,
          invoiceDate: invoiceDetails.invoiceDate || new Date().toISOString().split('T')[0],
          invoiceDueDate: invoiceDetails.dueDate || null,
          invoiceSalesTaxPercent: parseFloat(invoiceDetails.salesTaxPercent) || 0,
          invoiceWithholdingTaxAmount: parseFloat(invoiceDetails.withholdingTaxAmount) || 0,
          updatedAt: serverTimestamp()
        })
      );
      
      const customerNameObj = companiesData?.customers?.find(c => c.id === invoiceDetails.customer);
      updatePromises.push(setDoc(doc(db, "invoices", invoiceDetails.invoiceNumber), {
        id: invoiceDetails.invoiceNumber,
        type: "bulk",
        invoiceDate: invoiceDetails.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: invoiceDetails.dueDate || null,
        customerName: customerNameObj ? customerNameObj.name : "N/A",
        totalAmount: grandTotal,
        shipmentIds: filteredShipments.map(s => s.id),
        paymentStatus: "Pending",
        payments: [],
        createdAt: serverTimestamp(),
        createdBy: profile?.uid
      }));

      await Promise.all(updatePromises);
      setShowInvoiceModal(false);
      if (setActiveTab) setActiveTab("Invoices");
    } catch (error) {
      console.error("Error updating shipments:", error);
      alert("Error marking shipments as invoiced. Please check permissions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const content = `
      <html>
        <head>
          <title>Logistics Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fafaf9; }
            .report-wrapper { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-top: 8px solid #ea580c; border-bottom: 8px solid #1e3a8a; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { margin: 0; font-size: 28px; font-weight: 800; color: #1e3a8a; }
            .meta { color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 500; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
            .stat-card { border: 1px solid #e0e7ff; padding: 20px; border-radius: 12px; background: #eff6ff; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
            .stat-card:nth-child(4) { background: linear-gradient(135deg, #1e3a8a, #312e81); border: none; color: white; }
            .stat-card:nth-child(4) .stat-label { color: #c7d2fe; }
            .stat-card:nth-child(4) .stat-value { color: white; }
            .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; margin-bottom: 6px; font-weight: 700; }
            .stat-value { font-size: 20px; font-weight: 800; color: #1e3a8a; }
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th { text-align: left; padding: 12px 16px; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: white; font-weight: 700; background: #1e3a8a; }
            td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155; font-weight: 500; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .status { font-weight: 800; text-transform: uppercase; font-size: 9px; padding: 4px 8px; border-radius: 6px; display: inline-block; }
            .status-completed { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
            .status-transit { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
            .status-pending { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
            .cost { font-family: monospace; font-weight: 700; color: #0f172a; }
            @media print {
              body { padding: 0; background: white; }
              .report-wrapper { box-shadow: none; border: none; padding: 0; }
              .no-print { display: none; }
              .stat-card { break-inside: avoid; background: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .stat-card:nth-child(4) { background: #1e3a8a !important; color: white !important; }
              .stat-card:nth-child(4) .stat-label { color: white !important; }
              th { background: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .status-completed { background: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .status-transit { background: #dbeafe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .status-pending { background: #ffedd5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report-wrapper">
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
                <th>Loading Point</th>
                <th>Unloading Point</th>
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
                  <td>${s.loadingPoint || "N/A"}</td>
                  <td>${s.unloadingPoint || "N/A"}</td>
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
          </div>

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

    const blob = new Blob([content], { type: "text/html" });
    const localUrl = URL.createObjectURL(blob);
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = `Logistics_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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
      "Loading Point",
      "Unloading Point",
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
      s.loadingPoint || "N/A",
      s.unloadingPoint || "N/A",
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
              className="px-3 py-1.5 bg-white text-zinc-600 border-2 border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
            >
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white text-zinc-600 border-2 border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
            >
              Print PDF
            </button>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3 py-1.5 bg-orange-600 border-2 border-orange-700 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
            >
              Generate Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="unbilledOnly"
          checked={showUnbilledOnly}
          onChange={(e) => setShowUnbilledOnly(e.target.checked)}
          className="rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
        />
        <label htmlFor="unbilledOnly" className="text-sm text-zinc-700 font-medium cursor-pointer">
          Show Unbilled Shipments Only
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)]">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            Total Shipments
          </p>
          <p className="text-2xl font-bold text-zinc-900 tracking-tight">
            {totalShipments}
          </p>
        </div>
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)]">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            Completed
          </p>
          <p className="text-2xl font-bold text-green-600 tracking-tight">
            {completedShipments}
          </p>
        </div>
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)]">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            In Transit
          </p>
          <p className="text-2xl font-bold text-blue-600 tracking-tight">
            {inTransitShipments}
          </p>
        </div>
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)]">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
            Total Cost
          </p>
          <p className="text-2xl font-bold text-orange-600 tracking-tight">
            PKR {totalCost.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden overflow-x-auto shadow-[0_4px_0_rgb(228,228,231)]">
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
                Loading Point
              </th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                Unloading Point
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
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {s.loadingPoint || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {s.unloadingPoint || "N/A"}
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
                  colSpan={10}
                  className="px-6 py-12 text-center text-zinc-400 font-mono text-xs uppercase tracking-widest"
                >
                  No report data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Generation Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 shrink-0">
              <h3 className="font-bold text-zinc-900">Generate Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto w-full custom-scrollbar">
              
              <div className="grid grid-cols-2 gap-4">
                {profile?.role !== "transporter" && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Select Issuer (Our Company)</label>
                    <select
                      value={selectedIssuerId}
                      onChange={(e) => setSelectedIssuerId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Select Issuer...</option>
                      {companiesData.filter(c => c.type === 'vital company').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className={profile?.role === "transporter" ? "col-span-2" : ""}>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Select Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select Customer...</option>
                    {profile?.role === "transporter" ? (
                      // Transporters mainly bill Vital Companies
                      companiesData.filter(c => c.type === 'vital company').map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Vital)</option>
                      ))
                    ) : (
                      // Admins can bill Local Companies or Transporters
                      companiesData.filter(c => c.type === 'local company' || c.type === 'transporter').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type === 'transporter' ? 'Transporter' : 'Local'})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceDetails.invoiceNumber}
                    onChange={e => setInvoiceDetails({...invoiceDetails, invoiceNumber: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDetails.invoiceDate}
                    onChange={e => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceDetails.dueDate}
                    onChange={e => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Sales Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={invoiceDetails.salesTaxPercent}
                    onChange={e => setInvoiceDetails({...invoiceDetails, salesTaxPercent: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Withholding Tax (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={invoiceDetails.withholdingTaxAmount}
                    onChange={e => setInvoiceDetails({...invoiceDetails, withholdingTaxAmount: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-zinc-800 text-sm border-b pb-1">Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Meezan Bank"
                      value={invoiceDetails.bankName}
                      onChange={e => setInvoiceDetails({...invoiceDetails, bankName: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Account Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Vital Logistics"
                      value={invoiceDetails.accountTitle}
                      onChange={e => setInvoiceDetails({...invoiceDetails, accountTitle: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Account Number / IBAN</label>
                    <input
                      type="text"
                      placeholder="e.g. PK00 MEZN..."
                      value={invoiceDetails.accountNumber}
                      onChange={e => setInvoiceDetails({...invoiceDetails, accountNumber: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Payment Terms</label>
                    <input
                      type="text"
                      placeholder="e.g. 15 Days"
                      value={invoiceDetails.paymentTerms}
                      onChange={e => setInvoiceDetails({...invoiceDetails, paymentTerms: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-zinc-800 text-sm border-b pb-1">Additional Notes</h4>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={invoiceDetails.termsConditions}
                    onChange={e => setInvoiceDetails({...invoiceDetails, termsConditions: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Late Payment Charges</label>
                  <input
                    type="text"
                    value={invoiceDetails.latePaymentCharges}
                    onChange={e => setInvoiceDetails({...invoiceDetails, latePaymentCharges: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg mt-4">
                <p className="text-xs text-orange-800">
                  <strong>Note:</strong> Generating this invoice will mark {filteredShipments.length} shipment(s) as invoiced. They will no longer appear in the unbilled reports.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={isGenerating || filteredShipments.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? "Generating..." : "Generate & Mark as Invoiced"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MyCompanyView = ({ profile, companiesData }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    ntn: "",
    contactNumber: "",
    documentUrl: "",
    status: "Pending"
  });
  const [companyId, setCompanyId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.uid && companiesData) {
      const myCompany = companiesData.find(c => c.transporterId === profile.uid);
      if (myCompany) {
        setCompanyId(myCompany.id);
        setFormData({
          name: myCompany.name || "",
          address: myCompany.address || "",
          ntn: myCompany.ntn || "",
          contactNumber: myCompany.contactNumber || "",
          documentUrl: myCompany.documentUrl || "",
          status: myCompany.status || "Pending"
        });
      }
    }
  }, [profile, companiesData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "companies", companyId), {
        ...formData,
        updatedAt: Timestamp.now()
      });
      alert("Company details updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to update company details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!companyId) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded shadow mx-4 mt-4">No company profile found dynamically linked to your account.</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <div className="mb-6 flex space-x-4 justify-between items-center bg-white p-6 rounded shadow border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Company Profile</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your transporter identity and business details.</p>
        </div>
        <span className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider ${formData.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
          {formData.status}
        </span>
      </div>
      <div className="space-y-4 bg-white p-6 rounded shadow border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
          <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NTN / Registration Number</label>
          <input type="text" name="ntn" value={formData.ntn} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document URL (PDF/Image Link)</label>
          <input type="text" name="documentUrl" value={formData.documentUrl} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="https://..." />
        </div>
        <div className="pt-4 text-right">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 font-medium transition-colors shadow-sm"
          >
            {isSaving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CompaniesView = ({ companiesData }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    ntn: "",
    contactNumber: "",
    email: "",
    logoUrl: "",
    type: "customer", // 'customer' or 'billing' (Our Company)
  });

  const handleOpenModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name || "",
        address: company.address || "",
        ntn: company.ntn || "",
        contactNumber: company.contactNumber || "",
        email: company.email || "",
        logoUrl: company.logoUrl || "",
        type: company.type || "local company",
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: "",
        address: "",
        ntn: "",
        contactNumber: "",
        email: "",
        logoUrl: "",
        type: "local company",
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateDoc(doc(db, "companies", editingCompany.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "companies"), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving company:", error);
      alert("Error saving company details.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this company?")) {
      try {
        await deleteDoc(doc(db, "companies", id));
      } catch (error) {
        console.error("Error deleting company:", error);
        alert("Error deleting company.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-zinc-900 italic font-serif">
          Company Management
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-[0_4px_0_rgb(0,0,0)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(0,0,0)] active:translate-y-0 active:shadow-[0_0px_0_rgb(0,0,0)]"
        >
          Add Company
        </button>
      </div>

      <div className="bg-white border-2 border-zinc-200 rounded-xl overflow-hidden shadow-[0_4px_0_rgb(228,228,231)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b-2 border-zinc-200">
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">Company Name</th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">Type</th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">NTN / STRN</th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500">Contact</th>
              <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-zinc-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {companiesData.map((company) => (
              <tr key={company.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain border border-zinc-200" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <Building2 size={16} />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-zinc-900">{company.name}</div>
                      <div className="text-xs text-zinc-500">{company.email || "No email"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono uppercase font-bold",
                    company.type === 'vital company' ? "bg-orange-100 text-orange-700" : (company.type === 'transporter' ? 'bg-zinc-100 text-zinc-700' : "bg-blue-100 text-blue-700")
                  )}>
                    {company.type === 'vital company' ? 'Vital Company' : (company.type === 'transporter' ? 'Transporter' : 'Local Company')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{company.ntn || "N/A"}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">{company.contactNumber || "N/A"}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(company)}
                      className="p-2 text-zinc-400 hover:text-orange-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(company.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companiesData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-mono text-xs uppercase tracking-widest">
                  No companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <h3 className="font-bold text-zinc-900">{editingCompany ? "Edit Company" : "Add Company"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Company Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="vital company">Vital Company</option>
                  <option value="transporter">Transporter</option>
                  <option value="local company">Local Company</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Company Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">NTN / STRN</label>
                  <input
                    type="text"
                    value={formData.ntn}
                    onChange={e => setFormData({...formData, ntn: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={e => setFormData({...formData, contactNumber: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors shadow-sm"
                >
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

      <div className="bg-white border-2 border-zinc-200 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)] overflow-hidden">
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

          {profile?.role === "transporter" && (
            <>
              <div className="pt-6 border-t border-zinc-100">
                <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-900 mb-6">
                  Company Details
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900 resize-none h-20"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                        NTN / STRN
                      </label>
                      <input
                        type="text"
                        value={ntn}
                        onChange={(e) => setNtn(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                      Company Logo URL
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

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

      <div className="mt-8 bg-white border-2 border-zinc-200 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)] overflow-hidden">
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

      <div className="mt-8 bg-white border-2 border-zinc-200 rounded-2xl shadow-[0_4px_0_rgb(228,228,231)] overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-900">
            App Installation
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">Install App</p>
              <p className="text-xs text-zinc-500 mt-1">
                Download this app to your Desktop or Android device for quick access.
              </p>
            </div>
            <button
              onClick={async () => {
                const promptEvent = window.deferredPrompt;
                if (!promptEvent) {
                  alert("Installation is not supported on this browser, or the app is already installed.");
                  return;
                }
                promptEvent.prompt();
                const result = await promptEvent.userChoice;
                if (result.outcome === 'accepted') {
                  console.log('User accepted the install prompt');
                } else {
                  console.log('User dismissed the install prompt');
                }
                window.deferredPrompt = null;
              }}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Download App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersView = ({ users, profile, shipments = [] }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingTemp, setIsAddingTemp] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    role: "transporter",
    displayName: "",
    warehouseLocation: "",
    assignedLocation: "",
  });
  const [newTempData, setNewTempData] = useState({
    username: "",
    password: "",
    role: "transporter",
    displayName: "",
    warehouseLocation: "",
    assignedLocation: "",
  });
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState({ isOpen: false, type: "", message: "", onConfirm: null });

  const closeModal = () => setModalState({ isOpen: false, type: "", message: "", onConfirm: null });

  const calculateTransporterRating = (uid) => {
    const transporterShipments = shipments.filter(s => s.transporterId === uid && s.status === "Completed");
    if (transporterShipments.length === 0) return null;

    let totalScore = 0;
    transporterShipments.forEach(s => {
      let score = 5;
      if (s.hasIncident) score -= 3;
      if (s.demurrageDays > 0 || s.detentionDays > 0) score -= 1;
      if (s.excessWeightCost > 0) score -= 1;
      totalScore += Math.max(1, score);
    });

    return (totalScore / transporterShipments.length).toFixed(1);
  };

  const handleCreateUser = async () => {
    if (!newUserData.email) return;
    if (newUserData.role === "admin" && profile?.role !== "admin") {
      setModalState({ isOpen: true, type: "alert", message: "You do not have permission to create an admin." });
      return;
    }
    if (newUserData.role === "receiver" && !newUserData.assignedLocation) {
      setModalState({ isOpen: true, type: "alert", message: "Please select an assigned location for the receiver." });
      return;
    }
    if (newUserData.role === "warehouse_manager" && !newUserData.warehouseLocation) {
      setModalState({ isOpen: true, type: "alert", message: "Please select a warehouse location for the warehouse manager." });
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
        assignedLocation:
          newUserData.role === "receiver"
            ? newUserData.assignedLocation
            : null,
        createdAt: Timestamp.now(),
      });

      if (newUserData.role === "transporter") {
        await addDoc(collection(db, "companies"), {
          name: newUserData.displayName || newUserData.email,
          email: newUserData.email,
          address: "",
          ntn: "",
          contactNumber: "",
          logoUrl: "",
          type: "transporter",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      setIsAdding(false);
      setNewUserData({
        email: "",
        role: "transporter",
        displayName: "",
        warehouseLocation: "",
        assignedLocation: "",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "users");
    }
  };

  const handleCreateTempUser = async () => {
    if (!newTempData.username || !newTempData.password) return;
    if (newTempData.role === "admin" && profile?.role !== "admin") {
      setModalState({ isOpen: true, type: "alert", message: "You do not have permission to create an admin." });
      return;
    }
    if (newTempData.role === "receiver" && !newTempData.assignedLocation) {
      setModalState({ isOpen: true, type: "alert", message: "Please select an assigned location for the receiver." });
      return;
    }
    if (newTempData.role === "warehouse_manager" && !newTempData.warehouseLocation) {
      setModalState({ isOpen: true, type: "alert", message: "Please select a warehouse location for the warehouse manager." });
      return;
    }
    if (newTempData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    let secondaryApp;
    try {
      // Use a secondary app instance to create the user without signing out the admin
      secondaryApp = getApps().find(app => app.name === "SecondaryApp") || initializeApp(firebaseConfig, "SecondaryApp");
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
        assignedLocation:
          newTempData.role === "receiver"
            ? newTempData.assignedLocation
            : null,
        isTemporary: true,
        createdAt: Timestamp.now(),
      });

      if (newTempData.role === "transporter") {
        await addDoc(collection(db, "companies"), {
          name: newTempData.displayName || newTempData.username,
          email: email,
          address: "",
          ntn: "",
          contactNumber: "",
          logoUrl: "",
          documentUrl: "",
          type: "transporter",
          status: "Pending",
          transporterId: uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      await signOut(secondaryAuth);

      setIsAddingTemp(false);
      setNewTempData({
        username: "",
        password: "",
        role: "transporter",
        displayName: "",
        warehouseLocation: "",
        assignedLocation: "",
      });
      setModalState({ isOpen: true, type: "alert", message: `Temporary user ${newTempData.username} created successfully!` });
    } catch (err) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError(
          "Email/Password Login is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.",
        );
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This ID is already in use. Please choose a different one.");
      } else {
        setError(err.message || "Failed to create temporary user");
      }
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.error("Error deleting secondary app:", e);
        }
      }
    }
  };

  const handleDeleteUser = async (uid, role) => {
    if (role === "admin" && profile?.role !== "admin") {
      setModalState({ isOpen: true, type: "alert", message: "You do not have permission to remove an admin." });
      return;
    }
    setModalState({
      isOpen: true,
      type: "confirm",
      message: "Are you sure you want to remove this user?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", uid));
          closeModal();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, "users");
          closeModal();
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">
              {modalState.type === "confirm" ? "Confirm Action" : "Notice"}
            </h3>
            <p className="text-zinc-600 text-sm mb-6">{modalState.message}</p>
            <div className="flex justify-end gap-3">
              {modalState.type === "confirm" && (
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={modalState.type === "confirm" ? modalState.onConfirm : closeModal}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
              >
                {modalState.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
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
            className="flex items-center gap-2 bg-orange-500 border-2 border-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
          >
            <Users size={16} /> Create Temp ID
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-white border-2 border-zinc-200 text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-all shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
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
            {newTempData.role === "receiver" && (
              <SearchableSelect
                options={locationOptions}
                value={newTempData.assignedLocation}
                onChange={(val) => setNewTempData({ ...newTempData, assignedLocation: val })}
                placeholder="Select Receiver Location"
              />
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
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-2xl space-y-4 shadow-[0_4px_0_rgb(228,228,231)]">
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
            {newUserData.role === "receiver" && (
              <SearchableSelect
                options={locationOptions}
                value={newUserData.assignedLocation}
                onChange={(val) => setNewUserData({ ...newUserData, assignedLocation: val })}
                placeholder="Select Receiver Location"
              />
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
            className="bg-white border-2 border-zinc-200 p-6 rounded-2xl relative group shadow-[0_4px_0_rgb(228,228,231)] hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(228,228,231)] transition-all"
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
                <h4 className="text-zinc-900 font-medium flex items-center gap-2">
                  {u.displayName || "Unnamed User"}
                  {u.role === "transporter" && (
                    <span className="flex items-center gap-1 text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">
                      <Star size={10} className="fill-orange-500 text-orange-500" />
                      {calculateTransporterRating(u.uid) || "N/A"}
                    </span>
                  )}
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
                {u.role === "receiver" && u.assignedLocation && (
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">
                    {u.assignedLocation}
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
  const [companiesData, setCompaniesData] = useState([]);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_PERMISSIONS);
  const [globalMessage, setGlobalMessage] = useState("");

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

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
          const data = snapshot.data();
          const merged = { ...DEFAULT_PERMISSIONS };
          for (const role in data) {
            merged[role] = { ...(DEFAULT_PERMISSIONS[role] || {}), ...data[role] };
          }
          setRolePermissions(merged);
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
            orderBy("updatedAt", "desc")
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
            allShipments.filter((s) => 
              (s.unloadingPoint && s.unloadingPoint === profile.assignedLocation) || 
              (s.unloadingLocation && s.unloadingLocation === profile.assignedLocation)
            ),
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

    const unsubCompanies = onSnapshot(
      collection(db, "companies"),
      (snapshot) => {
        setCompaniesData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "companies"),
    );

    const complaintsQuery = profile.role === "admin"
      ? collection(db, "complaints")
      : query(collection(db, "complaints"), where("createdBy", "==", user.uid));

    const unsubComplaints = onSnapshot(
      complaintsQuery,
      (snapshot) => {
        setComplaints(snapshot.docs.map((doc) => doc.data()));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "complaints"),
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
      unsubCompanies();
      unsubComplaints();
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

  const handleSendMessage = async (e, attachment = null, overrideText = null) => {
    if (e) e.preventDefault();
    const messageText = overrideText !== null ? overrideText : newMessage.trim();
    if (!messageText && !attachment || !activeChat || !user) return;

    if (overrideText === null) setNewMessage("");

    try {
      const messageId = doc(
        collection(db, "chats", activeChat.id, "messages"),
      ).id;
      const messageData = {
        id: messageId,
        chatId: activeChat.id,
        senderId: user.uid,
        text: messageText,
        attachment: attachment || null,
        createdAt: Timestamp.now(),
      };

      await setDoc(
        doc(db, "chats", activeChat.id, "messages", messageId),
        messageData,
      );
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: attachment ? (attachment.type === 'audio' ? '🎤 Voice message' : (attachment.type === 'image' ? '🖼️ Picture' : '📎 Attachment')) : messageText,
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

      setGlobalMessage("Logistics data seeded successfully!");
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
      } else if (err.code === "auth/invalid-credential") {
        setLoginError("Invalid ID or Password. Please check your credentials.");
      } else {
        setLoginError("Login failed. Please try again.");
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
      <div className="min-h-screen w-full flex bg-zinc-50">
        {/* Left Side - Image Background */}
        <div 
          className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 items-center justify-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1494412519320-aa613dfb7738?q=80&w=2070&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/40 to-transparent"></div>
          <div className="relative z-10 p-12 text-white max-w-xl mt-auto mb-12">
            <h1 className="text-4xl font-bold mb-4 font-serif italic">Industrial Logistics Redefined</h1>
            <p className="text-zinc-300 text-lg">
              Manage shipments, track vessels, and coordinate your entire supply chain with Vital ERP.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24 bg-white">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-orange-500/20">
                V
              </div>
              <span className="font-bold text-zinc-900 tracking-tighter text-3xl">
                VITAL ERP
              </span>
            </div>
            
            <h2 className="text-zinc-900 text-2xl font-bold mb-2">
              Welcome Back
            </h2>
            <p className="text-zinc-500 text-sm mb-8">
              Sign in to manage Vital Group logistics operations.
            </p>

            <div className="flex bg-zinc-100 p-1 rounded-lg mb-8">
              <button
                onClick={() => setLoginMode("google")}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
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
                  "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                  loginMode === "temp"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700",
                )}
              >
                Temporary ID
              </button>
            </div>

            {loginError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center animate-in fade-in slide-in-from-top-2">
                {loginError}
              </div>
            )}

            {loginMode === "google" ? (
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-3.5 rounded-xl font-medium hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/10"
              >
                <LogIn size={20} />
                Sign in with Google
              </button>
            ) : (
              <form onSubmit={handleTempLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-mono ml-1 font-semibold">
                    User ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your temporary ID"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3.5 px-4 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    value={tempId}
                    onChange={(e) => setTempId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-mono ml-1 font-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3.5 px-4 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 bg-orange-600 text-white py-3.5 rounded-xl font-medium hover:bg-orange-700 transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20 mt-2"
                >
                  <LogIn size={20} />
                  Sign in with ID
                </button>
              </form>
            )}

            <p className="mt-12 text-[10px] text-zinc-400 text-center uppercase tracking-widest leading-relaxed">
              Enterprise Logistics Management System
              <br />© 2026 Vital Group of Companies
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-500/30">
      {globalMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Notice</h3>
            <p className="text-zinc-600 text-sm mb-6">{globalMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setGlobalMessage("")}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
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

        <nav className="flex-1 mt-4 px-2">
          {profile?.role === "admin" && (
            <>
              <SidebarItem
                isSidebarOpen={isSidebarOpen}
                icon={LayoutDashboard}
                label="Dashboard"
                active={activeTab === "Dashboard"}
                onClick={() => setActiveTab("Dashboard")}
              />
              <SidebarItem
                isSidebarOpen={isSidebarOpen}
                icon={BarChart3}
                label="Analytics"
                active={activeTab === "Analytics"}
                onClick={() => setActiveTab("Analytics")}
              />
            </>
          )}

          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={Truck}
            label="Shipments"
            active={activeTab === "Shipments"}
            onClick={() => setActiveTab("Shipments")}
          />

          {(profile?.role === "admin" || profile?.role === "accountant") && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={FileSpreadsheet}
              label="Invoices"
              active={activeTab === "Invoices"}
              onClick={() => setActiveTab("Invoices")}
            />
          )}

          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={Paperclip}
            label="Documents"
            active={activeTab === "Documents"}
            onClick={() => setActiveTab("Documents")}
          />

          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={FileText}
            label="Reports"
            active={activeTab === "Reports"}
            onClick={() => setActiveTab("Reports")}
          />

          {profile?.role === "admin" && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={Building2}
              label="Companies"
              active={activeTab === "Companies"}
              onClick={() => setActiveTab("Companies")}
            />
          )}
          {profile?.role === "transporter" && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={Building2}
              label="My Company"
              active={activeTab === "MyCompany"}
              onClick={() => setActiveTab("MyCompany")}
            />
          )}

          {(profile?.role === "admin" || profile?.role === "transporter" || profile?.role === "accountant") && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={DollarSign}
              label="Costing"
              active={activeTab === "Costing"}
              onClick={() => setActiveTab("Costing")}
            />
          )}

          {(profile?.role === "admin" || profile?.role === "accountant") && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={FileSpreadsheet}
              label="Freight Rates"
              active={activeTab === "FreightRates"}
              onClick={() => setActiveTab("FreightRates")}
            />
          )}

          {(profile?.role === "admin" || profile?.role === "sub_admin" || profile?.role === "transporter") && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={AlertOctagon}
              label="Theft & Insurance"
              active={activeTab === "Incidents"}
              onClick={() => setActiveTab("Incidents")}
            />
          )}

          {(profile?.role === "admin" ||
            profile?.role === "clearing_agent" ||
            (rolePermissions[profile?.role || "transporter"]?.canManageVessels ?? DEFAULT_PERMISSIONS[profile?.role || "transporter"]?.canManageVessels)) && (
            <SidebarItem
              isSidebarOpen={isSidebarOpen}
              icon={Package}
              label="Vessel Planning"
              active={activeTab === "Vessels"}
              onClick={() => setActiveTab("Vessels")}
            />
          )}

          {(profile?.role === "admin" ||
            (rolePermissions[profile?.role || "transporter"]?.canManageUsers ?? DEFAULT_PERMISSIONS[profile?.role || "transporter"]?.canManageUsers)) && (
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

        <div className="p-4 border-t border-zinc-100 flex flex-col gap-1">
          {profile?.role === "admin" && (
            <button
              onClick={handleSeedData}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-orange-600 hover:bg-orange-50 transition-all rounded-xl hover:-translate-y-1 hover:shadow-sm"
            >
              <TrendingUp size={16} />
              {isSidebarOpen && <span>Seed Mock Data</span>}
            </button>
          )}
          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={MessageSquareWarning}
            label="Complaints"
            active={activeTab === "Complaints"}
            onClick={() => setActiveTab("Complaints")}
          />
          <SidebarItem
            isSidebarOpen={isSidebarOpen}
            icon={Settings}
            label="Settings"
            active={activeTab === "Settings"}
            onClick={() => setActiveTab("Settings")}
          />
          <button
            onClick={async () => {
              const promptEvent = window.deferredPrompt;
              if (!promptEvent) {
                alert("Installation is not supported on this browser, or the app is already installed.");
                return;
              }
              promptEvent.prompt();
              const result = await promptEvent.userChoice;
              if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
              } else {
                console.log('User dismissed the install prompt');
              }
              window.deferredPrompt = null;
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all rounded-xl hover:-translate-y-1 hover:shadow-sm",
              "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <Download size={20} />
            {isSidebarOpen && <span>Download App</span>}
          </button>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-all rounded-xl hover:-translate-y-1 hover:shadow-sm"
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
              className="p-2 bg-white border-2 border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all text-zinc-600 shadow-[0_3px_0_rgb(228,228,231)] hover:-translate-y-[1px] hover:shadow-[0_4px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-medium text-zinc-900 italic font-serif tracking-wide">
              {activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-4">
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
                className="relative p-2 bg-white border-2 border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all text-zinc-600 shadow-[0_3px_0_rgb(228,228,231)] hover:-translate-y-[1px] hover:shadow-[0_4px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
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
                className="relative p-2 bg-white border-2 border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all text-zinc-600 shadow-[0_3px_0_rgb(228,228,231)] hover:-translate-y-[1px] hover:shadow-[0_4px_0_rgb(228,228,231)] active:translate-y-0 active:shadow-[0_0px_0_rgb(228,228,231)]"
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="h-full w-full"
            >
              {activeTab === "Dashboard" && (
                <DashboardView
                  shipments={shipments}
                  vessels={vessels}
                  profile={profile}
                  setActiveTab={setActiveTab}
                  rolePermissions={rolePermissions}
                  users={users}
                  onStartChat={() => setIsUserListOpen(true)}
                  companiesData={companiesData}
                />
              )}
              {activeTab === "Shipments" && (
                <ShipmentsView
                  shipments={shipments}
                  vessels={vessels}
                  profile={profile}
                  rolePermissions={rolePermissions}
                  users={users}
                  companiesData={companiesData}
                />
              )}
              {activeTab === "Invoices" && (
                <InvoicesView profile={profile} />
              )}
              {activeTab === "Vessels" && (
                <VesselPlanningView vessels={vessels} shipments={shipments} profile={profile} />
              )}
              {activeTab === "Users" && <UsersView users={users} profile={profile} shipments={shipments} />}
              {activeTab === "Permissions" && (
                <PermissionsView rolePermissions={rolePermissions} />
              )}
              {activeTab === "Analytics" && (
                <AnalyticsDashboard shipments={shipments} users={users} />
              )}
              {activeTab === "Documents" && (
                <DocumentGallery shipments={shipments} />
              )}
              {activeTab === "Reports" && (
                <ReportsView shipments={shipments} profile={profile} companiesData={companiesData} setActiveTab={setActiveTab} />
              )}
              {activeTab === "Companies" && (
                <CompaniesView companiesData={companiesData} />
              )}
              {activeTab === "MyCompany" && (
                <MyCompanyView profile={profile} companiesData={companiesData} />
              )}
              {activeTab === "Costing" && (
                <CostingView shipments={shipments} profile={profile} />
              )}
              {activeTab === "FreightRates" && (
                <FreightRatesView profile={profile} users={users} PAKISTAN_LOCATIONS={PAKISTAN_LOCATIONS} />
              )}
              {activeTab === "Incidents" && (
                <TheftAndInsuranceView shipments={shipments} profile={profile} users={users} />
              )}
              {activeTab === "Complaints" && (
                <ComplaintsView complaints={complaints} shipments={shipments} vessels={vessels} profile={profile} users={users} />
              )}
              {activeTab === "Settings" && <SettingsView profile={profile} />}
            </motion.div>
          </AnimatePresence>
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
            {chatMessages.map((msg) => {
              const renderMessageText = (text) => {
                if (!text) return null;
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                return text.split(urlRegex).map((part, i) => {
                  if (part.match(urlRegex)) {
                    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-200">{part}</a>;
                  }
                  return part;
                });
              };

              return (
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
                    {msg.attachment && (
                      <div className="mb-2">
                        {msg.attachment.type === 'image' ? (
                          <img src={msg.attachment.url} alt="attachment" className="max-w-full rounded-lg max-h-48 object-cover" />
                        ) : msg.attachment.type === 'audio' ? (
                          <audio controls src={msg.attachment.url} className="max-w-full h-8" />
                        ) : (
                          <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors">
                            <FileIcon size={16} />
                            <span className="truncate max-w-[150px] text-xs">{msg.attachment.name}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {renderMessageText(msg.text)}
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
              );
            })}
          </div>

          <div className="p-3 border-t border-zinc-100 bg-white flex flex-col gap-2">
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 items-center"
            >
              <div className="relative">
                <FileUploader
                  label=""
                  onUpload={(url, name) => {
                    const type = name.match(/\.(jpeg|jpg|gif|png)$/i) ? 'image' : 'document';
                    handleSendMessage(null, { url, name, type }, "");
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 rounded-full cursor-pointer transition-colors"
                />
              </div>
              
              <AudioRecorder 
                onRecordingComplete={(url) => {
                  handleSendMessage(null, { url, name: 'Voice Message', type: 'audio' }, "");
                }} 
              />

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-zinc-100 border border-zinc-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 text-zinc-900"
              />

              <button
                type="submit"
                className="p-2 bg-orange-500 border-2 border-orange-700 text-white rounded-full hover:bg-orange-600 transition-all shadow-[0_4px_0_rgb(194,65,12)] hover:-translate-y-[1px] hover:shadow-[0_6px_0_rgb(194,65,12)] active:translate-y-0 active:shadow-[0_0px_0_rgb(194,65,12)]"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
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
      <AIAssistant shipments={shipments} vessels={vessels} />
    </div>
  );
}

const SidebarItem = ({ icon: Icon, label, active, onClick, isSidebarOpen = true }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-200 rounded-xl my-1",
      active
        ? "bg-orange-500 text-white shadow-[0_4px_0_rgb(194,65,12)] -translate-y-1"
        : "text-zinc-500 border-transparent hover:bg-zinc-100 hover:text-zinc-900",
      !isSidebarOpen && "justify-center px-0"
    )}
    title={!isSidebarOpen ? label : undefined}
  >
    <Icon size={18} className="shrink-0" />
    {isSidebarOpen && <span className="truncate">{label}</span>}
  </button>
);

import { LineChart, Line } from "recharts";

const StatCard = ({ label, value, trend, icon: Icon, color, onClick, sparklineData }) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-white border-2 border-zinc-200 p-4 lg:p-6 rounded-2xl transition-all group relative overflow-hidden",
      color.replace("bg-", "border-b-"),
      "border-b-[6px]",
      onClick &&
        "cursor-pointer hover:-translate-y-1 hover:shadow-lg active:translate-y-1 active:border-b-2",
      !onClick && "shadow-sm"
    )}
  >
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={cn("p-2 rounded-lg bg-opacity-10", color)}>
        <Icon size={20} className={color.replace("bg-", "text-")} />
      </div>
      <span
        className={cn(
          "text-xs font-mono font-bold",
          trend.startsWith("+") ? "text-green-600" : trend.startsWith("-") ? "text-red-600" : "text-zinc-500",
        )}
      >
        {trend}
      </span>
    </div>
    <div className="relative z-10">
      <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-1">
        {label}
      </h3>
      <p className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</p>
    </div>
    {sparklineData && (
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color.includes('green') ? '#16a34a' : color.includes('orange') ? '#ea580c' : color.includes('blue') ? '#2563eb' : '#52525b'} 
              strokeWidth={3} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const TheftAndInsuranceView = ({ shipments, profile, users }) => {
  const incidentShipments = shipments.filter(s => s.hasIncident);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-zinc-900 italic font-serif">Theft & Insurance</h2>
      </div>
      <div className="bg-white border-2 border-zinc-200 rounded-xl shadow-[0_4px_0_rgb(228,228,231)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tracking ID</th>
                <th className="px-4 py-3 font-medium">Incident Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Insurance Status</th>
                <th className="px-4 py-3 font-medium">Claim Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {incidentShipments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500">No incidents reported.</td>
                </tr>
              ) : (
                incidentShipments.map(shipment => (
                  <tr key={shipment.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-xs">{shipment.trackingId}</td>
                    <td className="px-4 py-3">{shipment.incidentDate ? new Date(shipment.incidentDate).toLocaleDateString() : "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {shipment.incidentType || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{shipment.incidentLocation || "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-1 rounded text-xs font-medium",
                        shipment.insuranceStatus === "Settled" ? "bg-green-100 text-green-700" :
                        shipment.insuranceStatus === "Rejected" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {shipment.insuranceStatus || "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {shipment.insuranceClaimAmount ? `PKR ${shipment.insuranceClaimAmount}` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
