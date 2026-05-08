import { supabase } from './supabase';

// A lightweight shim to map Firestore operations to Supabase

export function collection(db, ...paths) {
  return { type: 'collection', path: paths.join('/') };
}

export function doc(db, path, ...rest) {
  if (rest.length === 0) {
    if (path.includes('/')) {
      const parts = path.split('/');
      return { type: 'doc', table: parts[0], id: parts[1] };
    }
  }
  // collection, id
  if (typeof path === 'object' && path.type === 'collection') {
    return { type: 'doc', table: path.path, id: rest[0] || crypto.randomUUID() };
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

function applyConstraints(sbQuery, constraints) {
  if (!constraints) return sbQuery;
  let q = sbQuery;
  for (const c of constraints) {
    if (c.type === 'where') {
      if (c.op === '==') q = q.eq(c.field, c.value);
      else if (c.op === '<') q = q.lt(c.field, c.value);
      else if (c.op === '<=') q = q.lte(c.field, c.value);
      else if (c.op === '>') q = q.gt(c.field, c.value);
      else if (c.op === '>=') q = q.gte(c.field, c.value);
      else if (c.op === 'array-contains') q = q.contains(c.field, [c.value]);
      else if (c.op === 'in') q = q.in(c.field, c.value);
    } else if (c.type === 'orderBy') {
      q = q.order(c.field, { ascending: c.direction !== 'desc' });
    } else if (c.type === 'limit') {
      q = q.limit(c.value);
    }
  }
  return q;
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
  let sbQuery = supabase.from(table).select('*');
  
  for (const [k, v] of Object.entries(parentCond)) {
    sbQuery = sbQuery.eq(k, v);
  }
  
  sbQuery = applyConstraints(sbQuery, queryRef.constraints);
  
  const { data, error } = await sbQuery;
  if (error) {
    console.error("getDocs error", error);
    throw error;
  }
  
  const safeData = data || [];
  
  return {
    empty: safeData.length === 0,
    docs: safeData.map(d => ({
      id: d.id,
      data: () => cleanDataFromDb(d),
      exists: () => true
    }))
  };
}

export async function getDoc(docRef) {
  const { data, error } = await supabase.from(docRef.table).select('*').eq('id', docRef.id).single();
  if (error && error.code !== 'PGRST116') {
     console.error("getDoc error", error);
     throw error;
  }
  return {
    id: docRef.id,
    exists: () => !!data,
    data: () => cleanDataFromDb(data)
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
  
  // ensure created_at updated_at logic is okay
  const { error } = await supabase.from(docRef.table).upsert(payload);
  if (error) throw error;
}

export async function addDoc(collectionRef, data) {
  const id = crypto.randomUUID();
  const { table, parentCond } = prepareTableAndParent(collectionRef.path);
  const payload = { id, ...parentCond, ...cleanPayload(data) };
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
  return { id };
}

export async function updateDoc(docRef, data) {
  const { error } = await supabase.from(docRef.table).update(cleanPayload(data)).eq('id', docRef.id);
  if (error) throw error;
}

export async function deleteDoc(docRef) {
  const { error } = await supabase.from(docRef.table).delete().eq('id', docRef.id);
  if (error) throw error;
}

export function onSnapshot(ref, callback) {
  const { table, parentCond } = prepareTableAndParent(ref.path || ref.table);
  
  if (ref.type === 'doc') {
    getDoc(ref).then(snap => callback(snap));
  } else {
    getDocs(ref).then(snap => callback(snap));
  }

  const channel = supabase.channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      if (ref.type === 'doc') {
        getDoc(ref).then(snap => callback(snap));
      } else {
        getDocs(ref).then(snap => callback(snap));
      }
    })
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}

export const serverTimestamp = () => new Date().toISOString();
export const arrayUnion = (val) => val; // Shimming arrays is hard in postgres jsonb without rpc, fallback dummy
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
