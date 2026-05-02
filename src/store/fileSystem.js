import createStore from "#store/createStore";
import {
  deletePuterPath,
  getPuterAccount,
  getPuterErrorMessage,
  readPuterTextFile,
  signInToPuter,
  writePuterFile,
} from "../lib/puterClient";

const DEFAULT_DATE_ADDED = "2026-04-27T00:00:00.000Z";
const PUTER_FILE_SYSTEM_PATH = "portfolio/file-system.json";
const PUTER_FILES_DIRECTORY = "portfolio/files";
const MANAGED_ITEM_DEFAULTS = {
  isManaged: true,
  canDelete: true,
  canRename: true,
  dateAdded: DEFAULT_DATE_ADDED,
};

export const applicationsLocation = {
  id: "applications",
  type: "applications",
  name: "Applications",
  kind: "folder",
  children: [],
};

export const documentsLocation = {
  id: "documents",
  type: "documents",
  name: "Documents",
  kind: "folder",
  children: [
    {
      id: "documents-resume",
      name: "Resume.pdf",
      icon: "/images/pdf.png",
      kind: "file",
      fileType: "pdf",
      canDelete: false,
      dateAdded: DEFAULT_DATE_ADDED,
    },
  ],
};

export const downloadsLocation = {
  id: "downloads",
  type: "downloads",
  name: "Downloads",
  kind: "folder",
  children: [],
};

export const myWorkLocation = {
  id: "my-work",
  type: "my-work",
  name: "Projects",
  icon: "/images/folder.png",
  kind: "folder",
  canDelete: false,
  canRename: false,
  dateAdded: DEFAULT_DATE_ADDED,
  children: [],
};

const initialProjectItems = [];
const initialDesktopItems = [];
const initialApplicationsItems = [];
const initialDownloadsItems = [];
const initialDocumentsItems = [];

export const desktopLocation = {
  id: "desktop",
  type: "desktop",
  name: "Desktop",
  kind: "folder",
  children: [],
};

export const trashLocation = {
  id: "trash",
  type: "trash",
  name: "Trash",
  icon: "/icons/trash.svg",
  kind: "folder",
  children: [],
};

const getFileType = (file) => {
  if (file.type?.startsWith("image/")) return "img";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (
    file.type?.startsWith("text/") ||
    /\.(css|html|js|jsx|json|md|txt)$/i.test(file.name)
  ) {
    return "txt";
  }

  return "file";
};

const getFileIcon = (fileType) => {
  if (fileType === "img") return "/images/image.png";
  if (fileType === "pdf") return "/images/pdf.png";
  if (fileType === "txt") return "/images/txt.png";

  return "/images/plain.png";
};

const normalizeItemName = (name, fallbackName) => {
  const normalizedName = name?.trim();

  return normalizedName || fallbackName;
};

const sanitizePathSegment = (segment) =>
  normalizeItemName(segment, "Untitled").replace(/[\\/:*?"<>|]+/g, "-");

const createCopyName = (name) => {
  const extensionMatch = name.match(/(\.[^./]+)$/);

  if (!extensionMatch) return `${name} copy`;

  const extension = extensionMatch[1];
  const basename = name.slice(0, -extension.length);

  return `${basename} copy${extension}`;
};

const createAliasName = (name) => `${name} alias`;

const createStoreId = (prefix) =>
  `${prefix}-${Date.now()}-${
    globalThis.crypto?.randomUUID?.() ?? Math.random()
  }`.replace(/[^a-zA-Z0-9_-]/g, "-");

const cloneManagedItem = (item) => {
  const managedItem = {
    ...MANAGED_ITEM_DEFAULTS,
    ...item,
  };

  if (item.kind === "folder") {
    managedItem.children = (item.children ?? []).map(cloneManagedItem);
  }

  return managedItem;
};

const cloneManagedItems = (items) => items.map(cloneManagedItem);

const WRITABLE_ROOTS = [
  { id: myWorkLocation.id, stateKey: "myWorkItems" },
  { id: desktopLocation.id, stateKey: "desktopItems" },
  { id: applicationsLocation.id, stateKey: "applicationsItems" },
  { id: downloadsLocation.id, stateKey: "downloadsItems" },
  { id: documentsLocation.id, stateKey: "documentsItems" },
];

const mapWritableRoots = (state, updater) =>
  Object.fromEntries(
    WRITABLE_ROOTS.map((root) => [
      root.stateKey,
      updater(state[root.stateKey] ?? [], root),
    ]),
  );

const removeLocalRuntimeFields = (item) => {
  const serializableItem = { ...item };

  delete serializableItem.file;
  delete serializableItem.fileUrl;

  if (serializableItem.imageUrl?.startsWith("blob:")) {
    delete serializableItem.imageUrl;
  }

  if (item.kind === "folder") {
    serializableItem.children = (item.children ?? []).map(
      removeLocalRuntimeFields,
    );
  }

  return serializableItem;
};

const hydrateCloudItem = (item) => {
  const hydratedItem = {
    ...item,
    icon: item.icon ?? (item.kind === "folder" ? "/images/folder.png" : getFileIcon(item.fileType)),
  };

  delete hydratedItem.file;
  delete hydratedItem.fileUrl;

  if (hydratedItem.imageUrl?.startsWith("blob:")) {
    delete hydratedItem.imageUrl;
  }

  if (item.kind === "folder") {
    hydratedItem.children = (item.children ?? []).map(hydrateCloudItem);
  }

  return hydratedItem;
};

const createPuterSnapshot = (state) => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  myWorkItems: state.myWorkItems.map(removeLocalRuntimeFields),
  desktopItems: state.desktopItems.map(removeLocalRuntimeFields),
  applicationsItems: state.applicationsItems.map(removeLocalRuntimeFields),
  downloadsItems: state.downloadsItems.map(removeLocalRuntimeFields),
  documentsItems: state.documentsItems.map(removeLocalRuntimeFields),
  trashItems: state.trashItems.map(removeLocalRuntimeFields),
});

const parsePuterSnapshot = (text) => {
  const snapshot = JSON.parse(text);

  if (!snapshot || !Array.isArray(snapshot.myWorkItems)) {
    throw new Error("Puter file system data is invalid.");
  }

  return {
    myWorkItems: snapshot.myWorkItems.map(hydrateCloudItem),
    desktopItems: Array.isArray(snapshot.desktopItems)
      ? snapshot.desktopItems.map(hydrateCloudItem)
      : [],
    applicationsItems: Array.isArray(snapshot.applicationsItems)
      ? snapshot.applicationsItems.map(hydrateCloudItem)
      : [],
    downloadsItems: Array.isArray(snapshot.downloadsItems)
      ? snapshot.downloadsItems.map(hydrateCloudItem)
      : [],
    documentsItems: Array.isArray(snapshot.documentsItems)
      ? snapshot.documentsItems.map(hydrateCloudItem)
      : [],
    trashItems: Array.isArray(snapshot.trashItems)
      ? snapshot.trashItems.map(hydrateCloudItem)
      : [],
  };
};

const getCloudFilePath = (item, parentCloudPath = null) =>
  parentCloudPath
    ? `${parentCloudPath}/${sanitizePathSegment(item.name)}`
    : `${PUTER_FILES_DIRECTORY}/${item.id}/${sanitizePathSegment(item.name)}`;

const getCloudFolderPath = (item, parentCloudPath = null) =>
  parentCloudPath
    ? `${parentCloudPath}/${sanitizePathSegment(item.name)}`
    : `${PUTER_FILES_DIRECTORY}/${item.id}/${sanitizePathSegment(item.name)}`;

const addCloudPathsToItems = async (items, parentCloudPath = null) =>
  Promise.all(
    items.map(async (item) => {
      if (item.kind === "folder") {
        const cloudPath = getCloudFolderPath(item, parentCloudPath);

        return {
          ...item,
          cloudPath,
          children: await addCloudPathsToItems(item.children ?? [], cloudPath),
        };
      }

      if (!item.file) return item;

      const cloudPath = getCloudFilePath(item, parentCloudPath);

      await writePuterFile(cloudPath, item.file);

      return {
        ...item,
        cloudPath,
      };
    }),
  );

const mergeCloudItemsById = (items, cloudItems) => {
  const cloudItemById = new Map();

  const collectCloudItems = (nextItems) => {
    nextItems.forEach((item) => {
      cloudItemById.set(item.id, item);

      if (item.kind === "folder") {
        collectCloudItems(item.children ?? []);
      }
    });
  };

  collectCloudItems(cloudItems);

  return items.map((item) => {
    const cloudItem = cloudItemById.get(item.id);
    let nextItem = item;

    if (cloudItem?.cloudPath) {
      nextItem = {
        ...item,
        cloudPath: cloudItem.cloudPath,
      };

      delete nextItem.file;

      if (nextItem.fileUrl?.startsWith("blob:")) {
        delete nextItem.fileUrl;
      }

      if (nextItem.imageUrl?.startsWith("blob:")) {
        delete nextItem.imageUrl;
      }
    }

    if (item.kind !== "folder") return nextItem;

    return {
      ...nextItem,
      children: mergeCloudItemsById(item.children ?? [], cloudItems),
    };
  });
};

const collectCloudPaths = (items) =>
  items.flatMap((item) => {
    const paths = item.cloudPath ? [item.cloudPath] : [];

    if (item.kind === "folder") {
      paths.push(...collectCloudPaths(item.children ?? []));
    }

    return paths;
  });

let puterPersistQueue = Promise.resolve();

const queuePuterSnapshotPersist = (set, state) => {
  if (!state.isPuterBackendEnabled) return;

  const snapshot = createPuterSnapshot(state);

  set(() => ({
    puterBackendStatus: "Syncing with Puter...",
    puterBackendError: null,
  }));

  puterPersistQueue = puterPersistQueue
    .catch(() => {})
    .then(() =>
      writePuterFile(
        PUTER_FILE_SYSTEM_PATH,
        JSON.stringify(snapshot, null, 2),
      ),
    )
    .then(() => {
      set(() => ({
        puterBackendStatus: "Synced with Puter.",
        puterBackendError: null,
      }));
    })
    .catch((error) => {
      set(() => ({
        puterBackendStatus: "Puter sync failed.",
        puterBackendError: getPuterErrorMessage(error),
      }));
    });
};

const cloneDuplicatedItem = (item, renameSelf = true) => {
  const dateAdded = new Date().toISOString();
  const duplicate = {
    ...item,
    id: createStoreId(item.kind === "folder" ? "folder-copy" : "file-copy"),
    name: renameSelf ? createCopyName(item.name) : item.name,
    isManaged: item.isManaged ?? true,
    isUploaded: item.isUploaded,
    canDelete: item.canDelete !== false,
    canRename: item.canRename !== false,
    dateAdded,
    deletedAt: undefined,
    originalParentId: undefined,
    originalDateAdded: undefined,
    cloudPath: undefined,
  };

  if (item.kind === "folder") {
    duplicate.children = (item.children ?? []).map((child) =>
      cloneDuplicatedItem(child, false),
    );
  }

  return duplicate;
};

const createAliasItem = (item) => {
  const dateAdded = new Date().toISOString();

  return {
    ...MANAGED_ITEM_DEFAULTS,
    id: createStoreId("alias"),
    name: createAliasName(item.name),
    icon: item.icon,
    kind: "alias",
    fileType: item.fileType,
    aliasTargetId: item.id,
    aliasTargetKind: item.kind,
    aliasTargetName: item.name,
    tags: item.tags ?? [],
    dateAdded,
  };
};

const toUploadId = (prefix, path, uploadedAt, index) =>
  `${prefix}-${uploadedAt}-${index}-${path}`.replace(/[^a-zA-Z0-9_-]/g, "-");

const createUploadedFileItem = (file, path, uploadedAt, index) => {
  const fileType = getFileType(file);
  const fileUrl = URL.createObjectURL(file);

  return {
    id: toUploadId("upload-file", path, uploadedAt, index),
    name: file.name,
    icon: getFileIcon(fileType),
    kind: "file",
    fileType,
    file,
    fileUrl,
    imageUrl: fileType === "img" ? fileUrl : undefined,
    isUploaded: true,
    canDelete: true,
    dateAdded: uploadedAt,
  };
};

const createUploadedFolderItem = (name, path, uploadedAt, index) => ({
  id: toUploadId("upload-folder", path, uploadedAt, index),
  name,
  icon: "/images/folder.png",
  kind: "folder",
  isUploaded: true,
  canDelete: true,
  dateAdded: uploadedAt,
  children: [],
});

const getUploadEntryFile = (entry) => entry?.file ?? entry;

const getUploadEntryPath = (entry, file) =>
  entry?.relativePath || file.webkitRelativePath || file.name;

const createFolderItem = (name) => {
  const dateAdded = new Date().toISOString();

  return {
    id: createStoreId("folder"),
    name: normalizeItemName(name, "Untitled Folder"),
    icon: "/images/folder.png",
    kind: "folder",
    isUploaded: true,
    canDelete: true,
    canRename: true,
    dateAdded,
    children: [],
  };
};

const createTextFileItem = (name) => {
  const dateAdded = new Date().toISOString();

  return {
    id: createStoreId("file"),
    name: normalizeItemName(name, "Untitled.txt"),
    icon: "/images/txt.png",
    kind: "file",
    fileType: "txt",
    isUploaded: true,
    canDelete: true,
    canRename: true,
    dateAdded,
    description: ["New file"],
  };
};

const addFilePath = (children, file, segments, path, uploadedAt, index) => {
  const [segment, ...remainingSegments] = segments;

  if (!segment) return;

  const itemPath = path ? `${path}/${segment}` : segment;

  if (remainingSegments.length === 0) {
    children.push(createUploadedFileItem(file, itemPath, uploadedAt, index));
    return;
  }

  let folder = children.find(
    (item) => item.kind === "folder" && item.name === segment,
  );

  if (!folder) {
    folder = createUploadedFolderItem(segment, itemPath, uploadedAt, index);
    children.push(folder);
  }

  addFilePath(
    folder.children,
    file,
    remainingSegments,
    itemPath,
    uploadedAt,
    index,
  );
};

const addFolderPath = (children, segments, path, uploadedAt, index) => {
  const [segment, ...remainingSegments] = segments;

  if (!segment) return;

  const itemPath = path ? `${path}/${segment}` : segment;
  let folder = children.find(
    (item) => item.kind === "folder" && item.name === segment,
  );

  if (!folder) {
    folder = createUploadedFolderItem(segment, itemPath, uploadedAt, index);
    children.push(folder);
  }

  if (remainingSegments.length) {
    addFolderPath(folder.children, remainingSegments, itemPath, uploadedAt, index);
  }
};

const createUploadedItems = (fileList) => {
  const uploadedAt = new Date().toISOString();

  return Array.from(fileList).reduce((items, entry, index) => {
    if (entry?.kind === "folder") {
      const folderPath = entry.relativePath || entry.name;
      const segments = folderPath.split("/").filter(Boolean);

      addFolderPath(items, segments, "", uploadedAt, index);

      return items;
    }

    const file = getUploadEntryFile(entry);
    const filePath = getUploadEntryPath(entry, file);
    const segments = filePath.split("/").filter(Boolean);

    addFilePath(items, file, segments, "", uploadedAt, index);

    return items;
  }, []);
};

const addItemsToFolder = (
  items,
  targetFolderId,
  uploadedItems,
  rootFolderId = myWorkLocation.id,
) => {
  if (targetFolderId === rootFolderId) {
    return [...items, ...uploadedItems];
  }

  return items.map((item) => {
    if (item.kind !== "folder") return item;

    if (item.id === targetFolderId) {
      return {
        ...item,
        children: [...(item.children ?? []), ...uploadedItems],
      };
    }

    return {
      ...item,
      children: addItemsToFolder(
        item.children ?? [],
        targetFolderId,
        uploadedItems,
        rootFolderId,
      ),
    };
  });
};

const updateItemById = (items, itemId, updater) =>
  items.map((item) => {
    if (item.id === itemId) return updater(item);

    if (item.kind !== "folder") return item;

    return {
      ...item,
      children: updateItemById(item.children ?? [], itemId, updater),
    };
  });

const removeItemById = (items, itemId, parentFolderId = myWorkLocation.id) => {
  let removedItem = null;
  let removedParentId = null;
  const nextItems = [];

  items.forEach((item) => {
    if (item.id === itemId && item.canDelete !== false) {
      removedItem = item;
      removedParentId = parentFolderId;
      return;
    }

    if (item.kind === "folder") {
      const result = removeItemById(item.children ?? [], itemId, item.id);

      if (result.removedItem) {
        removedItem = result.removedItem;
        removedParentId = result.removedParentId;
        nextItems.push({
          ...item,
          children: result.items,
        });
        return;
      }
    }

    nextItems.push(item);
  });

  return {
    items: nextItems,
    removedItem,
    removedParentId,
  };
};

const findItemById = (items, itemId, parentFolderId = myWorkLocation.id) => {
  for (const item of items) {
    if (item.id === itemId) {
      return {
        item,
        parentFolderId,
      };
    }

    if (item.kind === "folder") {
      const result = findItemById(item.children ?? [], itemId, item.id);

      if (result) return result;
    }
  }

  return null;
};

const hasFolderById = (
  items,
  folderId,
  rootFolderId = myWorkLocation.id,
) => {
  if (folderId === rootFolderId) return true;

  return items.some((item) => {
    if (item.kind !== "folder") return false;
    if (item.id === folderId) return true;

    return hasFolderById(item.children ?? [], folderId, rootFolderId);
  });
};

const getWritableRootForFolderId = (state, folderId = myWorkLocation.id) =>
  WRITABLE_ROOTS.find(
    (root) =>
      root.id === folderId ||
      hasFolderById(state[root.stateKey] ?? [], folderId, root.id),
  ) ?? WRITABLE_ROOTS[0];

const findWritableItemById = (state, itemId) => {
  for (const root of WRITABLE_ROOTS) {
    const result = findItemById(state[root.stateKey] ?? [], itemId, root.id);

    if (result) return { root, ...result };
  }

  return null;
};

const removeWritableItemById = (state, itemId) => {
  for (const root of WRITABLE_ROOTS) {
    const result = removeItemById(state[root.stateKey] ?? [], itemId, root.id);

    if (result.removedItem) return { root, ...result };
  }

  return null;
};

const removeTrashItemById = (items, itemId) => {
  let removedItem = null;

  return {
    items: items.filter((item) => {
      if (item.id !== itemId) return true;

      removedItem = item;
      return false;
    }),
    removedItem,
  };
};

export const createFinderLocations = (
  fileSystemStateOrMyWorkItems = [],
  trashItemsFallback = [],
) => {
  const isStateShape =
    !Array.isArray(fileSystemStateOrMyWorkItems) &&
    fileSystemStateOrMyWorkItems !== null;
  const myWorkItems = isStateShape
    ? fileSystemStateOrMyWorkItems.myWorkItems ?? []
    : fileSystemStateOrMyWorkItems;
  const desktopItems = isStateShape
    ? fileSystemStateOrMyWorkItems.desktopItems ?? []
    : [];
  const applicationsItems = isStateShape
    ? fileSystemStateOrMyWorkItems.applicationsItems ?? []
    : [];
  const downloadsItems = isStateShape
    ? fileSystemStateOrMyWorkItems.downloadsItems ?? []
    : [];
  const documentsItems = isStateShape
    ? fileSystemStateOrMyWorkItems.documentsItems ?? []
    : [];
  const trashItems = isStateShape
    ? fileSystemStateOrMyWorkItems.trashItems ?? []
    : trashItemsFallback;
  const myWork = {
    ...myWorkLocation,
    children: myWorkItems,
  };
  const applications = {
    ...applicationsLocation,
    children: applicationsItems,
  };
  const documents = {
    ...documentsLocation,
    children: [...documentsLocation.children, ...documentsItems],
  };
  const downloads = {
    ...downloadsLocation,
    children: downloadsItems,
  };
  const desktop = {
    ...desktopLocation,
    children: desktopItems,
  };
  const trash = {
    ...trashLocation,
    children: trashItems,
  };

  return {
    applications,
    documents,
    downloads,
    desktop,
    trash,
    "my-work": myWork,
  };
};

const useFileSystemStore = createStore((set, get) => ({
  myWorkItems: cloneManagedItems(initialProjectItems),
  desktopItems: cloneManagedItems(initialDesktopItems),
  applicationsItems: cloneManagedItems(initialApplicationsItems),
  downloadsItems: cloneManagedItems(initialDownloadsItems),
  documentsItems: cloneManagedItems(initialDocumentsItems),
  trashItems: [],
  isPuterBackendEnabled: false,
  isPuterBackendBusy: false,
  puterBackendStatus: "Puter backend disconnected.",
  puterBackendError: null,

  enablePuterBackend: async () => {
    set(() => ({
      isPuterBackendBusy: true,
      puterBackendStatus: "Connecting to Puter...",
      puterBackendError: null,
    }));

    try {
      const account = await getPuterAccount();

      if (!account.signedIn) {
        await signInToPuter();
      }

      let puterSnapshotText = null;

      try {
        puterSnapshotText = await readPuterTextFile(PUTER_FILE_SYSTEM_PATH);
      } catch {
        puterSnapshotText = null;
      }

      if (puterSnapshotText) {
        const puterSnapshot = parsePuterSnapshot(puterSnapshotText);

        set(() => ({
          ...puterSnapshot,
          isPuterBackendEnabled: true,
          isPuterBackendBusy: false,
          puterBackendStatus: "Loaded files from Puter.",
          puterBackendError: null,
        }));
        return;
      }

      set(() => ({
        isPuterBackendEnabled: true,
        isPuterBackendBusy: false,
        puterBackendStatus: "Puter backend connected.",
        puterBackendError: null,
      }));
      queuePuterSnapshotPersist(set, get());
    } catch (error) {
      set(() => ({
        isPuterBackendEnabled: false,
        isPuterBackendBusy: false,
        puterBackendStatus: "Puter backend unavailable.",
        puterBackendError: getPuterErrorMessage(error),
      }));
    }
  },

  syncPuterBackend: async () => {
    set(() => ({
      isPuterBackendBusy: true,
      puterBackendStatus: "Loading files from Puter...",
      puterBackendError: null,
    }));

    try {
      const puterSnapshot = parsePuterSnapshot(
        await readPuterTextFile(PUTER_FILE_SYSTEM_PATH),
      );

      set(() => ({
        ...puterSnapshot,
        isPuterBackendEnabled: true,
        isPuterBackendBusy: false,
        puterBackendStatus: "Loaded files from Puter.",
        puterBackendError: null,
      }));
    } catch (error) {
      set(() => ({
        isPuterBackendBusy: false,
        puterBackendStatus: "Puter load failed.",
        puterBackendError: getPuterErrorMessage(error),
      }));
    }
  },

  addMyWorkUploads: (fileList, targetFolderId = myWorkLocation.id) => {
    if (!fileList?.length) return;

    const uploadedItems = createUploadedItems(fileList);
    const targetRoot = getWritableRootForFolderId(get(), targetFolderId);

    set((state) => ({
      [targetRoot.stateKey]: addItemsToFolder(
        state[targetRoot.stateKey] ?? [],
        targetFolderId,
        uploadedItems,
        targetRoot.id,
      ),
    }));

    if (!get().isPuterBackendEnabled) return;

    set(() => ({
      puterBackendStatus: "Uploading files to Puter...",
      puterBackendError: null,
    }));

    addCloudPathsToItems(uploadedItems)
      .then((cloudItems) => {
        set((state) => ({
          [targetRoot.stateKey]: mergeCloudItemsById(
            state[targetRoot.stateKey] ?? [],
            cloudItems,
          ),
        }));
        queuePuterSnapshotPersist(set, get());
      })
      .catch((error) => {
        set(() => ({
          puterBackendStatus: "Puter upload failed.",
          puterBackendError: getPuterErrorMessage(error),
        }));
      });
  },

  createFolder: (targetFolderId = myWorkLocation.id, name) => {
    const folder = createFolderItem(name);
    const targetRoot = getWritableRootForFolderId(get(), targetFolderId);

    set((state) => ({
      [targetRoot.stateKey]: addItemsToFolder(
        state[targetRoot.stateKey] ?? [],
        targetFolderId,
        [folder],
        targetRoot.id,
      ),
    }));
    queuePuterSnapshotPersist(set, get());

    return folder;
  },

  createTextFile: (targetFolderId = myWorkLocation.id, name) => {
    const file = createTextFileItem(name);
    const targetRoot = getWritableRootForFolderId(get(), targetFolderId);

    set((state) => ({
      [targetRoot.stateKey]: addItemsToFolder(
        state[targetRoot.stateKey] ?? [],
        targetFolderId,
        [file],
        targetRoot.id,
      ),
    }));

    if (!get().isPuterBackendEnabled) {
      queuePuterSnapshotPersist(set, get());
      return file;
    }

    set(() => ({
      puterBackendStatus: "Creating file in Puter...",
      puterBackendError: null,
    }));

    const cloudPath = getCloudFilePath(file);

    writePuterFile(cloudPath, file.description.join("\n\n"))
      .then(() => {
        set((state) => ({
          [targetRoot.stateKey]: mergeCloudItemsById(
            state[targetRoot.stateKey] ?? [],
            [
              {
                ...file,
                cloudPath,
              },
            ],
          ),
        }));
        queuePuterSnapshotPersist(set, get());
      })
      .catch((error) => {
        set(() => ({
          puterBackendStatus: "Puter file create failed.",
          puterBackendError: getPuterErrorMessage(error),
        }));
      });

    return file;
  },

  renameItem: (itemId, name) => {
    const nextName = normalizeItemName(name, "");

    if (!itemId || !nextName) return;

    set((state) =>
      mapWritableRoots(state, (items) =>
        updateItemById(items, itemId, (item) => {
          if (item.canRename === false) return item;

          return {
            ...item,
            name: nextName,
          };
        }),
      ),
    );
    queuePuterSnapshotPersist(set, get());
  },

  setItemTags: (itemId, tags) => {
    if (!itemId) return;

    const normalizedTags = Array.from(
      new Set(
        (tags ?? [])
          .map((tag) => normalizeItemName(tag, "").toLowerCase())
          .filter(Boolean),
      ),
    );

    set((state) =>
      mapWritableRoots(state, (items) =>
        updateItemById(items, itemId, (item) => {
          if (item.canRename === false) return item;

          return {
            ...item,
            tags: normalizedTags,
          };
        }),
      ),
    );
    queuePuterSnapshotPersist(set, get());
  },

  duplicateItem: (itemId) => {
    if (!itemId) return null;

    let duplicate = null;

    set((state) => {
      const result = findWritableItemById(state, itemId);

      if (!result?.item || result.item.canDelete === false) return state;

      duplicate = cloneDuplicatedItem(result.item);

      return {
        [result.root.stateKey]: addItemsToFolder(
          state[result.root.stateKey] ?? [],
          result.parentFolderId,
          [duplicate],
          result.root.id,
        ),
      };
    });
    queuePuterSnapshotPersist(set, get());

    return duplicate;
  },

  createAlias: (itemId) => {
    if (!itemId) return null;

    let alias = null;

    set((state) => {
      const result = findWritableItemById(state, itemId);

      if (!result?.item) return state;

      alias = createAliasItem(result.item);

      return {
        [result.root.stateKey]: addItemsToFolder(
          state[result.root.stateKey] ?? [],
          result.parentFolderId,
          [alias],
          result.root.id,
        ),
      };
    });
    queuePuterSnapshotPersist(set, get());

    return alias;
  },

  moveItemToTrash: (itemId) => {
    if (!itemId) return;

    set((state) => {
      const result = removeWritableItemById(state, itemId);

      if (!result?.removedItem) return state;

      const deletedAt = new Date().toISOString();

      return {
        [result.root.stateKey]: result.items,
        trashItems: [
          {
            ...result.removedItem,
            deletedAt,
            originalRootId: result.root.id,
            originalParentId: result.removedParentId,
            originalDateAdded: result.removedItem.dateAdded,
            dateAdded: deletedAt,
          },
          ...state.trashItems,
        ],
      };
    });
    queuePuterSnapshotPersist(set, get());
  },

  restoreItemFromTrash: (itemId) => {
    if (!itemId) return;

    set((state) => {
      const result = removeTrashItemById(state.trashItems, itemId);

      if (!result.removedItem) return state;

      const restoredItem = { ...result.removedItem };
      const { originalRootId, originalParentId, originalDateAdded } =
        restoredItem;
      const targetRoot =
        WRITABLE_ROOTS.find((root) => root.id === originalRootId) ??
        getWritableRootForFolderId(state, originalParentId);

      delete restoredItem.deletedAt;
      delete restoredItem.originalRootId;
      delete restoredItem.originalParentId;
      delete restoredItem.originalDateAdded;
      const targetFolderId = hasFolderById(
        state[targetRoot.stateKey] ?? [],
        originalParentId,
        targetRoot.id,
      )
        ? originalParentId
        : targetRoot.id;

      return {
        [targetRoot.stateKey]: addItemsToFolder(
          state[targetRoot.stateKey] ?? [],
          targetFolderId,
          [
            {
              ...restoredItem,
              dateAdded: originalDateAdded ?? restoredItem.dateAdded,
            },
          ],
          targetRoot.id,
        ),
        trashItems: result.items,
      };
    });
    queuePuterSnapshotPersist(set, get());
  },

  emptyTrash: () => {
    const cloudPaths = collectCloudPaths(get().trashItems);

    set(() => ({
      trashItems: [],
    }));

    if (get().isPuterBackendEnabled) {
      Promise.allSettled(cloudPaths.map((path) => deletePuterPath(path)));
    }

    queuePuterSnapshotPersist(set, get());
  },
}));

export default useFileSystemStore;
