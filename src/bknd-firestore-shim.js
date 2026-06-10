import { api } from './bknd';

// A lightweight shim to map Firestore operations to Bknd

export const db = {};
export const storage = {};

export function ref(storageMock, path) {
  return { path };
}

export async function uploadBytes(storageRef, blobOrFile) {
  // Mock upload till Bknd provides Storage SDK mapping
  return { metadata: { fullPath: storageRef.path } };
}

export async function getDownloadURL(storageRef) {
  return `https://mock.url/${storageRef.path}`;
}

export async function deleteObject(storageRef) {
  // Mock
}

export function collection(db, ...paths) {
  return { type: 'collection', path: paths.join('/') };
}

export function doc(db, path, ...rest) {
  if (rest.length === 0) {
    if (typeof path === 'string' && path.includes('/')) {
      const parts = path.split('/');
      if (parts.length === 2) {
        return { type: 'doc', table: parts[0], id: parts[1] };
      }
      if (parts.length === 4) {
        return { type: 'doc', table: parts[2], id: parts[3] };
      }
    }
  }
  // collection, id
  if (typeof path === 'object' && path.type === 'collection') {
    const { table } = prepareTableAndParent(path.path);
    return { type: 'doc', table: table, id: rest[0] || crypto.randomUUID() };
  }
  // string, string
  return { type: 'doc', table: path, id: rest[0] || crypto.randomUUID() };
}

export function query(collectionRef, ...constraints) {
  return { ...collectionRef, constraints: [...(collectionRef.constraints || []), ...constraints] };
}

export function where(field, op, value) {
  return { type: 'where', field, op, value };
}

export function orderBy(field, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(number) {
  return { type: 'limit', value: number };
}

function convertConstraint(c) {
  const map = {
    '==': '$eq',
    '<': '$lt',
    '<=': '$lte',
    '>': '$gt',
    '>=': '$gte',
    'in': '$in',
    'array-contains': '$eq' // bknd might not have array-contains, approximate with eq or in
  };
  return { [c.field]: { [map[c.op] || '$eq']: c.value } };
}

function applyConstraintsToListOpts(parentCond, constraints) {
  const listOpts = { where: {}, sort: undefined, limit: undefined };
  
  const andClauses = [];

  for (const [k, v] of Object.entries(parentCond)) {
    andClauses.push({ [k]: { $eq: v } });
  }
  
  if (constraints) {
    for (const c of constraints) {
      if (c.type === 'where') {
        andClauses.push(convertConstraint(c));
      } else if (c.type === 'orderBy') {
        listOpts.sort = { by: c.field, dir: c.direction === 'desc' ? 'desc' : 'asc' };
      } else if (c.type === 'limit') {
        listOpts.limit = c.value;
      }
    }
  }

  if (andClauses.length > 0) {
    listOpts.where = { $and: andClauses };
  } else {
    delete listOpts.where;
  }
  
  return listOpts;
}

const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

function cleanDataFromDb(data) {
  if (!data) return data;
  const result = Array.isArray(data) ? [] : {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && isoRegex.test(v)) {
      result[k] = Timestamp.fromDate(new Date(v));
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = cleanDataFromDb(v); // handle nested
    } else if (Array.isArray(v)) {
      result[k] = v.map(item => typeof item === 'object' ? cleanDataFromDb(item) : item);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function prepareTableAndParent(path) {
  const parts = path.split('/');
  if (parts.length === 3) {
    const parentCollection = parts[0];
    const parentId = parts[1];
    const subcollection = parts[2];
    const parentKey = parentCollection.endsWith('s') ? parentCollection.slice(0, -1) + '_id' : parentCollection + '_id';
    return { table: subcollection, parentCond: { [parentKey]: parentId } };
  }
  return { table: path, parentCond: {} };
}

export async function getDocs(queryRef) {
  const { table, parentCond } = prepareTableAndParent(queryRef.path || queryRef.table);
  const listOpts = applyConstraintsToListOpts(parentCond, queryRef.constraints);
  
  let docs = [];
  try {
    const res = await api.data.readMany(table, listOpts);
    docs = res.data || [];
  } catch(e) {
    console.error("getDocs error in bknd", e);
  }
  
  return {
    empty: docs.length === 0,
    docs: docs.map(d => ({
      id: d.id,
      data: () => cleanDataFromDb(d),
      exists: () => true
    }))
  };
}

export async function getDoc(docRef) {
  let doc = null;
  try {
    const res = await api.data.readOne(docRef.table, docRef.id);
    doc = res.data;
  } catch(e) { /* ignore read misses */ }
  
  return {
    id: docRef.id,
    exists: () => !!doc,
    data: () => cleanDataFromDb(doc)
  };
}

export const getDocFromServer = getDoc;

function cleanPayload(data) {
  if (!data) return data;
  const result = Array.isArray(data) ? [] : {};
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Timestamp) {
      result[k] = v.toDate().toISOString();
    } else if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      result[k] = cleanPayload(v); // handle nested
    } else if (Array.isArray(v)) {
      result[k] = v.map(item => typeof item === 'object' ? cleanPayload(item) : item);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export async function setDoc(docRef, data, options) {
  const payload = { id: docRef.id, ...cleanPayload(data) };
  try {
    await api.data.updateOne(docRef.table, docRef.id, payload);
  } catch (e) {
    if (e.message && e.message.includes('not found') || (e.status === 404)) {
      await api.data.createOne(docRef.table, payload);
    } else {
      // Sometimes create fails if it already exists or vice-versa, fallback to create
      try {
        await api.data.createOne(docRef.table, payload);
      } catch (err) {
        throw err;
      }
    }
  }
}

export async function addDoc(collectionRef, data) {
  const id = crypto.randomUUID();
  const { table, parentCond } = prepareTableAndParent(collectionRef.path);
  const payload = { id, ...parentCond, ...cleanPayload(data) };
  await api.data.createOne(table, payload);
  return { id };
}

export async function updateDoc(docRef, data) {
  await api.data.updateOne(docRef.table, docRef.id, cleanPayload(data));
}

export async function deleteDoc(docRef) {
  await api.data.deleteOne(docRef.table, docRef.id);
}

export function onSnapshot(ref, callback) {
  // For basic support without streams buffering, we do a one time fetch.
  // Proper realtime can be hooked up if needed via api.data(..).subscribeAll()
  if (ref.type === 'doc') {
    getDoc(ref).then(snap => callback(snap)).catch(err => console.error("onSnapshot getDoc error:", err));
  } else {
    getDocs(ref).then(snap => callback(snap)).catch(err => console.error("onSnapshot getDocs error:", err));
  }
  
  return () => {};
}

export const serverTimestamp = () => new Date().toISOString();
export const arrayUnion = (val) => val; 
export const deleteField = () => null;

export class Timestamp {
  constructor(seconds, nanoseconds) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), date.getTime() % 1000 * 1000000);
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
}
