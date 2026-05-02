import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWrapper";
import {
  getPuterErrorMessage,
  readPuterFile,
  writePuterFile,
} from "../lib/puterClient";
import useFileSystemStore, { createFinderLocations } from "#store/fileSystem";
import useLocationStore from "#store/location";
import useWindowStore from "#store/window";
import {
  AppWindow,
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudUpload,
  Columns3,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FilePlus,
  FileText,
  FolderPlus,
  FolderUp,
  GalleryHorizontal,
  Grid2X2,
  HardDrive,
  Info,
  List,
  ListFilter,
  Monitor,
  PanelRight,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  Tags,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "kind", label: "Kind" },
  { value: "dateAdded", label: "Date Added" },
];

const GROUP_OPTIONS = [
  { value: "none", label: "None" },
  { value: "kind", label: "Kind" },
  { value: "dateAdded", label: "Date Added" },
  { value: "tag", label: "Tag" },
];

const VIEW_MODES = [
  { value: "icon", label: "Icon View", icon: Grid2X2 },
  { value: "list", label: "List View", icon: List },
  { value: "gallery", label: "Gallery View", icon: GalleryHorizontal },
];

const FINDER_TAGS = [
  { value: "red", label: "Red", color: "#ff3b30" },
  { value: "orange", label: "Orange", color: "#ff9500" },
  { value: "yellow", label: "Yellow", color: "#ffcc00" },
  { value: "green", label: "Green", color: "#34c759" },
  { value: "blue", label: "Blue", color: "#007aff" },
  { value: "purple", label: "Purple", color: "#af52de" },
  { value: "gray", label: "Gray", color: "#8e8e93" },
];

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const sidebarIcons = {
  applications: AppWindow,
  documents: FileText,
  downloads: Download,
  desktop: Monitor,
  "my-work": Cloud,
  recents: HardDrive,
  trash: Trash2,
};

const collectDirectoryUploadEntries = async (directoryHandle) => {
  const rootName = directoryHandle.name;
  const entries = [
    {
      kind: "folder",
      name: rootName,
      relativePath: rootName,
    },
  ];

  const collectChildren = async (handle, parentPath) => {
    for await (const childHandle of handle.values()) {
      const relativePath = `${parentPath}/${childHandle.name}`;

      if (childHandle.kind === "directory") {
        entries.push({
          kind: "folder",
          name: childHandle.name,
          relativePath,
        });
        await collectChildren(childHandle, relativePath);
        continue;
      }

      const file = await childHandle.getFile();

      entries.push({
        kind: "file",
        file,
        relativePath,
      });
    }
  };

  await collectChildren(directoryHandle, rootName);

  return entries;
};

const uploadTextFile = async (item, openWindow) => {
  const text = await item.file.text();
  const description = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  openWindow("txtfile", {
    ...item,
    description: description.length ? description : ["This file is empty."],
  });
};

const findFolderById = (items, itemId) => {
  if (!itemId) return null;

  for (const item of items) {
    if (item.id === itemId && item.kind === "folder") return item;

    const childFolder = findFolderById(item.children ?? [], itemId);

    if (childFolder) return childFolder;
  }

  return null;
};

const findItemById = (items, itemId) => {
  if (!itemId) return null;

  for (const item of items) {
    if (item.id === itemId) return item;

    const childItem = findItemById(item.children ?? [], itemId);

    if (childItem) return childItem;
  }

  return null;
};

const findFolderPath = (items, itemId, path = []) => {
  for (const item of items) {
    if (item.kind !== "folder") continue;

    const nextPath = [...path, item];

    if (item.id === itemId) return nextPath;

    const childPath = findFolderPath(item.children ?? [], itemId, nextPath);

    if (childPath) return childPath;
  }

  return null;
};

const flattenItems = (items) =>
  items.flatMap((item) => [
    item,
    ...(item.kind === "folder" ? flattenItems(item.children ?? []) : []),
  ]);

const getKindLabel = (item) => {
  if (item.kind === "folder") return "folder";
  if (item.kind === "alias") {
    return item.aliasTargetKind ? `${item.aliasTargetKind} alias` : "alias";
  }

  return item.fileType ?? item.kind ?? "";
};

const getDateAddedValue = (item, fallbackIndex) => {
  const date = item.dateAdded ?? item.createdAt;
  const time = date ? Date.parse(date) : Number.NaN;

  return Number.isNaN(time) ? fallbackIndex : time;
};

const isFinderManagedItem = (item) => item?.isUploaded || item?.isManaged;

const isVirtualLocation = (location) =>
  ["recents", "tag"].includes(location?.type);

const isFolderLike = (item) => item?.kind === "folder";

const formatItemDate = (item) => {
  const date = item?.dateAdded ?? item?.createdAt;

  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const getDateGroupLabel = (item) => {
  const date = item.dateAdded ?? item.createdAt;
  const parsedDate = date ? new Date(date) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return "No Date";

  const now = new Date();
  const isToday =
    parsedDate.getFullYear() === now.getFullYear() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getDate() === now.getDate();

  if (isToday) return "Today";

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(parsedDate);
};

const getTagLabel = (tagValue) =>
  FINDER_TAGS.find((tag) => tag.value === tagValue)?.label ?? tagValue;

const getPrimaryTag = (item) => item.tags?.[0] ?? null;

const resolveActiveLocation = (
  finderLocations,
  virtualLocations,
  activeLocation,
) => {
  if (activeLocation?.type === "tag") {
    return virtualLocations[`tag-${activeLocation.tag}`] ?? finderLocations.desktop;
  }

  if (activeLocation?.id && virtualLocations[activeLocation.id]) {
    return virtualLocations[activeLocation.id];
  }

  if (activeLocation?.type && finderLocations[activeLocation.type]) {
    return finderLocations[activeLocation.type];
  }

  if (activeLocation?.id === "my-work") return finderLocations["my-work"];

  return (
    findFolderById(Object.values(finderLocations), activeLocation?.id) ??
    finderLocations.desktop
  );
};

const Finder = () => {
  const { activeLocation, setActiveLocation } = useLocationStore();
  const { openWindow } = useWindowStore();
  const myWorkItems = useFileSystemStore((state) => state.myWorkItems);
  const desktopItems = useFileSystemStore((state) => state.desktopItems);
  const applicationsItems = useFileSystemStore(
    (state) => state.applicationsItems,
  );
  const downloadsItems = useFileSystemStore((state) => state.downloadsItems);
  const documentsItems = useFileSystemStore((state) => state.documentsItems);
  const trashItems = useFileSystemStore((state) => state.trashItems);
  const isPuterBackendEnabled = useFileSystemStore(
    (state) => state.isPuterBackendEnabled,
  );
  const isPuterBackendBusy = useFileSystemStore(
    (state) => state.isPuterBackendBusy,
  );
  const puterBackendStatus = useFileSystemStore(
    (state) => state.puterBackendStatus,
  );
  const puterBackendError = useFileSystemStore(
    (state) => state.puterBackendError,
  );
  const enablePuterBackend = useFileSystemStore(
    (state) => state.enablePuterBackend,
  );
  const syncPuterBackend = useFileSystemStore(
    (state) => state.syncPuterBackend,
  );
  const addMyWorkUploads = useFileSystemStore((state) => state.addMyWorkUploads);
  const createFolder = useFileSystemStore((state) => state.createFolder);
  const createTextFile = useFileSystemStore((state) => state.createTextFile);
  const renameItem = useFileSystemStore((state) => state.renameItem);
  const setItemTags = useFileSystemStore((state) => state.setItemTags);
  const duplicateItem = useFileSystemStore((state) => state.duplicateItem);
  const createAlias = useFileSystemStore((state) => state.createAlias);
  const moveItemToTrash = useFileSystemStore((state) => state.moveItemToTrash);
  const restoreItemFromTrash = useFileSystemStore(
    (state) => state.restoreItemFromTrash,
  );
  const emptyTrash = useFileSystemStore((state) => state.emptyTrash);
  const [sortBy, setSortBy] = useState("name");
  const [groupBy, setGroupBy] = useState("none");
  const [foldersFirst, setFoldersFirst] = useState(true);
  const [viewMode, setViewMode] = useState("icon");
  const [showPreview, setShowPreview] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [infoItem, setInfoItem] = useState(null);
  const [locationHistory, setLocationHistory] = useState({
    back: [],
    forward: [],
  });
  const imageUploadRef = useRef(null);
  const fileUploadRef = useRef(null);
  const folderUploadRef = useRef(null);
  const [puterStatus, setPuterStatus] = useState("");
  const [isSavingToPuter, setIsSavingToPuter] = useState(false);

  const finderLocations = useMemo(
    () =>
      createFinderLocations({
        myWorkItems,
        desktopItems,
        applicationsItems,
        downloadsItems,
        documentsItems,
        trashItems,
      }),
    [
      applicationsItems,
      desktopItems,
      documentsItems,
      downloadsItems,
      myWorkItems,
      trashItems,
    ],
  );
  const writableRootLocations = useMemo(
    () => [
      finderLocations.desktop,
      finderLocations.documents,
      finderLocations.downloads,
      finderLocations.applications,
      finderLocations["my-work"],
    ],
    [finderLocations],
  );
  const writableItems = useMemo(
    () => [
      ...desktopItems,
      ...documentsItems,
      ...downloadsItems,
      ...applicationsItems,
      ...myWorkItems,
    ],
    [
      applicationsItems,
      desktopItems,
      documentsItems,
      downloadsItems,
      myWorkItems,
    ],
  );
  const allManagedItems = useMemo(
    () => flattenItems(writableItems),
    [writableItems],
  );
  const virtualLocations = useMemo(() => {
    const recents = {
      id: "recents",
      type: "recents",
      name: "Recents",
      kind: "smart-folder",
      children: [...allManagedItems].sort(
        (a, b) =>
          getDateAddedValue(b, 0) -
            getDateAddedValue(a, 0) ||
          nameCollator.compare(a.name, b.name),
      ),
    };
    const tagLocations = Object.fromEntries(
      FINDER_TAGS.map((tag) => [
        `tag-${tag.value}`,
        {
          id: `tag-${tag.value}`,
          type: "tag",
          tag: tag.value,
          name: tag.label,
          kind: "smart-folder",
          color: tag.color,
          children: allManagedItems.filter((item) =>
            item.tags?.includes(tag.value),
          ),
        },
      ]),
    );

    return {
      recents,
      ...tagLocations,
    };
  }, [allManagedItems]);
  const currentLocation = resolveActiveLocation(
    finderLocations,
    virtualLocations,
    activeLocation,
  );
  const currentPath = useMemo(() => {
    if (!currentLocation) return [];
    if (isVirtualLocation(currentLocation)) return [currentLocation];
    if (currentLocation.id === "my-work") return [finderLocations["my-work"]];

    const managedPath = writableRootLocations
      .map((rootLocation) => findFolderPath([rootLocation], currentLocation.id))
      .find(Boolean);

    return managedPath ?? [currentLocation];
  }, [currentLocation, finderLocations, writableRootLocations]);

  const organizedItems = useMemo(() => {
    const currentItems = currentLocation?.children ?? [];

    return currentItems
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        if (foldersFirst && isFolderLike(a.item) !== isFolderLike(b.item)) {
          return isFolderLike(a.item) ? -1 : 1;
        }

        if (sortBy === "kind") {
          const kindCompare = nameCollator.compare(
            getKindLabel(a.item),
            getKindLabel(b.item),
          );

          return (
            kindCompare ||
            nameCollator.compare(a.item.name, b.item.name) ||
            a.index - b.index
          );
        }

        if (sortBy === "dateAdded") {
          return (
            getDateAddedValue(b.item, b.index) -
              getDateAddedValue(a.item, a.index) ||
            a.index - b.index
          );
        }

        return (
          nameCollator.compare(a.item.name, b.item.name) || a.index - b.index
        );
      })
      .map(({ item }) => item);
  }, [currentLocation?.children, foldersFirst, sortBy]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return organizedItems;

    return organizedItems.filter((item) =>
      [
        item.name,
        item.aliasTargetName,
        getKindLabel(item),
        ...(item.tags ?? []).map(getTagLabel),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [organizedItems, searchQuery]);

  const groupedItems = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: null, items: visibleItems }];
    }

    const groups = new Map();

    visibleItems.forEach((item) => {
      const key =
        groupBy === "kind"
          ? getKindLabel(item) || "Other"
          : groupBy === "dateAdded"
            ? getDateGroupLabel(item)
            : getPrimaryTag(item)
              ? getTagLabel(getPrimaryTag(item))
              : "No Tags";

      if (!groups.has(key)) groups.set(key, []);

      groups.get(key).push(item);
    });

    return Array.from(groups, ([key, items]) => ({
      key,
      label: key,
      items,
    }));
  }, [groupBy, visibleItems]);

  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ?? null;
  const contextMenuItem =
    organizedItems.find((item) => item.id === contextMenu?.itemId) ?? null;
  const galleryItem = selectedItem ?? visibleItems[0] ?? null;
  const previewItem = selectedItem ?? (viewMode === "gallery" ? galleryItem : null);
  const currentLocationIsTrash = currentLocation?.type === "trash";
  const currentLocationIsVirtual = isVirtualLocation(currentLocation);
  const currentLocationIsWritableRoot = writableRootLocations.some(
    (location) => location.id === currentLocation?.id,
  );
  const canUploadToCurrentLocation =
    !currentLocationIsVirtual &&
    (currentLocationIsWritableRoot ||
      isFinderManagedItem(currentLocation));
  const canManageCurrentLocation =
    canUploadToCurrentLocation && !currentLocationIsTrash;
  const canRenameSelectedItem =
    !currentLocationIsTrash &&
    isFinderManagedItem(selectedItem) &&
    selectedItem?.canRename !== false;
  const canTagSelectedItem =
    !currentLocationIsTrash &&
    isFinderManagedItem(selectedItem) &&
    selectedItem?.canRename !== false;
  const canDeleteSelectedItem =
    !currentLocationIsTrash &&
    isFinderManagedItem(selectedItem) &&
    selectedItem?.canDelete !== false;
  const canDuplicateSelectedItem =
    !currentLocationIsTrash &&
    isFinderManagedItem(selectedItem) &&
    selectedItem?.canDelete !== false;
  const canCreateAliasSelectedItem =
    !currentLocationIsTrash &&
    isFinderManagedItem(selectedItem) &&
    selectedItem?.kind !== "alias";
  const canSaveSelectedToPuter =
    !currentLocationIsTrash &&
    selectedItem?.kind === "file" &&
    (selectedItem.file || Array.isArray(selectedItem.description));
  const canRestoreSelectedItem =
    currentLocationIsTrash && Boolean(selectedItem);

  const navigateToLocation = (location, options = {}) => {
    if (!location || location.id === currentLocation?.id) return;

    if (!options.skipHistory) {
      setLocationHistory((state) => ({
        back: [...state.back, currentLocation],
        forward: [],
      }));
    }

    setActiveLocation(location);
    setSelectedItemId(null);
    setContextMenu(null);
    setInfoItem(null);
    setSearchQuery("");
  };

  const navigateBack = () => {
    const previousLocation =
      locationHistory.back[locationHistory.back.length - 1];

    if (!previousLocation) return;

    setLocationHistory((state) => ({
      back: state.back.slice(0, -1),
      forward: [currentLocation, ...state.forward],
    }));
    navigateToLocation(previousLocation, { skipHistory: true });
  };

  const navigateForward = () => {
    const nextLocation = locationHistory.forward[0];

    if (!nextLocation) return;

    setLocationHistory((state) => ({
      back: [...state.back, currentLocation],
      forward: state.forward.slice(1),
    }));
    navigateToLocation(nextLocation, { skipHistory: true });
  };

  const getTargetFolderId = () => currentLocation?.id ?? "my-work";

  const handlePuterBackend = () => {
    if (isPuterBackendEnabled) {
      syncPuterBackend();
      return;
    }

    enablePuterBackend();
  };

  const handleUpload = (event) => {
    const targetFolderId = getTargetFolderId();

    addMyWorkUploads(event.target.files, targetFolderId);

    event.target.value = "";
  };

  const handleFolderUpload = async () => {
    if (!canUploadToCurrentLocation) return;

    if (!window.showDirectoryPicker) {
      folderUploadRef.current?.click();
      return;
    }

    try {
      const directoryHandle = await window.showDirectoryPicker();

      setPuterStatus(`Preparing ${directoryHandle.name}...`);

      const entries = await collectDirectoryUploadEntries(directoryHandle);

      addMyWorkUploads(entries, getTargetFolderId());
      setPuterStatus("");
    } catch (error) {
      if (error?.name === "AbortError") return;

      setPuterStatus(getPuterErrorMessage(error));
    }
  };

  const handleCreateFolder = () => {
    if (!canManageCurrentLocation) return;

    setContextMenu(null);
    const folderName = window.prompt("Folder name", "Untitled Folder");
    if (folderName === null) return;

    const folder = createFolder(getTargetFolderId(), folderName);

    setSelectedItemId(folder.id);
  };

  const handleCreateFile = () => {
    if (!canManageCurrentLocation) return;

    setContextMenu(null);
    const fileName = window.prompt("File name", "Untitled.txt");
    if (fileName === null) return;

    const file = createTextFile(getTargetFolderId(), fileName);

    setSelectedItemId(file.id);
  };

  const handleRename = (item = selectedItem) => {
    if (
      !item ||
      currentLocationIsTrash ||
      !isFinderManagedItem(item) ||
      item.canRename === false
    ) {
      return;
    }

    const nextName = window.prompt("Rename", item.name);
    if (nextName === null) return;

    renameItem(item.id, nextName);
  };

  const handleEditTags = (item = selectedItem) => {
    if (
      !item ||
      currentLocationIsTrash ||
      !isFinderManagedItem(item) ||
      item.canRename === false
    ) {
      return;
    }

    const nextTags = window.prompt(
      "Tags",
      (item.tags ?? []).map(getTagLabel).join(", "),
    );

    if (nextTags === null) return;

    const normalizedTags = nextTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .map((tag) => {
        const predefinedTag = FINDER_TAGS.find(
          (finderTag) =>
            finderTag.value === tag ||
            finderTag.label.toLowerCase() === tag,
        );

        return predefinedTag?.value ?? tag;
      });

    setItemTags(item.id, normalizedTags);
  };

  const handleToggleTag = (item, tagValue) => {
    if (
      !item ||
      currentLocationIsTrash ||
      !isFinderManagedItem(item) ||
      item.canRename === false
    ) {
      return;
    }

    const currentTags = item.tags ?? [];
    const nextTags = currentTags.includes(tagValue)
      ? currentTags.filter((tag) => tag !== tagValue)
      : [...currentTags, tagValue];

    setItemTags(item.id, nextTags);
  };

  const handleDuplicate = (item = selectedItem) => {
    if (!item || currentLocationIsTrash || !isFinderManagedItem(item)) return;

    const duplicate = duplicateItem(item.id);

    setContextMenu(null);

    if (duplicate) setSelectedItemId(duplicate.id);
  };

  const handleCreateAlias = (item = selectedItem) => {
    if (
      !item ||
      currentLocationIsTrash ||
      !isFinderManagedItem(item) ||
      item.kind === "alias"
    ) {
      return;
    }

    const alias = createAlias(item.id);

    setContextMenu(null);

    if (alias) setSelectedItemId(alias.id);
  };

  const handleDelete = (item = selectedItem) => {
    if (
      !item ||
      currentLocationIsTrash ||
      !isFinderManagedItem(item) ||
      item.canDelete === false
    ) {
      return;
    }

    moveItemToTrash(item.id);
    setSelectedItemId(null);
    setContextMenu(null);
  };

  const handleRestore = (item = selectedItem) => {
    if (!item || !currentLocationIsTrash) return;

    restoreItemFromTrash(item.id);
    setSelectedItemId(null);
    setContextMenu(null);
  };

  const handleEmptyTrash = () => {
    if (!trashItems.length) return;

    const shouldEmptyTrash = window.confirm("Permanently delete all Trash items?");

    if (!shouldEmptyTrash) return;

    emptyTrash();
    setSelectedItemId(null);
    setContextMenu(null);
  };

  const createPuterPayload = () => {
    if (selectedItem?.file) return selectedItem.file;

    if (Array.isArray(selectedItem?.description)) {
      return new Blob([selectedItem.description.join("\n\n")], {
        type: "text/plain",
      });
    }

    return null;
  };

  const handleSaveToPuter = async () => {
    if (!canSaveSelectedToPuter) return;

    const payload = createPuterPayload();

    if (!payload) return;

    setIsSavingToPuter(true);
    setPuterStatus("");

    try {
      const safeName = selectedItem.name.replace(/[\\/:*?"<>|]+/g, "-");
      const file = await writePuterFile(`portfolio/uploads/${safeName}`, payload);

      setPuterStatus(`Saved ${file?.name ?? safeName}`);
    } catch (error) {
      setPuterStatus(getPuterErrorMessage(error));
    } finally {
      setIsSavingToPuter(false);
    }
  };

  const resolveAliasItem = (item) => {
    if (item?.kind !== "alias") return item;

    return findItemById(writableItems, item.aliasTargetId);
  };

  const openCloudFile = async (item) => {
    setPuterStatus(`Loading ${item.name}...`);

    try {
      const blob = await readPuterFile(item.cloudPath);
      const fileUrl = URL.createObjectURL(blob);

      setPuterStatus("");

      if (item.fileType === "pdf") return window.open(fileUrl, "_blank");

      if (item.fileType === "txt") {
        const text = await blob.text();
        const description = text
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);

        return openWindow("txtfile", {
          ...item,
          fileUrl,
          description: description.length ? description : ["This file is empty."],
        });
      }

      if (item.fileType === "img") {
        return openWindow("imgfile", {
          ...item,
          fileUrl,
          imageUrl: fileUrl,
        });
      }

      return window.open(fileUrl, "_blank");
    } catch (error) {
      setPuterStatus(getPuterErrorMessage(error));
    }
  };

  const openItem = async (item) => {
    setContextMenu(null);

    const resolvedItem = resolveAliasItem(item);

    if (item.kind === "alias" && !resolvedItem) {
      setPuterStatus("Original item not found.");
      return;
    }

    const itemToOpen = resolvedItem ?? item;

    if (itemToOpen.kind === "folder") {
      navigateToLocation(itemToOpen);
      return;
    }

    if (itemToOpen.fileUrl && itemToOpen.fileType === "pdf") {
      return window.open(itemToOpen.fileUrl, "_blank");
    }
    if (itemToOpen.cloudPath) return openCloudFile(itemToOpen);
    if (itemToOpen.fileType === "pdf") return openWindow("resume", itemToOpen);
    if (["fig", "url"].includes(itemToOpen.fileType) && itemToOpen.href) {
      return window.open(itemToOpen.href, "_blank");
    }

    if (itemToOpen.fileType === "txt" && itemToOpen.file) {
      return uploadTextFile(itemToOpen, openWindow);
    }
    if (itemToOpen.fileType === "txt") return openWindow("txtfile", itemToOpen);
    if (itemToOpen.fileType === "img") return openWindow("imgfile", itemToOpen);
    if (itemToOpen.fileUrl) return window.open(itemToOpen.fileUrl, "_blank");
  };

  const renderSidebarSection = (name, items) => (
    <div className="finder-sidebar-section">
      <h3>{name}</h3>
      <ul>
        {items.map((item) => {
          const SidebarIcon = sidebarIcons[item.type] ?? Tag;
          const isActive = item.id === currentLocation?.id;
          const count = item.children?.length ?? 0;

          return (
            <li key={item.id}>
              <button
                type="button"
                className={isActive ? "active" : ""}
                onClick={() => navigateToLocation(item)}
              >
                {item.color ? (
                  <span
                    className="tag-dot"
                    style={{ "--tag-color": item.color }}
                  />
                ) : item.icon ? (
                  <img className="sidebar-icon" src={item.icon} alt="" />
                ) : (
                  <SidebarIcon className="sidebar-icon" aria-hidden="true" />
                )}
                <span className="sidebar-label">{item.name}</span>
                {count ? <span className="sidebar-count">{count}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const renderItemTags = (item) => {
    if (!item.tags?.length) return null;

    return (
      <span className="item-tags" aria-label="Tags">
        {item.tags.slice(0, 4).map((tagValue) => {
          const tag = FINDER_TAGS.find(
            (finderTag) => finderTag.value === tagValue,
          );

          return (
            <span
              key={tagValue}
              className="tag-dot"
              title={getTagLabel(tagValue)}
              style={{ "--tag-color": tag?.color ?? "#8e8e93" }}
            />
          );
        })}
      </span>
    );
  };

  const renderPreviewArtwork = (item, className = "") => {
    const source =
      item.fileType === "img"
        ? item.imageUrl ?? item.fileUrl ?? item.image
        : null;

    return (
      <div className={`preview-artwork ${className}`}>
        {source ? (
          <img src={source} alt={item.name} />
        ) : (
          <img src={item.icon} alt="" />
        )}
        {item.kind === "alias" ? <span className="alias-badge">Alias</span> : null}
      </div>
    );
  };

  const renderFinderItem = (item) => (
    <li
      key={item.id}
      className={`finder-item ${item.id === selectedItemId ? "selected" : ""}`}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        setSelectedItemId(item.id);
        setContextMenu(null);
      }}
      onDoubleClick={() => openItem(item)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedItemId(item.id);
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          itemId: item.id,
        });
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          openItem(item);
        }

        if (
          (event.key === "Backspace" || event.key === "Delete") &&
          isFinderManagedItem(item) &&
          !currentLocationIsTrash
        ) {
          handleDelete(item);
        }
      }}
    >
      <span className="item-icon-wrap">
        <img src={item.icon} alt="" />
        {item.kind === "alias" ? <span className="alias-corner" /> : null}
      </span>
      <span className="item-name">{item.name}</span>
      <span className="item-kind">{getKindLabel(item)}</span>
      <span className="item-date">{formatItemDate(item)}</span>
      {renderItemTags(item)}
    </li>
  );

  const renderItemCollection = () => {
    if (!visibleItems.length) {
      return (
        <div className="empty-state">
          <Search className="size-5" aria-hidden="true" />
          <p>No items found</p>
        </div>
      );
    }

    if (viewMode === "gallery") {
      return (
        <div
          className="gallery-view"
          onClick={() => {
            setSelectedItemId(null);
            setContextMenu(null);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setSelectedItemId(null);
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              itemId: null,
            });
          }}
        >
          <div className="gallery-stage">
            {galleryItem ? renderPreviewArtwork(galleryItem, "large") : null}
            {galleryItem ? (
              <div className="gallery-meta">
                <h3>{galleryItem.name}</h3>
                <p>{getKindLabel(galleryItem)}</p>
              </div>
            ) : null}
          </div>
          <ul className="gallery-strip">
            {visibleItems.map((item) => renderFinderItem(item))}
          </ul>
        </div>
      );
    }

    return (
      <ul
        className={`content ${viewMode === "list" ? "list-view" : "icon-view"}`}
        onClick={() => {
          setSelectedItemId(null);
          setContextMenu(null);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setSelectedItemId(null);
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            itemId: null,
          });
        }}
      >
        {groupedItems.map((group) => (
          <Fragment key={group.key}>
            {group.label ? (
              <li className="group-heading" aria-hidden="true">
                {group.label}
              </li>
            ) : null}
            {group.items.map((item) => renderFinderItem(item))}
          </Fragment>
        ))}
      </ul>
    );
  };

  const favoriteLocations = [
    finderLocations.desktop,
    finderLocations.documents,
    finderLocations.downloads,
    finderLocations.applications,
  ];
  const cloudLocations = [finderLocations["my-work"]];
  const smartLocations = [virtualLocations.recents];
  const tagLocations = FINDER_TAGS.map(
    (tag) => virtualLocations[`tag-${tag.value}`],
  );
  const localLocations = [finderLocations.trash];

  return (
    <>
      <div id="window-header" className="finder-window-header window-drag-handle">
        <WindowControls target="finder" />
        <div className="finder-title">
          <h2>{currentLocation?.name ?? "Finder"}</h2>
          <span>{visibleItems.length} items</span>
        </div>
        <div
          className="finder-nav-controls"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            title="Back"
            disabled={!locationHistory.back.length}
            onClick={navigateBack}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Forward"
            disabled={!locationHistory.forward.length}
            onClick={navigateForward}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="finder-shell">
        <aside className="finder-sidebar">
          {renderSidebarSection("Favorites", favoriteLocations)}
          {renderSidebarSection("iCloud", cloudLocations)}
          {renderSidebarSection("Smart Folders", smartLocations)}
          {renderSidebarSection("Tags", tagLocations)}
          {renderSidebarSection("Locations", localLocations)}
        </aside>

        <section className="finder-main">
          <div className="finder-toolbar">
            <div className="toolbar-group">
              <button
                type="button"
                className="action-button"
                title={
                  isPuterBackendEnabled
                    ? "Reload files from Puter"
                    : "Use Puter as file backend"
                }
                disabled={isPuterBackendBusy}
                onClick={handlePuterBackend}
              >
                {isPuterBackendEnabled ? (
                  <RefreshCw className="size-4" aria-hidden="true" />
                ) : (
                  <Cloud className="size-4" aria-hidden="true" />
                )}
                <span>
                  {isPuterBackendBusy
                    ? "Syncing"
                    : isPuterBackendEnabled
                      ? "Sync"
                      : "Cloud"}
                </span>
              </button>
              <button
                type="button"
                className="action-button"
                title="Create folder"
                disabled={!canManageCurrentLocation}
                onClick={handleCreateFolder}
              >
                <FolderPlus className="size-4" aria-hidden="true" />
                <span>Folder</span>
              </button>
              <button
                type="button"
                className="action-button"
                title="Create text file"
                disabled={!canManageCurrentLocation}
                onClick={handleCreateFile}
              >
                <FilePlus className="size-4" aria-hidden="true" />
                <span>File</span>
              </button>
              <button
                type="button"
                className="action-button"
                title="Upload files"
                disabled={!canUploadToCurrentLocation}
                onClick={() => fileUploadRef.current?.click()}
              >
                <Upload className="size-4" aria-hidden="true" />
                <span>Upload</span>
              </button>
              <button
                type="button"
                className="action-button"
                title="Upload folder"
                disabled={!canUploadToCurrentLocation}
                onClick={handleFolderUpload}
              >
                <FolderUp className="size-4" aria-hidden="true" />
                <span>Folder</span>
              </button>
              <input
                ref={imageUploadRef}
                className="hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
              />
              <input
                ref={fileUploadRef}
                className="hidden"
                type="file"
                multiple
                onChange={handleUpload}
              />
              <input
                ref={folderUploadRef}
                className="hidden"
                type="file"
                multiple
                directory=""
                webkitdirectory=""
                onChange={handleUpload}
              />
            </div>

            <div className="toolbar-group">
              {currentLocationIsTrash ? (
                <>
                  <button
                    type="button"
                    className="action-button"
                    title="Restore selected item"
                    disabled={!canRestoreSelectedItem}
                    onClick={() => handleRestore()}
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                    <span>Restore</span>
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    title="Empty Trash"
                    disabled={!trashItems.length}
                    onClick={handleEmptyTrash}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span>Empty</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    title="Rename selected item"
                    disabled={!canRenameSelectedItem}
                    onClick={handleRename}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Duplicate selected item"
                    disabled={!canDuplicateSelectedItem}
                    onClick={() => handleDuplicate()}
                  >
                    <Copy className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Make alias"
                    disabled={!canCreateAliasSelectedItem}
                    onClick={() => handleCreateAlias()}
                  >
                    <Archive className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Tags"
                    disabled={!canTagSelectedItem}
                    onClick={() => handleEditTags()}
                  >
                    <Tags className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    title="Move selected item to Trash"
                    disabled={!canDeleteSelectedItem}
                    onClick={() => handleDelete()}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Save selected item to Puter"
                    disabled={!canSaveSelectedToPuter || isSavingToPuter}
                    onClick={handleSaveToPuter}
                  >
                    <CloudUpload className="size-4" aria-hidden="true" />
                  </button>
                </>
              )}
              <button
                type="button"
                className="icon-button"
                title="Get Info"
                disabled={!selectedItem}
                onClick={() => setInfoItem(selectedItem)}
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`icon-button ${showPreview ? "active" : ""}`}
                title="Preview pane"
                onClick={() => setShowPreview((value) => !value)}
              >
                <PanelRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="toolbar-group toolbar-organize">
              <label className="organize-control">
                <ListFilter className="size-4" aria-hidden="true" />
                <span>Sort</span>
                <select
                  aria-label="Sort files"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="organize-control">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                <span>Group</span>
                <select
                  aria-label="Group files"
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value)}
                >
                  {GROUP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="folders-first-toggle">
                <input
                  type="checkbox"
                  checked={foldersFirst}
                  onChange={(event) => setFoldersFirst(event.target.checked)}
                />
                <span>Folders first</span>
              </label>
              <div className="view-toggle">
                {VIEW_MODES.map((mode) => {
                  const ViewIcon = mode.icon;

                  return (
                    <button
                      key={mode.value}
                      type="button"
                      className={viewMode === mode.value ? "active" : ""}
                      title={mode.label}
                      onClick={() => setViewMode(mode.value)}
                    >
                      <ViewIcon className="size-4" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="finder-search">
              <Search className="size-4" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search current folder"
                placeholder="Search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="path-bar">
            <div>
              {currentPath.map((location, index) => (
                <button
                  type="button"
                  key={location.id}
                  onClick={() => navigateToLocation(location)}
                >
                  {index > 0 ? <span>/</span> : null}
                  {location.name}
                </button>
              ))}
            </div>
            <span>
              {puterStatus ||
                puterBackendError ||
                puterBackendStatus ||
                "Ready"}
            </span>
          </div>

          <div className="finder-content">{renderItemCollection()}</div>
        </section>

        {showPreview ? (
          <aside className="preview-pane">
            <div className="preview-header">
              <Eye className="size-4" aria-hidden="true" />
              <h3>Preview</h3>
              <button
                type="button"
                title="Hide preview"
                onClick={() => setShowPreview(false)}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {previewItem ? (
              <div className="preview-body">
                {renderPreviewArtwork(previewItem)}
                <h4>{previewItem.name}</h4>
                <dl>
                  <div>
                    <dt>Kind</dt>
                    <dd>{getKindLabel(previewItem)}</dd>
                  </div>
                  {formatItemDate(previewItem) ? (
                    <div>
                      <dt>Added</dt>
                      <dd>{formatItemDate(previewItem)}</dd>
                    </div>
                  ) : null}
                  {previewItem.kind === "folder" ? (
                    <div>
                      <dt>Items</dt>
                      <dd>{previewItem.children?.length ?? 0}</dd>
                    </div>
                  ) : null}
                  {previewItem.kind === "alias" ? (
                    <div>
                      <dt>Original</dt>
                      <dd>{previewItem.aliasTargetName}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="preview-actions">
                  <button type="button" onClick={() => openItem(previewItem)}>
                    <ExternalLink className="size-4" aria-hidden="true" />
                    <span>Open</span>
                  </button>
                  <button type="button" onClick={() => setInfoItem(previewItem)}>
                    <Info className="size-4" aria-hidden="true" />
                    <span>Info</span>
                  </button>
                </div>
                {!currentLocationIsTrash && isFinderManagedItem(previewItem) ? (
                  <div className="preview-tags">
                    <h5>Tags</h5>
                    <div>
                      {FINDER_TAGS.map((tag) => (
                        <button
                          key={tag.value}
                          type="button"
                          className={
                            previewItem.tags?.includes(tag.value) ? "active" : ""
                          }
                          style={{ "--tag-color": tag.color }}
                          title={tag.label}
                          onClick={() => handleToggleTag(previewItem, tag.value)}
                        >
                          {previewItem.tags?.includes(tag.value) ? (
                            <Check className="size-3" aria-hidden="true" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="preview-empty">
                <Columns3 className="size-6" aria-hidden="true" />
                <p>Select an item</p>
              </div>
            )}
          </aside>
        ) : null}
      </div>

      {contextMenu ? (
        <div
          className="finder-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {contextMenuItem ? (
            <button type="button" onClick={() => openItem(contextMenuItem)}>
              Open
            </button>
          ) : null}
          {contextMenuItem &&
          !currentLocationIsTrash &&
          isFinderManagedItem(contextMenuItem) &&
          contextMenuItem.canDelete !== false ? (
            <button type="button" onClick={() => handleDuplicate(contextMenuItem)}>
              Duplicate
            </button>
          ) : null}
          {contextMenuItem &&
          !currentLocationIsTrash &&
          isFinderManagedItem(contextMenuItem) &&
          contextMenuItem.kind !== "alias" ? (
            <button
              type="button"
              onClick={() => handleCreateAlias(contextMenuItem)}
            >
              Make Alias
            </button>
          ) : null}
          {contextMenuItem ? (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                setSelectedItemId(contextMenuItem.id);
                setInfoItem(contextMenuItem);
              }}
            >
              Get Info
            </button>
          ) : null}
          {contextMenuItem &&
          !currentLocationIsTrash &&
          isFinderManagedItem(contextMenuItem) &&
          contextMenuItem.canRename !== false ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setSelectedItemId(contextMenuItem.id);
                  handleRename(contextMenuItem);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setSelectedItemId(contextMenuItem.id);
                  handleEditTags(contextMenuItem);
                }}
              >
                Tags...
              </button>
            </>
          ) : null}
          {contextMenuItem &&
          !currentLocationIsTrash &&
          isFinderManagedItem(contextMenuItem) &&
          contextMenuItem.canDelete !== false ? (
            <button
              type="button"
              className="danger"
              onClick={() => handleDelete(contextMenuItem)}
            >
              Move to Trash
            </button>
          ) : null}
          {contextMenuItem && currentLocationIsTrash ? (
            <button type="button" onClick={() => handleRestore(contextMenuItem)}>
              Restore
            </button>
          ) : null}
          {!contextMenuItem && canManageCurrentLocation ? (
            <>
              <button type="button" onClick={handleCreateFolder}>
                New Folder
              </button>
              <button type="button" onClick={handleCreateFile}>
                New Text File
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  fileUploadRef.current?.click();
                }}
              >
                Upload Files
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  handleFolderUpload();
                }}
              >
                Upload Folder
              </button>
            </>
          ) : null}
          {!contextMenuItem && currentLocationIsTrash ? (
            <button type="button" className="danger" onClick={handleEmptyTrash}>
              Empty Trash
            </button>
          ) : null}
        </div>
      ) : null}

      {infoItem ? (
        <div className="get-info-popover">
          <div className="get-info-header">
            <Info className="size-4" aria-hidden="true" />
            <h3>Get Info</h3>
            <button type="button" onClick={() => setInfoItem(null)}>
              Close
            </button>
          </div>
          <div className="get-info-body">
            {renderPreviewArtwork(infoItem)}
            <div>
              <p className="name">{infoItem.name}</p>
              <p>{getKindLabel(infoItem)}</p>
              {formatItemDate(infoItem) ? <p>{formatItemDate(infoItem)}</p> : null}
              {infoItem.kind === "folder" ? (
                <p>{infoItem.children?.length ?? 0} items</p>
              ) : null}
              {infoItem.kind === "alias" ? (
                <p>Original: {infoItem.aliasTargetName}</p>
              ) : null}
              {infoItem.tags?.length ? (
                <p>Tags: {infoItem.tags.map(getTagLabel).join(", ")}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const FinderWindow = WindowWrapper(Finder, "finder");

export default FinderWindow;
