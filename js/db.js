(function () {
    'use strict';

    const DB_NAME = 'ToolzoDB';
    const DB_VERSION = 2;
    const STORE_NAME = 'data';

    let db = null;
    let openPromise = null;

    function openDB() {
        if (openPromise) return openPromise;
        openPromise = new Promise(function (resolve, reject) {
            if (db) return resolve(db);
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function () {
                if (!req.result.objectStoreNames.contains(STORE_NAME)) {
                    req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            };
            req.onsuccess = function () {
                db = req.result;
                resolve(db);
            };
            req.onerror = function () {
                reject(req.error);
            };
        });
        return openPromise;
    }

    var API = {
        getItem: async function (key) {
            try {
                var d = await openDB();
                return new Promise(function (resolve, reject) {
                    var tx = d.transaction(STORE_NAME, 'readonly');
                    var req = tx.objectStore(STORE_NAME).get(key);
                    req.onsuccess = function () {
                        resolve(req.result ? req.result.value : null);
                    };
                    req.onerror = function () { reject(req.error); };
                });
            } catch (e) {
                try { return localStorage.getItem(key); } catch (_) { return null; }
            }
        },

        setItem: async function (key, value) {
            try {
                var d = await openDB();
                return new Promise(function (resolve, reject) {
                    var tx = d.transaction(STORE_NAME, 'readwrite');
                    tx.objectStore(STORE_NAME).put({ key: key, value: value });
                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () { reject(tx.error); };
                });
            } catch (e) {
                try { localStorage.setItem(key, value); } catch (_) { }
            }
        },

        removeItem: async function (key) {
            try {
                var d = await openDB();
                return new Promise(function (resolve, reject) {
                    var tx = d.transaction(STORE_NAME, 'readwrite');
                    tx.objectStore(STORE_NAME).delete(key);
                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () { reject(tx.error); };
                });
            } catch (e) {
                try { localStorage.removeItem(key); } catch (_) { }
            }
        },

        clear: async function () {
            try {
                var d = await openDB();
                return new Promise(function (resolve, reject) {
                    var tx = d.transaction(STORE_NAME, 'readwrite');
                    tx.objectStore(STORE_NAME).clear();
                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () { reject(tx.error); };
                });
            } catch (e) {
                try { localStorage.clear(); } catch (_) { }
            }
        },

        keys: async function () {
            try {
                var d = await openDB();
                return new Promise(function (resolve, reject) {
                    var tx = d.transaction(STORE_NAME, 'readonly');
                    var req = tx.objectStore(STORE_NAME).getAllKeys();
                    req.onsuccess = function () { resolve(req.result); };
                    req.onerror = function () { reject(req.error); };
                });
            } catch (e) {
                return [];
            }
        }
    };

    window.db = API;

    // localStorage shim: transparently reads/writes IndexedDB in background
    // Book-writer.js and other minified code still uses localStorage directly,
    // but this shim ensures data is also persisted to IndexedDB.
    (function() {
        var origGetItem = Storage.prototype.getItem;
        var origSetItem = Storage.prototype.setItem;
        var origRemoveItem = Storage.prototype.removeItem;

        Storage.prototype.getItem = function(key) {
            return origGetItem.call(this, key);
        };

        Storage.prototype.setItem = function(key, value) {
            origSetItem.call(this, key, value);
            API.setItem(key, value).catch(function(){});
        };

        Storage.prototype.removeItem = function(key) {
            origRemoveItem.call(this, key);
            API.removeItem(key).catch(function(){});
        };
    })();

    async function migrateFromLocalStorage() {
        // book-writer keys excluded because minified code reads localStorage synchronously
        var keys = ['todos', 'flashcardDecks', 'habits', 'quickNotes', 'expenses', 'gpaCourses', 'pomodoroSessions'];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            try {
                var existing = await API.getItem(k);
                if (existing === null) {
                    var ls = localStorage.getItem(k);
                    if (ls !== null) {
                        await API.setItem(k, ls);
                        localStorage.removeItem(k);
                    }
                }
            } catch (_) { }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', migrateFromLocalStorage);
    } else {
        migrateFromLocalStorage();
    }

})();
