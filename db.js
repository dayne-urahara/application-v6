// IndexedDB wrapper
const DB_NAME = 'budgetmaster-db';
const DB_VER = 1;
const STORE = { cat:'categories', tx:'transactions', env:'envelopes', settings:'settings' };

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e=>{
      const db = e.target.result;
      db.createObjectStore(STORE.cat, { keyPath:'id' });
      db.createObjectStore(STORE.tx, { keyPath:'id' });
      db.createObjectStore(STORE.env, { keyPath:'id' });
      db.createObjectStore(STORE.settings, { keyPath:'key' });
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}

async function dbPut(store, value){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error);
  });
}
async function dbBulkPut(store, values){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readwrite');
    const os = tx.objectStore(store);
    values.forEach(v=>os.put(v));
    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error);
  });
}
async function dbGetAll(store){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function dbDelete(store, key){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(store,'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error);
  });
}

window.BMDB = { STORE, dbPut, dbBulkPut, dbGetAll, dbDelete };
