var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  isValidAdminSecret: () => isValidAdminSecret
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_firestore = require("firebase-admin/firestore");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var DB_FILE = import_path.default.join(process.cwd(), "data-store.json");
var firebaseConfigPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var isFirebaseEnabled = false;
var dbAdmin = null;
if (import_fs.default.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(import_fs.default.readFileSync(firebaseConfigPath, "utf8"));
    if (config.projectId && config.projectId !== "remixed-project-id") {
      import_firebase_admin.default.initializeApp({
        projectId: config.projectId
      });
      if (config.firestoreDatabaseId) {
        dbAdmin = (0, import_firestore.getFirestore)(config.firestoreDatabaseId);
      } else {
        dbAdmin = (0, import_firestore.getFirestore)();
      }
      isFirebaseEnabled = true;
      console.log("Firebase Admin initialized for project:", config.projectId, "Database:", config.firestoreDatabaseId || "(default)");
      dbAdmin.collection("products").limit(1).get().then(() => {
        console.log("Firebase Admin server permissions verified.");
      }).catch((err) => {
        console.log("Firebase Admin server credentials unauthenticated. API routes using local persistence. Reason:", err.message);
        isFirebaseEnabled = false;
        dbAdmin = null;
      });
    } else {
      console.log("Firebase Admin skipped (default placeholder project ID detected). Running offline with local database storage.");
    }
  } catch (err) {
    console.warn("Firebase Admin skipped or failed to initialize, running offline:", err.message);
  }
}
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
app.use(import_express.default.static(import_path.default.join(process.cwd(), "public")));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "\u0645\u0646\u062F\u0648\u0628\u0643 \u0627\u0644\u0637\u0628\u064A", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var DEFAULT_SETTINGS = {
  requireApprovalForNewClients: true,
  singlePhonePerDevice: true,
  autoApproveKnownNumbers: true,
  enableVisitTracking: true,
  drProfileAvatar: ""
};
var DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "\u0633\u064A\u0628\u0644\u0648\u0643\u0633 500 (Ciplox 500)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Ciprofloxacine 500",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u062D\u064A\u0648\u064A\u0629",
    price: "660 \u0631\u064A\u0627\u0644",
    bonus: "10%",
    unit: "\u0634\u0631\u064A\u0637"
  },
  {
    id: "p2",
    name: "\u062F\u064A\u0631\u0627\u062F \u0625\u0645 \u0623\u0642\u0631\u0627\u0635 (Dirad-M Tablets)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Metronidazole + Diloxanide",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u0637\u0641\u064A\u0644\u064A\u0627\u062A \u0645\u0637\u0647\u0631\u0629",
    price: "703 \u0631\u064A\u0627\u0644",
    bonus: "10%",
    unit: "\u0634\u0631\u064A\u0637"
  },
  {
    id: "p3",
    name: "\u062F\u064A\u0631\u0627\u062F \u0625\u0645 \u0634\u0631\u0627\u0628 (Dirad-M Syrup)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Metronidazole + Diloxanide",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u0637\u0641\u064A\u0644\u064A\u0627\u062A \u0645\u0637\u0647\u0631\u0629",
    price: "770 \u0631\u064A\u0627\u0644",
    bonus: "10%",
    unit: "\u0632\u062C\u0627\u062C\u0629"
  },
  {
    id: "p4",
    name: "\u0623\u0644\u0631\u064A\u062F \u0623\u0642\u0631\u0627\u0635 (Allerid Tablets)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Cetirizine Tab.",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0633\u064A\u0629",
    price: "781 \u0631\u064A\u0627\u0644",
    bonus: "20%",
    unit: "\u0634\u0631\u064A\u0637"
  },
  {
    id: "p5",
    name: "\u0623\u0644\u0631\u064A\u062F \u0634\u0631\u0627\u0628 (Allerid Syrup)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Cetirizine Syrp",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0633\u064A\u0629",
    price: "770 \u0631\u064A\u0627\u0644",
    bonus: "10%",
    unit: "\u0632\u062C\u0627\u062C\u0629"
  },
  {
    id: "p6",
    name: "\u0641\u0648\u0631\u0643\u0627\u0646 150 \u0643\u0628\u0633\u0648\u0644 (Forcan 150 Caps)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Fluconazol 150",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0637\u0631\u064A\u0627\u062A",
    price: "508 \u0631\u064A\u0627\u0644",
    bonus: "10%",
    unit: "\u0643\u0628\u0633\u0648\u0644\u0629"
  },
  {
    id: "p7",
    name: "\u0646\u0648\u0641\u0627\u062A\u0627\u0643\u0633 1 \u062C\u0645 (Novatax 1g)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Cefotaxime 1g",
    category: "\u062D\u0642\u0646 \u0645\u0636\u0627\u062F \u062D\u064A\u0648\u064A",
    price: "850 \u0631\u064A\u0627\u0644",
    bonus: "40%",
    unit: "\u062D\u0642\u0646\u0629"
  },
  {
    id: "p13",
    name: "\u0646\u0648\u0641\u0627\u062A\u0643\u0633 500 (Novatex 500)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Cefotaxime 500 mg",
    category: "\u062D\u0642\u0646 \u0645\u0636\u0627\u062F \u062D\u064A\u0648\u064A",
    price: "600 \u0631\u064A\u0627\u0644",
    bonus: "40%",
    unit: "\u062D\u0642\u0646\u0629"
  },
  {
    id: "p8",
    name: "\u0644\u0648\u0645\u0627\u0643 \u0634\u0631\u0627\u0626\u0637 (Lomac Strips)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Omeprazole 20 Tab",
    category: "\u0623\u062F\u0648\u064A\u0629 \u0627\u0644\u0645\u0639\u062F\u0629 \u0648\u0627\u0644\u062D\u0645\u0648\u0636\u0629",
    price: "2400 \u0631\u064A\u0627\u0644",
    bonus: "100%",
    unit: "\u0634\u0631\u064A\u0637"
  },
  {
    id: "p9",
    name: "\u0644\u0627\u0646\u0633\u0643 \u0639\u0644\u0628 (Lansec 30 mg)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Lansoprazol 30 mg",
    category: "\u0623\u062F\u0648\u064A\u0629 \u0627\u0644\u0645\u0639\u062F\u0629 \u0648\u0627\u0644\u062D\u0645\u0648\u0636\u0629",
    price: "1223 \u0631\u064A\u0627\u0644",
    bonus: "20%",
    unit: "\u0639\u0644\u0628\u0629"
  },
  {
    id: "p10",
    name: "\u0633\u064A\u0628\u0627\u0632\u0648\u0644 \u0641\u0648\u0631\u062A (Cipazole Forte)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Scenidazole 1000",
    category: "\u0645\u0636\u0627\u062F\u0627\u062A \u0637\u0641\u064A\u0644\u064A\u0627\u062A \u0648\u0628\u0643\u062A\u064A\u0631\u064A\u0627",
    price: "550 \u0631\u064A\u0627\u0644",
    bonus: "40%",
    unit: "\u0634\u0631\u064A\u0637"
  },
  {
    id: "p11",
    name: "\u0628\u0627\u0631\u0641\u064A\u0632 \u0641\u0648\u0627\u0631 (Parfeez Effervescent)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Paracetamol",
    category: "\u0645\u0633\u0643\u0646\u0627\u062A \u0648\u0645\u0636\u0627\u062F\u0627\u062A \u062D\u0645\u0649",
    price: "1999 \u0631\u064A\u0627\u0644",
    bonus: "40%",
    unit: "\u0639\u0644\u0628\u0629 \u0641\u0648\u0627\u0631"
  },
  {
    id: "p12",
    name: "\u0628\u0627\u0631\u0641\u064A\u0632 \u0628\u0644\u0635 \u0641\u0648\u0627\u0631 (Parfeez Plus Effervescent)",
    description: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A: Paracetamol + Codeine + Caffeine",
    category: "\u0645\u0633\u0643\u0646\u0627\u062A \u0623\u0644\u0645 \u0642\u0648\u064A\u0629",
    price: "2400 \u0631\u064A\u0627\u0644",
    bonus: "40%",
    unit: "\u0639\u0644\u0628\u0629 \u0641\u0648\u0627\u0631"
  }
];
var DEFAULT_USERS = [
  {
    id: "u_rep",
    email: "belalalqaisi55@gmail.com",
    phone: "+967776600049",
    name: "\u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A",
    entityName: "\u0627\u0644\u0645\u0643\u062A\u0628 \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629 (\u0627\u0644\u0625\u062F\u0627\u0631\u0629)",
    location: "\u0635\u0646\u0639\u0627\u0621 / \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A",
    role: "rep",
    isApproved: true,
    status: "approved",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function getDB() {
  try {
    if (!import_fs.default.existsSync(DB_FILE)) {
      const initialDB = {
        users: DEFAULT_USERS,
        products: DEFAULT_PRODUCTS,
        stockReports: [],
        orders: [],
        visits: [],
        notifications: [],
        agreements: [],
        complaints: []
      };
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
      return initialDB;
    }
    const data = import_fs.default.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    const defaultClientIds = /* @__PURE__ */ new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
    parsed.users = parsed.users.filter((u) => !defaultClientIds.has(u.id));
    if (!parsed.products || parsed.products.length === 0) parsed.products = DEFAULT_PRODUCTS;
    if (!parsed.stockReports) parsed.stockReports = [];
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.visits) parsed.visits = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.agreements) parsed.agreements = [];
    return parsed;
  } catch (err) {
    console.error("Error reading database", err);
    return {
      users: [],
      products: DEFAULT_PRODUCTS,
      stockReports: [],
      orders: [],
      visits: [],
      notifications: [],
      agreements: []
    };
  }
}
function saveDB(db) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to database", err);
  }
}
async function fetchAllUsersFromDB() {
  let list = [];
  const defaultClientIds = /* @__PURE__ */ new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
  let firebaseSuccess = false;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("users").get();
      snap.forEach((doc) => {
        if (!defaultClientIds.has(doc.id)) {
          list.push(doc.data());
        } else {
          doc.ref.delete().catch(() => {
          });
        }
      });
      firebaseSuccess = true;
    } catch (e) {
      console.warn("Firebase operation fallback (users):", e.message);
      isFirebaseEnabled = false;
    }
  }
  if (!firebaseSuccess) {
    list = getDB().users;
  }
  list = list.filter((u) => !defaultClientIds.has(u.id));
  let hasChanges = false;
  for (const defU of DEFAULT_USERS) {
    const existing = list.find((u) => u.id === defU.id || defU.phone && u.phone === defU.phone);
    if (!existing) {
      list.push(defU);
      hasChanges = true;
      if (isFirebaseEnabled && dbAdmin) {
        try {
          await dbAdmin.collection("users").doc(defU.id).set(defU);
        } catch (e) {
        }
      }
    }
  }
  if (hasChanges && (!isFirebaseEnabled || !dbAdmin)) {
    const db = getDB();
    db.users = list;
    saveDB(db);
  }
  return list;
}
async function saveUserToDB(user) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("users").doc(user.id).set(user);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save user):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const existingIdx = db.users.findIndex((u) => u.id === user.id);
  if (existingIdx !== -1) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...user };
  } else {
    db.users.push(user);
  }
  saveDB(db);
}
async function fetchProductsFromDB() {
  let productsList = [];
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("products").get();
      if (snap.empty) {
        const batch = dbAdmin.batch();
        for (const p of DEFAULT_PRODUCTS) {
          const ref = dbAdmin.collection("products").doc(p.id);
          batch.set(ref, p);
        }
        await batch.commit();
        return DEFAULT_PRODUCTS;
      }
      snap.forEach((doc) => {
        productsList.push(doc.data());
      });
    } catch (e) {
      console.warn("Firebase operation fallback (products):", e.message);
      isFirebaseEnabled = false;
    }
  }
  if (productsList.length === 0) {
    productsList = getDB().products;
  }
  let hasChanges = false;
  for (const defP of DEFAULT_PRODUCTS) {
    const existing = productsList.find((p) => p.id === defP.id);
    if (existing) {
      if (existing.price !== defP.price || existing.bonus !== defP.bonus) {
        existing.price = defP.price;
        existing.bonus = defP.bonus;
        hasChanges = true;
        if (isFirebaseEnabled && dbAdmin) {
          try {
            await dbAdmin.collection("products").doc(defP.id).update({ price: defP.price, bonus: defP.bonus });
          } catch (e) {
          }
        }
      }
    } else {
      productsList.push(defP);
      hasChanges = true;
      if (isFirebaseEnabled && dbAdmin) {
        try {
          await dbAdmin.collection("products").doc(defP.id).set(defP);
        } catch (e) {
        }
      }
    }
  }
  if (hasChanges && (!isFirebaseEnabled || !dbAdmin)) {
    const db = getDB();
    db.products = productsList;
    saveDB(db);
  }
  return productsList;
}
async function saveProductToDB(product) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("products").doc(product.id).set(product);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save product):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  db.products.push(product);
  saveDB(db);
}
async function deleteProductFromDB(id) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("products").doc(id).delete();
      return true;
    } catch (e) {
      console.warn("Firebase operation fallback (delete product):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx !== -1) {
    db.products.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}
async function fetchStockReportsFromDB(clientId) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query = dbAdmin.collection("stockReports");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list = [];
      snap.forEach((doc) => {
        list.push(doc.data());
      });
      return list;
    } catch (e) {
      console.warn("Firebase operation fallback (stockReports):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  return clientId ? db.stockReports.filter((r) => r.clientId === clientId) : db.stockReports;
}
async function saveStockReportToDB(clientId, clientName, entityName, reports) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const batch = dbAdmin.batch();
      for (const rep of reports) {
        const oldReports = await dbAdmin.collection("stockReports").where("clientId", "==", clientId).where("productId", "==", rep.productId).get();
        oldReports.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        const id = "st_" + Math.random().toString(36).substr(2, 9);
        const ref = dbAdmin.collection("stockReports").doc(id);
        batch.set(ref, {
          id,
          clientId,
          clientName: clientName || "\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
          entityName: entityName || "\u0645\u0646\u0634\u0623\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629",
          productId: rep.productId,
          productName: rep.productName,
          remainingQty: Number(rep.remainingQty),
          reportedAt: timestamp
        });
      }
      await batch.commit();
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save stockReports):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  reports.forEach((rep) => {
    db.stockReports = db.stockReports.filter(
      (r) => !(r.clientId === clientId && r.productId === rep.productId)
    );
    db.stockReports.push({
      id: "st_" + Math.random().toString(36).substr(2, 9),
      clientId,
      clientName: clientName || "\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
      entityName: entityName || "\u0645\u0646\u0634\u0623\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629",
      productId: rep.productId,
      productName: rep.productName,
      remainingQty: Number(rep.remainingQty),
      reportedAt: timestamp
    });
  });
  saveDB(db);
}
async function fetchOrdersFromDB(clientId) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query = dbAdmin.collection("orders");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list2 = [];
      snap.forEach((doc) => {
        list2.push(doc.data());
      });
      list2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list2;
    } catch (e) {
      console.warn("Firebase operation fallback (orders):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = clientId ? db.orders.filter((o) => o.clientId === clientId) : db.orders;
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function saveOrderToDB(order) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("orders").doc(order.id).set(order);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save order):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  db.orders.unshift(order);
  saveDB(db);
}
async function updateOrderStatusInDB(id, status) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update({ status });
        const updated = await docRef.get();
        return updated.data();
      }
    } catch (e) {
      console.warn("Firebase operation fallback (update order):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    db.orders[idx].status = status;
    saveDB(db);
    return db.orders[idx];
  }
  return null;
}
async function resetSystemInDB() {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const collections = ["users", "products", "stockReports", "orders", "visits", "notifications"];
      for (const col of collections) {
        const snap = await dbAdmin.collection(col).get();
        const batch2 = dbAdmin.batch();
        snap.forEach((docSnap) => {
          batch2.delete(docSnap.ref);
        });
        await batch2.commit();
      }
      const batch = dbAdmin.batch();
      for (const p of DEFAULT_PRODUCTS) {
        const ref = dbAdmin.collection("products").doc(p.id);
        batch.set(ref, p);
      }
      await batch.commit();
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (reset system):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = {
    users: [
      {
        id: "u_rep",
        phone: "+967776600049",
        name: "\u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A (\u0645\u0646\u062F\u0648\u0628 \u0645\u0628\u064A\u0639\u0627\u062A \u0637\u0628\u064A)",
        role: "rep",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    products: DEFAULT_PRODUCTS,
    stockReports: [],
    orders: [],
    visits: [],
    notifications: [
      {
        id: "n_1",
        title: "\u{1F4E2} \u062D\u0645\u0644\u0629 \u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0644\u0634\u0647\u0631 \u064A\u0648\u0644\u064A\u0648!",
        message: "\u064A\u0633\u0631\u0646\u0627 \u0623\u0646 \u0646\u0639\u0644\u0646 \u0644\u0639\u0645\u0644\u0627\u0626\u0646\u0627 \u0627\u0644\u0643\u0631\u0627\u0645 \u0639\u0646 \u0625\u0637\u0644\u0627\u0642 \u0628\u0627\u0642\u0629 \u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u062A\u062E\u0641\u064A\u0636\u0627\u062A \u0627\u0644\u0643\u0628\u0631\u0649 \u0639\u0644\u0649 \u0623\u0635\u0646\u0627\u0641 \u0633\u064A\u0628\u0644\u0648\u0643\u0633 \u0648\u062F\u064A\u0631\u0627\u062F \u0625\u0645 \u0644\u0634\u0647\u0631 \u064A\u0648\u0644\u064A\u0648. \u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0628\u0648\u0646\u0635 10+2 \u0639\u0646\u062F \u0637\u0644\u0628 \u0623\u0643\u062B\u0631 \u0645\u0646 15 \u0639\u0644\u0628\u0629. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644.",
        type: "broadcast",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  saveDB(db);
}
async function fetchSettingsFromDB() {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const doc = await dbAdmin.collection("settings").doc("app_config").get();
      if (doc.exists) {
        return { ...DEFAULT_SETTINGS, ...doc.data() };
      }
    } catch (e) {
      console.warn("Firebase operation fallback (settings):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  return { ...DEFAULT_SETTINGS, ...db.settings || {} };
}
async function saveSettingsToDB(settings) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("settings").doc("app_config").set(settings, { merge: true });
    } catch (e) {
      console.warn("Firebase operation fallback (save settings):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  db.settings = settings;
  saveDB(db);
}
function cleanPhoneDigits(phoneStr) {
  if (!phoneStr) return "";
  const arabicDigits = ["\u0660", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"];
  const persianDigits = ["\u06F0", "\u06F1", "\u06F2", "\u06F3", "\u06F4", "\u06F5", "\u06F6", "\u06F7", "\u06F8", "\u06F9"];
  let s = String(phoneStr);
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(arabicDigits[i], String(i));
    s = s.replaceAll(persianDigits[i], String(i));
  }
  return s.replace(/\D/g, "");
}
function isValidAdminSecret(pwd) {
  if (!pwd) return false;
  const input = pwd.trim();
  const envSecret = (process.env.ADMIN_SECRET || process.env.APP_ADMIN_SECRET || "").trim();
  const validSecrets = ["Mandoubk302344$", "Belal302344"];
  if (envSecret && !validSecrets.includes(envSecret)) {
    validSecrets.push(envSecret);
  }
  return validSecrets.includes(input);
}
app.post("/api/auth/login", async (req, res) => {
  const { phone, email, password } = req.body;
  const rawInput = String(phone || email || "").trim().toLowerCase();
  if (!rawInput) {
    return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
  }
  const inputDigits = cleanPhoneDigits(rawInput);
  const isRepEmail = rawInput.includes("belalalqaisi55@gmail.com") || rawInput === "belalalqaisi55";
  const repDigits = "776600049";
  const isRepPhone = inputDigits.endsWith(repDigits);
  const isRep = isRepPhone || isRepEmail;
  if (isRep) {
    if (password && !isValidAdminSecret(password)) {
      return res.status(401).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
    }
    const adminUser = {
      id: "u_rep",
      email: "belalalqaisi55@gmail.com",
      phone: "+967776600049",
      name: "\u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A (\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0637\u0628\u064A \u0648\u0627\u0644\u0645\u0633\u0624\u0648\u0644)",
      role: "rep",
      entityName: "\u0627\u0644\u0645\u0643\u062A\u0628 \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629 (\u0627\u0644\u0625\u062F\u0627\u0631\u0629)",
      location: "\u0635\u0646\u0639\u0627\u0621 / \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A",
      isApproved: true,
      status: "approved",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveUserToDB(adminUser);
    return res.json({ status: "success", user: adminUser });
  }
  if (!inputDigits && !rawInput.includes("@")) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0635\u062D\u064A\u062D \u0623\u0648 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A" });
  }
  const users = await fetchAllUsersFromDB();
  const user = users.find((u) => {
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });
  if (user) {
    if (user.role === "rep") {
      if (!isValidAdminSecret(password)) {
        return res.status(401).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      return res.json({ status: "success", user });
    }
    if (user.status === "suspended") {
      return res.json({
        status: "suspended",
        user,
        error: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0642 \u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0624\u0642\u062A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A \u0644\u0644\u062A\u0641\u0639\u064A\u0644."
      });
    }
    const settings = await fetchSettingsFromDB();
    const isUnconfirmed = user.isApproved === false || user.status === "pending_approval";
    if (isUnconfirmed && settings.requireApprovalForNewClients) {
      return res.json({
        status: "pending_approval",
        user,
        message: "\u062D\u0633\u0627\u0628\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A."
      });
    }
    if (user.isApproved === void 0) {
      user.isApproved = true;
      user.status = "approved";
      await saveUserToDB(user);
    }
    return res.json({ status: "success", user });
  } else {
    return res.json({ status: "not_found", error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0628\u0627\u0644\u062A\u0637\u0628\u064A\u0642" });
  }
});
app.post("/api/auth/register", async (req, res) => {
  const { phone, name, role, entityName, location } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062A\u0633\u062C\u064A\u0644" });
  }
  const inputDigits = cleanPhoneDigits(phone);
  if (!inputDigits || inputDigits.length < 6) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0635\u062D\u064A\u062D \u064A\u062A\u0643\u0648\u0646 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
  }
  if (inputDigits.endsWith("776600049")) {
    return res.status(400).json({ error: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631." });
  }
  const users = await fetchAllUsersFromDB();
  const userExists = users.some((u) => {
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });
  if (userExists) {
    return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0628\u0627\u0644\u062A\u0637\u0628\u064A\u0642. \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u0646\u0641\u0633 \u0627\u0644\u0631\u0642\u0645 \u0628\u0639\u062F \u0627\u0644\u062A\u0623\u0643\u064A\u062F." });
  }
  const settings = await fetchSettingsFromDB();
  const requiresApproval = settings.requireApprovalForNewClients;
  const clientRole = role === "doctor" ? "doctor" : "pharmacy";
  const randomCode = String(Math.floor(1e3 + Math.random() * 9e3));
  const newUser = {
    id: "u_" + Math.random().toString(36).substr(2, 9),
    phone: phone.trim(),
    name: name.trim(),
    role: clientRole,
    entityName: entityName ? entityName.trim() : "",
    location: location ? location.trim() : "",
    isApproved: !requiresApproval,
    status: requiresApproval ? "pending_approval" : "approved",
    confirmationCode: randomCode,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveUserToDB(newUser);
  res.json({
    success: true,
    user: newUser,
    requiresApproval,
    message: requiresApproval ? "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0627\u0646\u0636\u0645\u0627\u0645\u0643 \u0628\u0646\u062C\u0627\u062D. \u062D\u0633\u0627\u0628\u0643 \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0645\u0646 \u0642\u0628\u0644 \u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A." : "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0648\u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D."
  });
});
app.post("/api/auth/verify-code", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0631\u0645\u0632 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const inputDigits = cleanPhoneDigits(phone);
  const inputCode = String(code).trim();
  const users = await fetchAllUsersFromDB();
  const user = users.find((u) => {
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  if (user.confirmationCode === inputCode || inputCode === "3023") {
    user.isApproved = true;
    user.status = "approved";
    await saveUserToDB(user);
    return res.json({ success: true, user, message: "\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D!" });
  }
  return res.status(400).json({ error: "\u0631\u0645\u0632 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A." });
});
app.get("/api/settings", async (req, res) => {
  const settings = await fetchSettingsFromDB();
  res.json(settings);
});
app.post("/api/settings", async (req, res) => {
  const current = await fetchSettingsFromDB();
  const updated = {
    requireApprovalForNewClients: req.body.requireApprovalForNewClients !== void 0 ? Boolean(req.body.requireApprovalForNewClients) : current.requireApprovalForNewClients,
    singlePhonePerDevice: req.body.singlePhonePerDevice !== void 0 ? Boolean(req.body.singlePhonePerDevice) : current.singlePhonePerDevice,
    autoApproveKnownNumbers: req.body.autoApproveKnownNumbers !== void 0 ? Boolean(req.body.autoApproveKnownNumbers) : current.autoApproveKnownNumbers,
    enableVisitTracking: req.body.enableVisitTracking !== void 0 ? Boolean(req.body.enableVisitTracking) : current.enableVisitTracking ?? true,
    drProfileAvatar: req.body.drProfileAvatar !== void 0 ? String(req.body.drProfileAvatar) : current.drProfileAvatar || "",
    productCategories: Array.isArray(req.body.productCategories) ? req.body.productCategories.map(String) : current.productCategories
  };
  await saveSettingsToDB(updated);
  res.json({ success: true, settings: updated });
});
app.get("/api/admin/dr-avatar", async (req, res) => {
  const settings = await fetchSettingsFromDB();
  res.json({ drProfileAvatar: settings.drProfileAvatar || "" });
});
app.post("/api/admin/dr-avatar", async (req, res) => {
  const { avatar } = req.body;
  const current = await fetchSettingsFromDB();
  const updated = { ...current, drProfileAvatar: avatar || "" };
  await saveSettingsToDB(updated);
  res.json({ success: true, drProfileAvatar: updated.drProfileAvatar });
});
app.get("/api/users", async (req, res) => {
  const users = await fetchAllUsersFromDB();
  res.json(users);
});
app.post("/api/users/batch-import", async (req, res) => {
  const { clients } = req.body;
  if (!clients || !Array.isArray(clients)) {
    return res.status(400).json({ error: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
  }
  const existingUsers = await fetchAllUsersFromDB();
  const addedUsers = [];
  const skippedPhones = [];
  for (const client of clients) {
    const { phone, name, role, entityName, location } = client;
    if (!phone || !name) {
      continue;
    }
    const cleanPhone = phone.toString().trim();
    const phoneExists = existingUsers.some(
      (u) => u.phone.replace(/\s+/g, "") === cleanPhone.replace(/\s+/g, "")
    );
    if (phoneExists) {
      skippedPhones.push(cleanPhone);
      continue;
    }
    const newUser = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      phone: cleanPhone,
      name: name.trim(),
      role: role || "pharmacy",
      entityName: entityName ? entityName.trim() : "",
      location: location ? location.trim() : "",
      isApproved: true,
      status: "approved",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveUserToDB(newUser);
    existingUsers.push(newUser);
    addedUsers.push(newUser);
  }
  res.json({
    success: true,
    addedCount: addedUsers.length,
    skippedCount: skippedPhones.length,
    skippedPhones
  });
});
app.put("/api/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isApproved, status } = req.body;
  const users = await fetchAllUsersFromDB();
  const existing = users.find((u) => u.id === id);
  if (!existing) {
    return res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  existing.isApproved = isApproved !== void 0 ? Boolean(isApproved) : existing.isApproved;
  if (status) {
    existing.status = status;
  } else if (existing.isApproved) {
    existing.status = "approved";
  } else {
    existing.status = "pending_approval";
  }
  await saveUserToDB(existing);
  res.json({ success: true, user: existing });
});
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { phone, name, role, entityName, location, isApproved, status, avatar } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const users = await fetchAllUsersFromDB();
  const existing = users.find((u) => u.id === id);
  const updatedUser = {
    id,
    phone: phone.trim(),
    name: name.trim(),
    role: role || (existing ? existing.role : "pharmacy"),
    entityName: entityName ? entityName.trim() : existing ? existing.entityName : "",
    location: location ? location.trim() : existing ? existing.location : "",
    avatar: avatar !== void 0 ? avatar : existing ? existing.avatar : "",
    isApproved: isApproved !== void 0 ? isApproved : existing ? existing.isApproved : true,
    status: status || (existing ? existing.status : "approved"),
    createdAt: existing ? existing.createdAt : (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveUserToDB(updatedUser);
  res.json({ success: true, user: updatedUser });
});
app.delete("/api/users", async (req, res) => {
  let count = 0;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snapshot = await dbAdmin.collection("users").get();
      const batch = dbAdmin.batch();
      snapshot.docs.forEach((doc) => {
        const u = doc.data();
        if (doc.id !== "u_rep" && u.role !== "rep") {
          batch.delete(doc.ref);
          count++;
        }
      });
      await batch.commit();
    } catch (e) {
      console.warn("Firestore delete all users error:", e.message);
    }
  }
  const db = getDB();
  const initialCount = db.users.length;
  db.users = db.users.filter((u) => u.id === "u_rep" || u.role === "rep");
  saveDB(db);
  return res.json({ success: true, count: count || initialCount - db.users.length });
});
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("users").doc(id).delete();
    } catch (e) {
      console.warn("Firestore delete user error:", e.message);
    }
  }
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === id || u.phone === id);
  if (idx !== -1) {
    db.users.splice(idx, 1);
    saveDB(db);
  }
  return res.json({ success: true });
});
app.get("/api/products", async (req, res) => {
  const products = await fetchProductsFromDB();
  res.json(products);
});
app.post("/api/products", async (req, res) => {
  const { name, description, category, price, unit, bonus } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 \u0648\u0633\u0639\u0631 \u0627\u0644\u0635\u0646\u0641 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const newProduct = {
    id: "p_" + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    description: description ? description.trim() : "\u0644\u0627 \u064A\u0648\u062C\u062F \u0648\u0635\u0641 \u0644\u0647\u0630\u0627 \u0627\u0644\u0635\u0646\u0641",
    category: category ? category.trim() : "\u0639\u0627\u0645",
    price: price.trim(),
    unit: unit ? unit.trim() : "\u0639\u0644\u0628\u0629",
    bonus: bonus ? bonus.trim() : void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveProductToDB(newProduct);
  res.json({ success: true, product: newProduct });
});
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteProductFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "\u0627\u0644\u0635\u0646\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  res.json({ success: true });
});
app.post("/api/stock-reports", async (req, res) => {
  const { clientId, clientName, entityName, reports } = req.body;
  if (!clientId || !reports || !Array.isArray(reports)) {
    return res.status(400).json({ error: "\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062C\u0631\u062F \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
  }
  await saveStockReportToDB(clientId, clientName, entityName, reports);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0648\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0628\u0646\u062C\u0627\u062D" });
});
app.get("/api/stock-reports", async (req, res) => {
  const { clientId } = req.query;
  const reports = await fetchStockReportsFromDB(clientId);
  res.json(reports);
});
app.post("/api/orders", async (req, res) => {
  const { clientId, clientName, entityName, items } = req.body;
  if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0648\u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0644\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0637\u0644\u0628" });
  }
  const newOrder = {
    id: "ord_" + Math.random().toString(36).substr(2, 9),
    clientId,
    clientName: clientName || "\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
    entityName: entityName || "\u0645\u0646\u0634\u0623\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629",
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity),
      price: item.price || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"
    })),
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveOrderToDB(newOrder);
  res.json({ success: true, order: newOrder });
});
app.get("/api/orders", async (req, res) => {
  const { clientId } = req.query;
  const orders = await fetchOrdersFromDB(clientId);
  res.json(orders);
});
app.patch("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "\u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 \u0645\u0637\u0644\u0648\u0628\u0629" });
  }
  const order = await updateOrderStatusInDB(id, status);
  if (!order) {
    return res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  res.json({ success: true, order });
});
async function fetchVisitsFromDB(clientId) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query = dbAdmin.collection("visits");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list2 = [];
      snap.forEach((doc) => {
        list2.push(doc.data());
      });
      list2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list2;
    } catch (e) {
      console.warn("Firebase operation fallback (visits):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.visits || [];
  const filtered = clientId ? list.filter((v) => v.clientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function saveVisitToDB(visit) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("visits").doc(visit.id).set(visit);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save visit):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.visits) db.visits = [];
  const idx = db.visits.findIndex((v) => v.id === visit.id);
  if (idx !== -1) {
    db.visits[idx] = visit;
  } else {
    db.visits.unshift(visit);
  }
  saveDB(db);
}
async function fetchNotificationsFromDB(clientId) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("notifications").get();
      const list2 = [];
      snap.forEach((doc) => {
        const notif = doc.data();
        if (!clientId || notif.type === "broadcast" || notif.targetClientId === clientId) {
          list2.push(notif);
        }
      });
      list2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list2;
    } catch (e) {
      console.warn("Firebase operation fallback (notifications):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.notifications || [];
  const filtered = clientId ? list.filter((n) => n.type === "broadcast" || n.targetClientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function saveNotificationToDB(notif) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("notifications").doc(notif.id).set(notif);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save notification):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift(notif);
  saveDB(db);
}
app.get("/api/visits", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchVisitsFromDB(clientId);
  res.json(list);
});
app.post("/api/visits", async (req, res) => {
  const { clientId, clientName, entityName, visitDate, notes, summary, tasks } = req.body;
  if (!clientId || !notes || !visitDate) {
    return res.status(400).json({ error: "\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
  }
  const newVisit = {
    id: "v_" + Math.random().toString(36).substr(2, 9),
    clientId,
    clientName: clientName || "\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
    entityName: entityName || "\u0645\u0646\u0634\u0623\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629",
    visitDate,
    notes: notes.trim(),
    summary: summary || "\u0632\u064A\u0627\u0631\u0629 \u0627\u0639\u062A\u064A\u0627\u062F\u064A\u0629 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u062A\u0648\u0641\u064A\u0631 \u0627\u0644\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629.",
    tasks: tasks || [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveVisitToDB(newVisit);
  res.json({ success: true, visit: newVisit });
});
app.patch("/api/visits/:id", async (req, res) => {
  const { id } = req.params;
  const { tasks, summary, notes } = req.body;
  const visits = await fetchVisitsFromDB();
  const visit = visits.find((v) => v.id === id);
  if (!visit) {
    return res.status(404).json({ error: "\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  if (tasks !== void 0) visit.tasks = tasks;
  if (summary !== void 0) visit.summary = summary;
  if (notes !== void 0) visit.notes = notes;
  await saveVisitToDB(visit);
  res.json({ success: true, visit });
});
app.get("/api/notifications", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchNotificationsFromDB(clientId);
  res.json(list);
});
app.post("/api/notifications", async (req, res) => {
  const { title, message, type, targetClientId, targetClientName } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0648\u0646\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const newNotif = {
    id: "n_" + Math.random().toString(36).substr(2, 9),
    title: title.trim(),
    message: message.trim(),
    type: type || "broadcast",
    targetClientId,
    targetClientName,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveNotificationToDB(newNotif);
  res.json({ success: true, notification: newNotif });
});
app.delete("/api/notifications/:id", async (req, res) => {
  const { id } = req.params;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("notifications").doc(id).delete();
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  const db = getDB();
  if (!db.notifications) db.notifications = [];
  const idx = db.notifications.findIndex((n) => n.id === id);
  if (idx !== -1) {
    db.notifications.splice(idx, 1);
    saveDB(db);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
});
app.delete("/api/notifications", async (req, res) => {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("notifications").get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  const db = getDB();
  db.notifications = [];
  saveDB(db);
  res.json({ success: true });
});
async function fetchAgreementsFromDB(clientId) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query = dbAdmin.collection("agreements");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list2 = [];
      snap.forEach((doc) => {
        list2.push(doc.data());
      });
      list2.sort((a, b) => new Date(b.createdAt || b.agreementDate).getTime() - new Date(a.createdAt || a.agreementDate).getTime());
      return list2;
    } catch (e) {
      console.warn("Firebase operation fallback (agreements):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.agreements || [];
  const filtered = clientId ? list.filter((a) => a.clientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt || b.agreementDate).getTime() - new Date(a.createdAt || a.agreementDate).getTime());
}
async function saveAgreementToDB(agreement) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("agreements").doc(agreement.id).set(agreement);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save agreement):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.agreements) db.agreements = [];
  const idx = db.agreements.findIndex((a) => a.id === agreement.id);
  if (idx !== -1) {
    db.agreements[idx] = agreement;
  } else {
    db.agreements.unshift(agreement);
  }
  saveDB(db);
}
async function deleteAgreementFromDB(id) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("agreements").doc(id).delete();
    } catch (e) {
      console.warn("Firebase operation fallback (delete agreement):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.agreements) db.agreements = [];
  const idx = db.agreements.findIndex((a) => a.id === id);
  if (idx !== -1) {
    db.agreements.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}
app.get("/api/agreements", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchAgreementsFromDB(clientId);
  res.json(list);
});
app.post("/api/agreements", async (req, res) => {
  const {
    clientId,
    clientName,
    entityName,
    clientPhone,
    type,
    typeLabel,
    details,
    agreementDate,
    status,
    deliveredDetails,
    deliveredAt,
    deliveredBy,
    invoiceNumber,
    invoiceAttachment,
    notes
  } = req.body;
  if (!clientId || !details || details.trim() === "") {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u0634\u0623\u0629/\u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0627\u062A\u0641\u0627\u0642 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newAgreement = {
    id: "agr_" + Math.random().toString(36).substr(2, 9),
    clientId,
    clientName: clientName || "\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
    entityName: entityName || "\u0645\u0646\u0634\u0623\u0629 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u0629",
    clientPhone: clientPhone || "",
    type: type || "bonus",
    typeLabel: typeLabel || (type === "bonus" ? "\u0628\u0648\u0646\u0635 \u0625\u0636\u0627\u0641\u064A" : type === "samples" ? "\u0639\u064A\u0646\u0627\u062A \u0645\u062C\u0627\u0646\u064A\u0629" : type === "gift_support" ? "\u062F\u0639\u0645 \u0648\u0647\u062F\u0627\u064A\u0627" : "\u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u062E\u0627\u0635\u0629"),
    details: details.trim(),
    agreementDate: agreementDate || now.split("T")[0],
    status: status || "pending",
    deliveredDetails: status === "delivered" ? (deliveredDetails || details).trim() : deliveredDetails ? deliveredDetails.trim() : void 0,
    deliveredAt: status === "delivered" ? deliveredAt || now : void 0,
    deliveredBy: status === "delivered" ? deliveredBy || "\u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A" : void 0,
    invoiceNumber: invoiceNumber ? invoiceNumber.trim() : void 0,
    invoiceAttachment: invoiceAttachment || void 0,
    notes: notes ? notes.trim() : void 0,
    createdAt: now,
    updatedAt: now
  };
  await saveAgreementToDB(newAgreement);
  res.json({ success: true, agreement: newAgreement });
});
app.put("/api/agreements/:id", async (req, res) => {
  const { id } = req.params;
  const {
    clientId,
    clientName,
    entityName,
    clientPhone,
    type,
    typeLabel,
    details,
    agreementDate,
    status,
    deliveredDetails,
    deliveredAt,
    deliveredBy,
    invoiceNumber,
    invoiceAttachment,
    notes
  } = req.body;
  const agreements = await fetchAgreementsFromDB();
  const existing = agreements.find((a) => a.id === id);
  if (!existing) {
    return res.status(404).json({ error: "\u0627\u0644\u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    clientId: clientId || existing.clientId,
    clientName: clientName || existing.clientName,
    entityName: entityName || existing.entityName,
    clientPhone: clientPhone !== void 0 ? clientPhone : existing.clientPhone,
    type: type || existing.type,
    typeLabel: typeLabel || existing.typeLabel,
    details: details !== void 0 ? details.trim() : existing.details,
    agreementDate: agreementDate || existing.agreementDate,
    status: status || existing.status,
    deliveredDetails: status === "delivered" ? deliveredDetails !== void 0 ? deliveredDetails.trim() : existing.deliveredDetails || existing.details : deliveredDetails !== void 0 ? deliveredDetails : existing.deliveredDetails,
    deliveredAt: status === "delivered" ? deliveredAt || existing.deliveredAt || now : status === "pending" ? void 0 : existing.deliveredAt,
    deliveredBy: status === "delivered" ? deliveredBy || existing.deliveredBy || "\u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A" : status === "pending" ? void 0 : existing.deliveredBy,
    invoiceNumber: invoiceNumber !== void 0 ? invoiceNumber : existing.invoiceNumber,
    invoiceAttachment: invoiceAttachment !== void 0 ? invoiceAttachment : existing.invoiceAttachment,
    notes: notes !== void 0 ? notes : existing.notes,
    updatedAt: now
  };
  await saveAgreementToDB(updated);
  res.json({ success: true, agreement: updated });
});
app.delete("/api/agreements/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteAgreementFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "\u0627\u0644\u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  }
  res.json({ success: true });
});
async function fetchComplaintsFromDB(clientId) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query = dbAdmin.collection("complaints");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list2 = [];
      snap.forEach((doc) => {
        list2.push(doc.data());
      });
      list2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list2;
    } catch (e) {
      console.warn("Firebase operation fallback (complaints):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.complaints || [];
  const filtered = clientId ? list.filter((c) => c.clientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function saveComplaintToDB(complaint) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("complaints").doc(complaint.id).set(complaint);
      return;
    } catch (e) {
      console.warn("Firebase operation fallback (save complaint):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.complaints) db.complaints = [];
  const idx = db.complaints.findIndex((c) => c.id === complaint.id);
  if (idx !== -1) {
    db.complaints[idx] = complaint;
  } else {
    db.complaints.unshift(complaint);
  }
  saveDB(db);
}
async function deleteComplaintFromDB(id) {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("complaints").doc(id).delete();
      return true;
    } catch (e) {
      console.warn("Firebase operation fallback (delete complaint):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.complaints) db.complaints = [];
  const idx = db.complaints.findIndex((c) => c.id === id);
  if (idx !== -1) {
    db.complaints.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}
app.get("/api/complaints", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchComplaintsFromDB(clientId);
  res.json(list);
});
app.post("/api/complaints", async (req, res) => {
  const {
    clientId,
    clientName,
    entityName,
    clientPhone,
    clientRole,
    type,
    typeLabel,
    subject,
    content,
    priority,
    isAnonymous,
    attachment
  } = req.body;
  if (!subject || !content || content.trim() === "") {
    return res.status(400).json({ error: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0634\u0643\u0648\u0649 \u0648\u062A\u0641\u0627\u0635\u064A\u0644\u0647\u0627 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newComplaint = {
    id: "cmp_" + Math.random().toString(36).substr(2, 9),
    clientId: clientId || "anon",
    clientName: isAnonymous ? "\u0641\u0627\u0639\u0644 \u062E\u064A\u0631 / \u0645\u062C\u0647\u0648\u0644 (\u0633\u0631\u064A)" : clientName || "\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
    entityName: isAnonymous ? "\u0645\u0646\u0634\u0623\u0629 \u0633\u0631\u064A\u0629" : entityName || "\u0645\u0646\u0634\u0623\u0629 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u0629",
    clientPhone: isAnonymous ? "" : clientPhone || "",
    clientRole: clientRole || "pharmacy",
    type: type || "complaint",
    typeLabel: typeLabel || (type === "suggestion" ? "\u0627\u0642\u062A\u0631\u0627\u062D \u062A\u0637\u0648\u064A\u0631" : type === "quality_issue" ? "\u0645\u0644\u0627\u062D\u0638\u0629 \u062C\u0648\u062F\u0629 \u0635\u0646\u0641" : type === "financial_bonus" ? "\u0645\u0644\u0627\u062D\u0638\u0629 \u0645\u0627\u0644\u064A\u0629/\u0628\u0648\u0646\u0635" : type === "compliment" ? "\u0625\u0634\u0627\u062F\u0629 \u0648\u0634\u0643\u0631" : "\u0634\u0643\u0648\u0649"),
    subject: subject.trim(),
    content: content.trim(),
    priority: priority || "normal",
    status: "pending",
    isAnonymous: !!isAnonymous,
    attachment: attachment || void 0,
    createdAt: now,
    updatedAt: now
  };
  await saveComplaintToDB(newComplaint);
  res.json({ success: true, complaint: newComplaint });
});
app.put("/api/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const {
    status,
    adminReply,
    repliedBy,
    subject,
    content,
    priority
  } = req.body;
  const complaints = await fetchComplaintsFromDB();
  const existing = complaints.find((c) => c.id === id);
  if (!existing) {
    return res.status(404).json({ error: "\u0627\u0644\u0634\u0643\u0648\u0649/\u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    status: status !== void 0 ? status : existing.status,
    adminReply: adminReply !== void 0 ? adminReply.trim() : existing.adminReply,
    repliedBy: adminReply ? repliedBy || "\u062F/ \u0628\u0644\u0627\u0644 \u0627\u0644\u0642\u064A\u0633\u064A (\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0637\u0628\u064A)" : existing.repliedBy,
    repliedAt: adminReply ? existing.repliedAt || now : existing.repliedAt,
    subject: subject !== void 0 ? subject.trim() : existing.subject,
    content: content !== void 0 ? content.trim() : existing.content,
    priority: priority !== void 0 ? priority : existing.priority,
    updatedAt: now
  };
  await saveComplaintToDB(updated);
  res.json({ success: true, complaint: updated });
});
app.delete("/api/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteComplaintFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "\u0627\u0644\u0634\u0643\u0648\u0649 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  }
  res.json({ success: true });
});
app.delete("/api/complaints", async (req, res) => {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("complaints").get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  const db = getDB();
  db.complaints = [];
  saveDB(db);
  res.json({ success: true });
});
function shuffleQuestionOptions(options, correctOptionId) {
  if (!options || options.length === 0) return { options: [], correctOptionId: "A" };
  const correctOpt = options.find((o) => o.id === correctOptionId) || options[0];
  const correctText = correctOpt.text;
  const shuffledTexts = options.map((o) => o.text);
  for (let i = shuffledTexts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTexts[i], shuffledTexts[j]] = [shuffledTexts[j], shuffledTexts[i]];
  }
  const letters = ["A", "B", "C", "D", "E", "F"];
  const newOptions = shuffledTexts.map((text, idx) => ({
    id: letters[idx] || String.fromCharCode(65 + idx),
    text
  }));
  const newCorrect = newOptions.find((o) => o.text === correctText);
  return {
    options: newOptions,
    correctOptionId: newCorrect ? newCorrect.id : "A"
  };
}
async function robustGenerateContent(ai, preferredModel, contents, config = {}, allowSearchFallback = true) {
  const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  const candidateModels = Array.from(/* @__PURE__ */ new Set([preferredModel || "gemini-3.5-flash", ...fallbackModels]));
  if (config.tools && config.tools.length > 0) {
    try {
      const res = await ai.models.generateContent({
        model: preferredModel || "gemini-3.5-flash",
        contents,
        config
      });
      return { response: res, modelUsed: preferredModel || "gemini-3.5-flash" };
    } catch (err) {
      console.warn("Grounding tool (Search/Maps) failed or quota exhausted, falling back to standard text generation:", err?.status || err?.message);
      if (allowSearchFallback) {
        const fallbackConfig = { ...config };
        delete fallbackConfig.tools;
        delete fallbackConfig.toolConfig;
        config = fallbackConfig;
      } else {
        throw err;
      }
    }
  }
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config
      });
      return { response: res, modelUsed: model, fallbackSearchUsed: true };
    } catch (err) {
      console.warn(`Model ${model} failed, trying fallback:`, err?.status || err?.message);
      lastError = err;
    }
  }
  throw lastError || new Error("\u062C\u0645\u064A\u0639 \u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0634\u063A\u0648\u0644\u0629 \u0645\u0624\u0642\u062A\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F \u0644\u062D\u0638\u0627\u062A.");
}
async function callOpenRouterChat({
  messages,
  model = "deepseek/deepseek-chat",
  systemInstruction,
  temperature = 0.7,
  responseJson = false
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("\u0645\u0641\u062A\u0627\u062D OPENROUTER_API_KEY \u063A\u064A\u0631 \u0645\u0647\u064A\u0623 \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u062E\u0627\u062F\u0645. \u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u062A\u0647 \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629 (Secrets).");
  }
  const appUrl = process.env.APP_URL || "https://mandoubak-med.app";
  const workspaceId = process.env.OPENROUTER_WORKSPACE_ID || "21aaba5e-2929-5ce8-a166-d464aaf42366";
  const formattedMessages = [];
  if (systemInstruction && systemInstruction.trim()) {
    formattedMessages.push({
      role: "system",
      content: systemInstruction.trim()
    });
  }
  for (const m of messages) {
    const textContent = (m.content || m.text || "").trim();
    if (!textContent) continue;
    formattedMessages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: textContent
    });
  }
  if (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].role !== "user") {
    formattedMessages.push({
      role: "user",
      content: "\u0645\u0631\u062D\u0628\u0627\u064B\u060C \u0647\u0644 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629\u061F"
    });
  }
  const candidateModels = Array.from(
    /* @__PURE__ */ new Set([
      model || "deepseek/deepseek-chat",
      "deepseek/deepseek-chat",
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
      "openrouter/auto"
    ])
  );
  let lastError = null;
  for (const candidate of candidateModels) {
    try {
      const bodyPayload = {
        model: candidate,
        messages: formattedMessages,
        temperature
      };
      if (responseJson) {
        bodyPayload.response_format = { type: "json_object" };
      }
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "HTTP-Referer": appUrl,
          "X-OpenRouter-Title": "\u0645\u0646\u062F\u0648\u0628\u0643 \u0627\u0644\u0637\u0628\u064A | Mandoubak Med",
          "X-Title": "\u0645\u0646\u062F\u0648\u0628\u0643 \u0627\u0644\u0637\u0628\u064A | Mandoubak Med",
          "Content-Type": "application/json",
          "X-Workspace-Id": workspaceId
        },
        body: JSON.stringify(bodyPayload)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`OpenRouter model ${candidate} failed (${res.status}):`, errText);
        lastError = new Error(`OpenRouter Error (${res.status}): ${errText}`);
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) {
        return {
          reply: content.trim(),
          modelUsed: data.model || candidate
        };
      }
    } catch (err) {
      console.warn(`OpenRouter invocation error on ${candidate}:`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("\u062A\u0639\u0630\u0631 \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0645\u0646 \u062E\u0648\u0627\u062F\u0645 OpenRouter");
}
app.post("/api/visits/analyze", async (req, res) => {
  const { notes } = req.body;
  if (!notes || notes.trim() === "") {
    return res.status(400).json({ error: "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062A\u062D\u0644\u064A\u0644" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const prompt = `
\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0642\u0637\u0627\u0639 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629 \u0648\u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0645\u0633\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0646\u062F\u0648\u0628\u064A\u0646 \u0627\u0644\u0637\u0628\u064A\u064A\u0646.
\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0637\u0628\u064A \u0643\u062A\u0628 \u0647\u0630\u0647 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0628\u0639\u062F \u0632\u064A\u0627\u0631\u062A\u0647 \u0644\u0623\u062D\u062F \u0627\u0644\u0639\u0645\u0644\u0627\u0621 (\u0635\u064A\u062F\u0644\u064A\u0629 \u0623\u0648 \u0639\u064A\u0627\u062F\u0629 \u0637\u0628\u064A\u0628):
"${notes}"

\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0647\u0630\u0647 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0628\u062F\u0642\u0629 \u0648\u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629:
1. \u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0641\u064A \u0646\u0642\u0627\u0637 \u0648\u0627\u0636\u062D\u0629 \u0648\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 (3 \u0646\u0642\u0627\u0637 \u0643\u062D\u062F \u0623\u0642\u0635\u0649).
2. \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0642\u0627\u0626\u0645\u0629 \u0628\u0627\u0644\u0645\u0647\u0627\u0645 \u0648\u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629 (Action Items) \u0627\u0644\u062A\u064A \u064A\u062C\u0628 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0645\u062A\u0627\u0628\u0639\u062A\u0647\u0627 (\u0645\u062B\u0627\u0644: \u062A\u0648\u0641\u064A\u0631 \u0639\u064A\u0646\u0627\u062A\u060C \u0645\u062A\u0627\u0628\u0639\u0629 \u0646\u0642\u0635\u060C \u062A\u0642\u062F\u064A\u0645 \u0639\u0631\u0636 \u0633\u0639\u0631\u060C \u0625\u0644\u062E).

\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0628\u0635\u064A\u063A\u0629 JSON \u0645\u0637\u0627\u0628\u0642\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0644\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u062A\u0627\u0644\u064A:
{
  "summary": "\u0645\u0644\u062E\u0635 \u0646\u0642\u0627\u0637 \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0647\u0646\u0627",
  "tasks": [
    "\u0645\u0647\u0645\u0629 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0647\u0646\u0627",
    "\u0645\u0647\u0645\u0629 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629 \u0647\u0646\u0627"
  ]
}
`;
    const { response } = await robustGenerateContent(
      ai,
      "gemini-3.8-flash",
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            summary: { type: import_genai.Type.STRING, description: "Professional summary of the medical representative visit in Arabic." },
            tasks: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Array of follow-up task descriptions in Arabic."
            }
          },
          required: ["summary", "tasks"]
        }
      }
    );
    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);
    res.json({
      success: true,
      summary: result.summary || "\u062A\u0645\u062A \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u062A\u0648\u0641\u0631 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0643\u062A\u0627\u0644\u0648\u062C\u064A\u0629.",
      tasks: (result.tasks || []).map((taskText) => ({
        id: "vt_" + Math.random().toString(36).substr(2, 9),
        taskText,
        completed: false
      }))
    });
  } catch (err) {
    console.error("Gemini visit analyze error:", err);
    res.json({
      success: false,
      summary: "\u2022 \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B.\n\u2022 \u062A\u0645 \u062D\u0641\u0638 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0632\u064A\u0627\u0631\u0629 \u0628\u0646\u062C\u0627\u062D.",
      tasks: [
        { id: "vt_fb1", taskText: "\u062A\u0644\u0628\u064A\u0629 \u0627\u062D\u062A\u064A\u0627\u062C\u0627\u062A \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0648\u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", completed: false }
      ]
    });
  }
});
app.post("/api/drugs/scientific-search", async (req, res) => {
  const { drugQuery } = req.body;
  if (!drugQuery || drugQuery.trim() === "") {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u062F\u0648\u0627\u0621 \u0623\u0648 \u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0641\u0639\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u0628\u062D\u062B" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const prompt = `
\u0623\u0646\u062A \u062F\u0643\u062A\u0648\u0631 \u0635\u064A\u062F\u0644\u064A \u062E\u0628\u064A\u0631 \u0648\u0645\u0633\u062A\u0634\u0627\u0631 \u0639\u0644\u0645\u064A \u0644\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u062D\u0636\u0631\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629.
\u0644\u0642\u062F \u0642\u0627\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 (\u0635\u064A\u062F\u0644\u0627\u0646\u064A \u0623\u0648 \u0637\u0628\u064A\u0628 \u0623\u0648 \u0645\u0646\u062F\u0648\u0628 \u0637\u0628\u064A) \u0628\u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A \u0639\u0646 \u0627\u0644\u062F\u0648\u0627\u0621 \u0623\u0648 \u0627\u0644\u0645\u0631\u0643\u0628 \u0627\u0644\u062A\u0627\u0644\u064A:
"${drugQuery}"

\u0642\u0645 \u0628\u062A\u0642\u062F\u064A\u0645 \u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0628\u062D\u062B \u0639\u0644\u0645\u064A \u062F\u0642\u064A\u0642\u060C \u0645\u0648\u062B\u0648\u0642\u060C \u0648\u0634\u0627\u0645\u0644 \u062C\u062F\u0627\u064B \u062D\u0648\u0644 \u0647\u0630\u0627 \u0627\u0644\u062F\u0648\u0627\u0621 \u0623\u0648 \u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0641\u0639\u0627\u0644\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649.
\u062A\u0623\u0643\u062F \u0645\u0646 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0637\u0628\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0639\u0644\u0645\u064A\u0627\u064B \u0648\u0628\u0634\u0643\u0644 \u0645\u0646\u0638\u0645.

\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0628\u0635\u064A\u063A\u0629 JSON \u0645\u0637\u0627\u0628\u0642\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0644\u0644\u0645\u062E\u0637\u0637 \u0627\u0644\u062A\u0627\u0644\u064A:
{
  "scientificName": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0645\u064A \u0648\u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0641\u0639\u0627\u0644\u0629 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629",
  "drugClass": "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0639\u0644\u0627\u062C\u064A \u0648\u0627\u0644\u062F\u0648\u0627\u0626\u064A \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A \u0648\u0639\u0627\u0626\u0644\u062A\u0647 \u0627\u0644\u0643\u064A\u0645\u064A\u0627\u0626\u064A\u0629",
  "indications": [
    "\u062F\u0648\u0627\u0639\u064A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0633\u0631\u064A\u0631\u064A\u0629 \u0627\u0644\u0645\u0624\u0643\u062F\u0629 1",
    "\u062F\u0648\u0627\u0639\u064A \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0633\u0631\u064A\u0631\u064A\u0629 \u0627\u0644\u0645\u0624\u0643\u062F\u0629 2"
  ],
  "mechanismOfAction": "\u0622\u0644\u064A\u0629 \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u062A\u0623\u062B\u064A\u0631 \u0627\u0644\u062D\u064A\u0648\u064A \u0641\u064A \u0627\u0644\u062C\u0633\u0645 \u0628\u0627\u0644\u062A\u0641\u0635\u064A\u0644 \u0627\u0644\u0639\u0644\u0645\u064A \u0627\u0644\u0645\u0628\u0633\u0637 \u0648\u0627\u0644\u0645\u062A\u0642\u0646",
  "standardDosages": [
    "\u0627\u0644\u062C\u0631\u0639\u0629 \u0627\u0644\u0625\u0631\u0634\u0627\u062F\u064A\u0629 \u0644\u0644\u0628\u0627\u0644\u063A\u064A\u0646",
    "\u0627\u0644\u062C\u0631\u0639\u0629 \u0627\u0644\u0625\u0631\u0634\u0627\u062F\u064A\u0629 \u0644\u0644\u0623\u0637\u0641\u0627\u0644 (\u0625\u0646 \u0648\u062C\u062F\u062A)",
    "\u0625\u0631\u0634\u0627\u062F\u0627\u062A \u062E\u0627\u0635\u0629 \u0628\u0645\u0631\u0636\u0649 \u0627\u0644\u0643\u0644\u0649 \u0623\u0648 \u0627\u0644\u0643\u0628\u062F (\u0625\u0646 \u0644\u0632\u0645)"
  ],
  "sideEffects": [
    "\u0639\u0631\u0636 \u062C\u0627\u0646\u0628\u064A \u0634\u0627\u0626\u0639 1",
    "\u0639\u0631\u0636 \u062C\u0627\u0646\u0628\u064A \u0634\u0627\u0626\u0639 2"
  ],
  "contraindications": [
    "\u0645\u0627\u0646\u0639 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u0637\u0644\u0642 \u0623\u0648 \u062A\u062D\u0630\u064A\u0631 \u0647\u0627\u0645 1",
    "\u0645\u0627\u0646\u0639 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u0637\u0644\u0642 \u0623\u0648 \u062A\u062D\u0630\u064A\u0631 \u0647\u0627\u0645 2"
  ],
  "drugInteractions": [
    "\u062A\u062F\u0627\u062E\u0644 \u062F\u0648\u0627\u0621-\u062F\u0648\u0627\u0621 \u0647\u0627\u0645 1",
    "\u062A\u062F\u0627\u062E\u0644 \u062F\u0648\u0627\u0621-\u062F\u0648\u0627\u0621 \u0647\u0627\u0645 2"
  ],
  "pregnancyCategory": "\u0641\u0626\u0629 \u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062D\u0645\u0644 \u0648\u0627\u0644\u0631\u0636\u0627\u0639\u0629 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 \u0648\u062A\u0623\u062B\u064A\u0631\u0627\u062A\u0647",
  "clinicalTips": [
    "\u0646\u0635\u064A\u062D\u0629 \u0633\u0631\u064A\u0631\u064A\u0629 \u0623\u0648 \u0635\u064A\u062F\u0644\u0627\u0646\u064A\u0629 \u0630\u0647\u0628\u064A\u0629 \u0644\u0636\u0645\u0627\u0646 \u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0645\u0631\u064A\u0636 \u0648\u0627\u0644\u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0642\u0635\u0648\u0649 1",
    "\u0646\u0635\u064A\u062D\u0629 \u0633\u0631\u064A\u0631\u064A\u0629 \u0623\u0648 \u0635\u064A\u062F\u0644\u0627\u0646\u064A\u0629 \u0630\u0647\u0628\u064A\u0629 \u0644\u0636\u0645\u0627\u0646 \u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0645\u0631\u064A\u0636 \u0648\u0627\u0644\u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0642\u0635\u0648\u0649 2"
  ]
}
`;
    const { response } = await robustGenerateContent(
      ai,
      "gemini-3.8-flash",
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            scientificName: { type: import_genai.Type.STRING, description: "Scientific name and active ingredients in Arabic" },
            drugClass: { type: import_genai.Type.STRING, description: "Therapeutic and pharmacological classification in Arabic" },
            indications: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Clinical indications/uses in Arabic"
            },
            mechanismOfAction: { type: import_genai.Type.STRING, description: "Detailed biological mechanism of action in Arabic" },
            standardDosages: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Standard/guideline dosage instructions in Arabic"
            },
            sideEffects: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Common side effects and adverse events in Arabic"
            },
            contraindications: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Contraindications and warnings in Arabic"
            },
            drugInteractions: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Major drug-drug interactions in Arabic"
            },
            pregnancyCategory: { type: import_genai.Type.STRING, description: "Pregnancy category and lactation safety info in Arabic" },
            clinicalTips: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Key clinical tips or pharmacist pearls in Arabic"
            }
          },
          required: [
            "scientificName",
            "drugClass",
            "indications",
            "mechanismOfAction",
            "standardDosages",
            "sideEffects",
            "contraindications",
            "drugInteractions",
            "pregnancyCategory",
            "clinicalTips"
          ]
        }
      }
    );
    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Gemini drug scientific search error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0628\u062D\u062B \u0627\u0644\u0639\u0644\u0645\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A: " + (err.message || "\u0639\u0637\u0644 \u0645\u0624\u0642\u062A\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.")
    });
  }
});
app.post("/api/ai/generate-medical-exam", async (req, res) => {
  const { specialty, topic, count = 5, difficulty = "medium" } = req.body;
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const specialtyBoardMap = {
      pharmacy: {
        exam: "NAPLEX / SPLE / Prometric Clinical Pharmacy Licensure Exam",
        sources: "Goodman & Gilman's Pharmacological Basis of Therapeutics (14th Ed), DiPiro's Pharmacotherapy (12th Ed), USP-NF, FDA Guidelines",
        focus: "Clinical pharmacology, therapeutic drug monitoring, renal dose adjustments, high-risk drug interactions, sterile compounding, pharmacokinetics"
      },
      medicine: {
        exam: "USMLE Step 2 CK / SMLE / PLAB / UKMLA General Medicine & Surgery",
        sources: "Harrison's Principles of Internal Medicine (21st Ed), Current Medical Diagnosis & Treatment (CMDT 2024), First Aid USMLE Step 2 CK, ATLS Guidelines",
        focus: "Internal medicine differential diagnosis, next best step in management, critical emergency triage, pediatric and OB/GYN core algorithms"
      },
      dentistry: {
        exam: "INBDE (Integrated National Board Dental Examination - ADA) / SDLE",
        sources: "Carranza's Clinical Periodontology (13th Ed), Cohen's Pathways of the Pulp (12th Ed), Malamed's Handbook of Local Anesthesia (7th Ed), ADA Guidelines",
        focus: "Endodontic diagnosis, local anesthesia nerve blocks & toxicity, periodontal grading, oral pathology, dental pharmacological management"
      },
      nursing: {
        exam: "NCLEX-RN Next Generation / SNLE / AHA ACLS-BLS",
        sources: "Potter & Perry's Fundamentals of Nursing (10th Ed), Brunner & Suddarth's Medical-Surgical Nursing (15th Ed), AHA 2020-2025 CPR & ECC Guidelines",
        focus: "Clinical judgment measurement model (CJMM), priority nursing interventions, IV fluid & hemodynamic titration, critical care safety alerts"
      },
      lab: {
        exam: "ASCP Board of Certification (BOC) / SLLE Medical Laboratory Scientist Exam",
        sources: "Henry's Clinical Diagnosis and Management by Laboratory Methods (24th Ed), Tietz Textbook of Clinical Chemistry (7th Ed), Rodak's Hematology",
        focus: "Clinical chemistry enzymatic calculations, abnormal peripheral blood smears, blood bank crossmatching & transfusion reactions, diagnostic microbiology"
      },
      radiology: {
        exam: "ARRT Radiologic Technologist Board / Core Diagnostic Radiology Exam",
        sources: "Bushong's Radiologic Science for Technologists (12th Ed), Brant and Helms' Fundamentals of Diagnostic Radiology (5th Ed), ACR Appropriateness Criteria",
        focus: "Radiation protection & physics (ALARA), radiographic positioning & image artifacts, CT/MRI contrast administration safety, emergency imaging interpretation"
      }
    };
    const boardInfo = specialtyBoardMap[specialty] || specialtyBoardMap.pharmacy;
    const requestedCount = Math.min(Math.max(Number(count) || 5, 1), 10);
    const promptText = `You are a Senior Medical Examination Board Question Writer and Item Reviewer for official international and regional licensing examinations (${boardInfo.exam}).
Generate exactly ${requestedCount} authentic, high-quality, peer-reviewed Multiple Choice Questions (MCQs) in ENGLISH for the specialty "${specialty}" with topic/focus: "${topic || boardInfo.focus}". Difficulty: ${difficulty}.

CRITICAL REQUIREMENTS:
1. Language: ALL questions, case vignettes, options, explanations, and high-yield pearls MUST be written in professional, grammatically impeccable Medical Board English (USMLE/NAPLEX/NCLEX standard).
2. Question Format: 
   - A realistic Clinical Vignette / Case Scenario (patient age, presentation, history, vitals/labs).
   - A clear Question Stem (e.g. "Which of the following is the most appropriate next step in management?", "What is the primary mechanism of action?", "Which adverse effect requires immediate discontinuation?").
   - Exactly 4 options labeled A, B, C, D with unambiguous clinical plausibility.
   - 1 definitive Correct Option.
3. DIVERSIFY CORRECT ANSWERS (MANDATORY): You MUST distribute the correct answers evenly across all four options: A, B, C, and D. NEVER make all or most answers option A! Distribute roughly an equal count across A, B, C, and D.
4. Detailed Explanation: Detailed evidence-based rationale citing why the correct answer is standard-of-care and explicitly breaking down why the 3 distractors are incorrect.
5. High-Yield Board Pearl: A memorable "Board Exam Pearl" or high-yield rule often tested on the licensing board.
6. Official Accredited Source: State the exact accredited licensing board (e.g. ${boardInfo.exam}) and reference textbook/guideline (e.g. ${boardInfo.sources}).`;
    const { response } = await robustGenerateContent(
      ai,
      "gemini-3.8-flash",
      [{ role: "user", parts: [{ text: promptText }] }],
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            questions: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  category: { type: import_genai.Type.STRING, description: "Sub-specialty topic or clinical domain in English" },
                  caseVignette: { type: import_genai.Type.STRING, description: "Detailed clinical case vignette in English" },
                  questionText: { type: import_genai.Type.STRING, description: "Direct question stem in English" },
                  options: {
                    type: import_genai.Type.ARRAY,
                    items: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        id: { type: import_genai.Type.STRING, description: "A, B, C, or D" },
                        text: { type: import_genai.Type.STRING, description: "Option text in English" }
                      },
                      required: ["id", "text"]
                    },
                    description: "Exactly 4 options A, B, C, D"
                  },
                  correctOptionId: { type: import_genai.Type.STRING, description: "The correct option ID: A, B, C, or D" },
                  explanation: { type: import_genai.Type.STRING, description: "Comprehensive evidence-based explanation and distractor analysis in English" },
                  highYieldPearl: { type: import_genai.Type.STRING, description: "High-yield board exam clinical pearl in English" },
                  difficulty: { type: import_genai.Type.STRING, description: "easy, medium, or hard" },
                  yearOrSource: { type: import_genai.Type.STRING, description: "Accredited board exam source name in English (e.g. USMLE Step 2 CK / Harrison's)" },
                  sourceOrganization: { type: import_genai.Type.STRING, description: "Official board/council organization in English" },
                  referenceBook: { type: import_genai.Type.STRING, description: "Authoritative reference textbook with edition" }
                },
                required: [
                  "category",
                  "caseVignette",
                  "questionText",
                  "options",
                  "correctOptionId",
                  "explanation",
                  "highYieldPearl",
                  "difficulty",
                  "yearOrSource",
                  "sourceOrganization",
                  "referenceBook"
                ]
              }
            }
          },
          required: ["questions"]
        }
      }
    );
    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText);
    const formattedQuestions = (parsedResult.questions || []).map((q, idx) => {
      const rawOptions = q.options && q.options.length === 4 ? q.options : [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" }
      ];
      const shuffled = shuffleQuestionOptions(rawOptions, q.correctOptionId || "A");
      return {
        id: `ai_${Date.now()}_${idx + 1}`,
        specialty,
        category: q.category || "Clinical Medicine",
        caseVignette: q.caseVignette || "",
        questionText: q.questionText || "Which of the following is the most appropriate step?",
        options: shuffled.options,
        correctOptionId: shuffled.correctOptionId,
        explanation: q.explanation || "Standard evidence-based medical protocol.",
        highYieldPearl: q.highYieldPearl || "Always review high-yield board concepts before the exam.",
        difficulty: q.difficulty || difficulty,
        yearOrSource: q.yearOrSource || boardInfo.exam,
        sourceOrganization: q.sourceOrganization || "Accredited Medical Licensure Board",
        referenceBook: q.referenceBook || boardInfo.sources
      };
    });
    res.json({
      success: true,
      specialty,
      count: formattedQuestions.length,
      questions: formattedQuestions
    });
  } catch (err) {
    console.error("Gemini Medical Exam Generation error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u062A\u0648\u0644\u064A\u062F \u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0627\u0645\u062A\u062D\u0627\u0646 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: " + (err.message || "\u0639\u0637\u0644 \u0645\u0624\u0642\u062A")
    });
  }
});
app.get("/api/ai/providers", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const workspaceId = process.env.OPENROUTER_WORKSPACE_ID || "21aaba5e-2929-5ce8-a166-d464aaf42366";
  res.json({
    gemini: {
      configured: Boolean(geminiKey && geminiKey.trim()),
      defaultModel: "gemini-3.8-flash"
    },
    openrouter: {
      configured: Boolean(openRouterKey && openRouterKey.trim()),
      workspaceId,
      defaultModel: "deepseek/deepseek-chat",
      models: [
        { id: "deepseek/deepseek-chat", name: "DeepSeek V3 / R1 (\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629 \u0648\u0633\u0631\u0639\u0629 \u0641\u0627\u0626\u0642\u0629)" },
        { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash \u0639\u0628\u0631 OpenRouter" },
        { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B Instruct" },
        { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku" },
        { id: "openrouter/auto", name: "OpenRouter Auto (\u062A\u0648\u062C\u064A\u0647 \u062A\u0644\u0642\u0627\u0626\u064A \u0630\u0643\u064A)" }
      ]
    },
    activeDefault: openRouterKey && !geminiKey ? "openrouter" : "gemini"
  });
});
app.post("/api/ai/openrouter/chat", async (req, res) => {
  const { messages, model, systemInstruction, temperature } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0628\u062F\u0621 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629" });
  }
  try {
    const { reply, modelUsed } = await callOpenRouterChat({
      messages,
      model: model || "deepseek/deepseek-chat",
      systemInstruction,
      temperature
    });
    res.json({
      success: true,
      provider: "openrouter",
      reply,
      modelUsed
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 OpenRouter"
    });
  }
});
app.post("/api/chat", async (req, res) => {
  const { messages, mode = "standard", provider = "auto", openRouterModel, systemInstruction } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0628\u062F\u0621 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629" });
  }
  const defaultSysInstruction = `\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0637\u0628\u064A \u0648\u0627\u0644\u062F\u0648\u0627\u0626\u064A \u0627\u0644\u0630\u0643\u064A \u0644\u0645\u0646\u0635\u0629 "\u0645\u0646\u062F\u0648\u0628\u0643 \u0627\u0644\u0637\u0628\u064A".
\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0635\u064A\u062F\u0644\u0627\u0646\u064A \u0648\u0637\u0628\u064A \u0648\u0627\u0633\u062A\u0634\u0627\u0631\u064A \u0645\u0628\u064A\u0639\u0627\u062A \u0644\u0644\u0623\u062F\u0648\u064A\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A \u0627\u0644\u0637\u0628\u064A\u0629.
\u062A\u0648\u0627\u0635\u0644 \u0628\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629 \u0641\u0635\u062D\u0649\u060C \u0648\u0627\u0636\u062D\u0629\u060C \u0639\u0644\u0645\u064A\u0629 \u0648\u0645\u062A\u0642\u0646\u0629.
\u0642\u062F\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0645\u0646\u0638\u0645\u0629\u060C \u0645\u0648\u062B\u0648\u0642\u0629\u060C \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0646\u062F\u0648\u0628\u064A\u0646\u060C \u0627\u0644\u0623\u0637\u0628\u0627\u0621\u060C \u0648\u0627\u0644\u0635\u064A\u0627\u062F\u0644\u0629.`;
  if (provider === "openrouter") {
    try {
      const { reply, modelUsed } = await callOpenRouterChat({
        messages,
        model: openRouterModel || "deepseek/deepseek-chat",
        systemInstruction: systemInstruction || defaultSysInstruction
      });
      return res.json({
        success: true,
        provider: "openrouter",
        modelUsed,
        reply,
        groundingChunks: null,
        searchFallback: false
      });
    } catch (err) {
      if (process.env.GEMINI_API_KEY) {
        console.warn("OpenRouter direct attempt failed, trying Gemini fallback:", err.message);
      } else {
        return res.status(500).json({
          success: false,
          error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 OpenRouter: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
        });
      }
    }
  }
  if (!process.env.GEMINI_API_KEY && process.env.OPENROUTER_API_KEY) {
    try {
      const { reply, modelUsed } = await callOpenRouterChat({
        messages,
        model: openRouterModel || "deepseek/deepseek-chat",
        systemInstruction: systemInstruction || defaultSysInstruction
      });
      return res.json({
        success: true,
        provider: "openrouter",
        modelUsed,
        reply,
        groundingChunks: null,
        searchFallback: false
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u0645\u0627\u0630\u062C OpenRouter: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
      });
    }
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const config = {
      systemInstruction: systemInstruction || defaultSysInstruction
    };
    let preferredModel = "gemini-3.5-flash";
    if (mode === "complex" || mode === "thinking") {
      preferredModel = "gemini-3.1-pro-preview";
    } else if (mode === "fast") {
      preferredModel = "gemini-3.1-flash-lite";
    } else if (mode === "search") {
      preferredModel = "gemini-3.5-flash";
      config.tools = [{ googleSearch: {} }];
    } else if (mode === "maps") {
      preferredModel = "gemini-3.5-flash";
      config.tools = [{ googleMaps: {} }];
      if (req.body.location && req.body.location.latitude && req.body.location.longitude) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(req.body.location.latitude),
              longitude: Number(req.body.location.longitude)
            }
          }
        };
      }
    } else {
      preferredModel = "gemini-3.5-flash";
    }
    const validMessages = messages.filter((m) => m && typeof m.text === "string" && m.text.trim().length > 0);
    let startIndex = 0;
    while (startIndex < validMessages.length && validMessages[startIndex].role !== "user") {
      startIndex++;
    }
    const messagesToSend = startIndex < validMessages.length ? validMessages.slice(startIndex) : validMessages;
    const formattedContents = messagesToSend.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));
    if (formattedContents.length === 0) {
      formattedContents.push({
        role: "user",
        parts: [{ text: messages[messages.length - 1]?.text || "\u0645\u0631\u062D\u0628\u0627\u064B" }]
      });
    }
    const { response, modelUsed, fallbackSearchUsed } = await robustGenerateContent(
      ai,
      preferredModel,
      formattedContents,
      config,
      true
    );
    const replyText = response.text || "\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0645 \u0623\u0633\u062A\u0637\u0639 \u062A\u0648\u0644\u064A\u062F \u0625\u062C\u0627\u0628\u0629 \u0641\u064A \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u062D\u0627\u0644\u064A.";
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    res.json({
      success: true,
      provider: "gemini",
      modelUsed,
      reply: replyText,
      groundingChunks: searchChunks || null,
      searchFallback: Boolean(fallbackSearchUsed)
    });
  } catch (err) {
    console.error("Gemini Chat API Error:", err);
    if (process.env.OPENROUTER_API_KEY) {
      try {
        console.log("Seamlessly falling back to OpenRouter AI...");
        const { reply, modelUsed } = await callOpenRouterChat({
          messages,
          model: openRouterModel || "deepseek/deepseek-chat",
          systemInstruction: systemInstruction || defaultSysInstruction
        });
        return res.json({
          success: true,
          provider: "openrouter",
          modelUsed,
          reply,
          groundingChunks: null,
          searchFallback: false
        });
      } catch (fallbackErr) {
        console.error("OpenRouter fallback attempt also failed:", fallbackErr);
      }
    }
    res.status(500).json({
      success: false,
      error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/ai/agent-interaction", async (req, res) => {
  const { input, prompt, agent = "antigravity-preview-05-2026", background = false } = req.body;
  const userInput = input || prompt;
  if (!userInput || typeof userInput !== "string" || userInput.trim() === "") {
    return res.status(400).json({ error: "\u0646\u0635 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 (input/prompt) \u0645\u0637\u0644\u0648\u0628 \u0644\u0628\u062F\u0621 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0639 \u0627\u0644\u0648\u0643\u064A\u0644 \u0627\u0644\u0630\u0643\u064A" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const interaction = await ai.interactions.create({
      agent: agent || "antigravity-preview-05-2026",
      input: userInput.trim(),
      environment: "remote",
      background: Boolean(background)
    }, { timeout: 3e5 });
    let fullOutput = "";
    if (interaction.steps && Array.isArray(interaction.steps)) {
      for (const step of interaction.steps) {
        if (step.type === "model_output") {
          const textContent = step.content?.find((c) => c.type === "text");
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }
    }
    if (!fullOutput && interaction.output_text) {
      fullOutput = interaction.output_text;
    }
    res.json({
      success: true,
      interactionId: interaction.id,
      status: interaction.status,
      environmentId: interaction.environment_id,
      output: fullOutput || "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u0647\u0645\u0629 \u0628\u0646\u062C\u0627\u062D",
      steps: interaction.steps || []
    });
  } catch (err) {
    console.error("Gemini Agent Interaction Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u062A\u0646\u0641\u064A\u0630 \u0648\u0643\u064A\u0644 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (Agent Interaction): " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.get("/api/ai/agent-interaction/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0647\u0645\u0629 (interactionId) \u0645\u0637\u0644\u0648\u0628" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const interaction = await ai.interactions.get(id);
    let fullOutput = "";
    if (interaction.steps && Array.isArray(interaction.steps)) {
      for (const step of interaction.steps) {
        if (step.type === "model_output") {
          const textContent = step.content?.find((c) => c.type === "text");
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }
    }
    if (!fullOutput && interaction.output_text) {
      fullOutput = interaction.output_text;
    }
    res.json({
      success: true,
      interactionId: interaction.id,
      status: interaction.status,
      environmentId: interaction.environment_id,
      output: fullOutput,
      steps: interaction.steps || []
    });
  } catch (err) {
    console.error("Gemini Agent Interaction Get Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0627\u0633\u062A\u0631\u062F\u0627\u062F \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0647\u0645\u0629: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/ai/generate-image", async (req, res) => {
  const { prompt, aspectRatio = "1:1", imageSize = "1K" } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "\u0646\u0635 \u0627\u0644\u062A\u0648\u062C\u064A\u0647 (Prompt) \u0645\u0637\u0644\u0648\u0628 \u0644\u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0635\u0648\u0631\u0629" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: {
        parts: [
          {
            text: `High quality, clean professional pharmaceutical advertisement flyer: ${prompt}`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: imageSize || "1K"
        }
      }
    });
    let imageUrl = null;
    let description = "";
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        } else if (part.text) {
          description += part.text + " ";
        }
      }
    }
    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0635\u0648\u0631\u0629 \u0645\u0646 \u0627\u0644\u0646\u0645\u0648\u0630\u062C. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
    res.json({
      success: true,
      imageUrl,
      description: description.trim() || void 0
    });
  } catch (err) {
    console.error("Gemini Image Generation Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u062A\u0635\u0645\u064A\u0645 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/ai/edit-image", async (req, res) => {
  const { prompt, imageBase64, mimeType = "image/png" } = req.body;
  if (!prompt || !imageBase64) {
    return res.status(400).json({ error: "\u0627\u0644\u0635\u0648\u0631\u0629 \u0648\u0627\u0644\u0646\u0635 \u0627\u0644\u062A\u0648\u062C\u064A\u0647\u064A \u0645\u0637\u0644\u0648\u0628\u0627\u0646 \u0644\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0635\u0648\u0631\u0629" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png"
            }
          },
          {
            text: prompt
          }
        ]
      }
    });
    let imageUrl = null;
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        }
      }
    }
    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0639\u062F\u0644\u0629 \u0645\u0646 \u0627\u0644\u0646\u0645\u0648\u0630\u062C."
      });
    }
    res.json({
      success: true,
      imageUrl
    });
  } catch (err) {
    console.error("Gemini Image Edit Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0635\u0648\u0631\u0629: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/generate-video", async (req, res) => {
  const { prompt, imageBase64, mimeType = "image/png", aspectRatio = "16:9", resolution = "720p" } = req.body;
  if (!prompt && !imageBase64) {
    return res.status(400).json({ error: "\u0627\u0644\u0648\u0635\u0641 \u0623\u0648 \u0627\u0644\u0635\u0648\u0631\u0629 \u0645\u0637\u0644\u0648\u0628 \u0644\u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0641\u064A\u062F\u064A\u0648" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const videoConfig = {
      numberOfVideos: 1,
      resolution: resolution === "1080p" ? "1080p" : "720p",
      aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
    };
    let videoPayload = {
      model: "veo-3.1-lite-generate-preview",
      prompt: prompt || "Cinematic promotional pharmaceutical showcase video with gentle lighting and floating medical elements",
      config: videoConfig
    };
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      videoPayload.image = {
        imageBytes: cleanBase64,
        mimeType: mimeType || "image/png"
      };
    }
    const operation = await ai.models.generateVideos(videoPayload);
    res.json({
      success: true,
      operationName: operation.name
    });
  } catch (err) {
    console.error("Veo Video Start Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0628\u062F\u0621 \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0641\u064A\u062F\u064A\u0648: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/video-status", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 (operationName) \u0645\u0637\u0644\u0648\u0628" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const op = new import_genai.GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({
      success: true,
      done: Boolean(updated.done),
      error: updated.error ? updated.error.message : void 0
    });
  } catch (err) {
    console.error("Veo Video Status Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u062D\u0635 \u062D\u0627\u0644\u0629 \u0627\u0644\u0641\u064A\u062F\u064A\u0648: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/video-download", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0645\u0637\u0644\u0648\u0628 \u0644\u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648" });
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "\u0645\u0641\u062A\u0627\u062D GEMINI_API_KEY \u063A\u064A\u0631 \u0645\u0647\u064A\u0623" });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const op = new import_genai.GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0645\u0644\u0641 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0645\u0643\u062A\u0645\u0644" });
    }
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey }
    });
    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0645\u0646 \u0627\u0644\u062E\u0627\u062F\u0645" });
    }
    res.setHeader("Content-Type", "video/mp4");
    if (videoRes.body) {
      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } else {
      res.status(500).json({ error: "\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0641\u0627\u0631\u063A" });
    }
  } catch (err) {
    console.error("Veo Video Download Error:", err);
    res.status(500).json({
      success: false,
      error: "\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648: " + (err.message || "\u0639\u0637\u0644 \u0641\u064A \u0627\u0644\u062E\u062F\u0645\u0629")
    });
  }
});
app.post("/api/system/reset", async (req, res) => {
  await resetSystemInDB();
  res.json({ success: true, message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0646\u062C\u0627\u062D" });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mandoubak Med Server running on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  isValidAdminSecret
});
//# sourceMappingURL=server.cjs.map
