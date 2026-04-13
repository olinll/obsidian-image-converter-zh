import {
    App,
    Modal,
    Notice,
    PluginSettingTab,
    Setting,
    ButtonComponent,
    setIcon,
    TextComponent,
    TFile
} from "obsidian";
import ImageConverterPlugin from "./main";
import { VariableProcessor } from "./VariableProcessor";
import { LinkFormat, PathFormat, LinkFormatSettings, LinkFormatPreset } from "./LinkFormatSettings";
import { NonDestructiveResizeSettings, NonDestructiveResizePreset, ResizeDimension, ResizeScaleMode, ResizeUnits } from "./NonDestructiveResizeSettings";
import { ToolPreset } from "./ImageAnnotation";
import { SingleImageModalSettings } from './ProcessSingleImageModal';
import { findFfmpegExecutablePath, normalizeExecutablePath } from "./utils/ffmpegPath";
import { addInfoIcon } from "./utils/settingInfo";

import Sortable from "sortablejs";


// --- Typedefs and Interfaces ---
export type ModalBehavior = "always" | "never" | "ask";

export type FolderPresetType =
    | "DEFAULT"
    | "ROOT"
    | "CURRENT"
    | "SUBFOLDER"
    | "CUSTOM";
export type FilenamePresetType =
    | "DEFAULT"
    | "ORIGINAL"
    | "NOTENAME_TIMESTAMP"
    | "CUSTOM";
export type OutputFormat = "WEBP" | "JPEG" | "PNG" | "ORIGINAL" | "NONE" | "PNGQUANT" | "AVIF";
export type ResizeMode =
    | "None"
    | "Fit"
    | "Fill"
    | "LongestEdge"
    | "ShortestEdge"
    | "Width"
    | "Height";
export type EnlargeReduce = "Auto" | "Reduce" | "Enlarge";

export type ActivePresetSetting =
    | "selectedFolderPreset"
    | "selectedFilenamePreset"
    | "selectedConversionPreset"
    | "selectedLinkFormatPreset"
    | "selectedResizePreset";

// Using interfaces is generally preferred for object shapes
export interface FolderPreset {
    type: FolderPresetType;
    customTemplate?: string; // Only used for CUSTOM type
    name: string;
}

export interface FilenamePreset {
    // type: FilenamePresetType;
    customTemplate?: string; // Only used for CUSTOM type
    name: string;
    skipRenamePatterns: string;
    conflictResolution: "reuse" | "increment";
}

// Interface for a Conversion Preset
export interface ConversionPreset {
    name: string;
    outputFormat: OutputFormat;
    quality: number;
    colorDepth: number;
    resizeMode: ResizeMode;
    desiredWidth: number;
    desiredHeight: number;
    desiredLongestEdge: number;
    enlargeOrReduce: EnlargeReduce;
    allowLargerFiles: boolean;
    revertToOriginalIfLarger?: boolean;
    minimumCompressionSavingsInKB?: number;
    skipConversionPatterns: string;
    pngquantExecutablePath?: string;
    pngquantQuality?: string;
    ffmpegExecutablePath?: string;
    ffmpegCrf?: number;
    ffmpegPreset?: string;
    detectedEncoder?: string;  // Cached detected encoder for AVIF
}

// Interface for UI state management (more structured)
interface PresetUIState {
    folder: PresetCategoryUIState<FolderPreset>;
    filename: PresetCategoryUIState<FilenamePreset>;
    conversion: PresetCategoryUIState<ConversionPreset>;
    linkformat: PresetCategoryUIState<LinkFormatPreset>
    globalPresetVisible: boolean; // Track visibility of preset categories
    resize: PresetCategoryUIState<NonDestructiveResizePreset>;
    imageAlignmentSectionCollapsed: boolean;
    imageDragResizeSectionCollapsed: boolean;
    imageCaptionSectionCollapsed: boolean; // ADDED: Track caption section collapse state
}

interface PresetCategoryUIState<T> {
    editingPreset: T | null;
    newPreset: T | null;
}

export interface GlobalPreset {
    name: string;
    folderPreset: string; // Name of the selected FolderPreset
    filenamePreset: string; // Name of the selected FilenamePreset
    conversionPreset: string; // Name of the selected ConversionPreset
    linkFormatPreset: string; // Name of the selected LinkFormatPreset
    resizePreset: string;
}

// Interface for settings
export interface ImageConverterSettings {
    folderPresets: FolderPreset[];
    selectedFolderPreset: string;
    filenamePresets: FilenamePreset[];
    selectedFilenamePreset: string;
    conversionPresets: ConversionPreset[];
    selectedConversionPreset: string;
    globalPresets: GlobalPreset[];
    selectedGlobalPreset: string; // Currently selected global preset (if any)
    modalSessionState?: {
        customFolderOverride?: string;
        customFilenameOverride?: string;
        lastUsedFolderPreset?: string;
        lastUsedFilenamePreset?: string;
    };
    outputFormat: OutputFormat;
    quality: number;
    colorDepth: number;

    pngquantQuality: string;

    ffmpegExecutablePath: string;  // For AVIF
    ffmpegCrf: number;             // For AVIF
    ffmpegPreset: string;          // For AVIF
    detectedEncoder?: string;      // Cached detected encoder for AVIF

    resizeMode: ResizeMode;
    desiredWidth: number;
    desiredHeight: number;
    desiredLongestEdge: number;
    enlargeOrReduce: EnlargeReduce;
    allowLargerFiles: boolean;
    showPresetModal: {
        folder: boolean;
        filename: boolean;
    };
    subfolderTemplate: string;
    linkFormatSettings: LinkFormatSettings;
    nonDestructiveResizeSettings: NonDestructiveResizeSettings;

    resizeCursorLocation: "front" | "back" | "below" |"none";
    dropPasteCursorLocation: "front" | "back";

    neverProcessFilenames: string;
    modalBehavior: ModalBehavior;

    singleImageModalSettings?: SingleImageModalSettings;

    ProcessCurrentNoteconvertTo: string;
    ProcessCurrentNotequality: number;
    ProcessCurrentNoteResizeModalresizeMode: string;
    ProcessCurrentNoteresizeModaldesiredWidth: number;
    ProcessCurrentNoteresizeModaldesiredHeight: number;
    ProcessCurrentNoteresizeModaldesiredLength: number;
    ProcessCurrentNoteskipImagesInTargetFormat: boolean;
    ProcessCurrentNoteEnlargeOrReduce: 'Always' | 'Reduce' | 'Enlarge';
    ProcessCurrentNoteSkipFormats: string;
    ProcessCurrentNoteIgnoreFolders: string;

    ProcessAllVaultconvertTo: string;
    ProcessAllVaultquality: number;
    ProcessAllVaultResizeModalresizeMode: string;
    ProcessAllVaultResizeModaldesiredWidth: number;
    ProcessAllVaultResizeModaldesiredHeight: number;
    ProcessAllVaultResizeModaldesiredLength: number;
    ProcessAllVaultEnlargeOrReduce: string;
    ProcessAllVaultSkipFormats: string;
    ProcessAllVaultskipImagesInTargetFormat: boolean;

    annotationPresets: {
        drawing: ToolPreset[];
        arrow: ToolPreset[];
        text: ToolPreset[];
    };

    isImageAlignmentEnabled: boolean;
    imageAlignmentDefaultAlignment: 'none' | 'left' | 'center' | 'right';
    imageAlignmentCacheCleanupInterval: number;
    imageAlignmentCacheLocation: "config" | "plugin";

    isDragResizeEnabled: boolean;
    isDragAspectRatioLocked: boolean;
    isScrollResizeEnabled: boolean;
    isResizeInReadingModeEnabled: boolean;
    disableObsidianImageSelectionOnClick: boolean;

    resizeSensitivity: number;
    scrollwheelModifier: "None" | "Shift" | "Control" | "Alt" | "Meta";
    isImageResizeEnbaled: boolean;
    resizeState: { isResizing: boolean; };

    enableContextMenu: boolean;

    showSpaceSavedNotification: boolean;
    revertToOriginalIfLarger: boolean;
    minimumCompressionSavingsInKB: number;

    enableImageCaptions: boolean;
    skipCaptionExtensions: string;
    captionFontSize: string;
    captionColor: string;
    captionFontStyle: string;
    captionBackgroundColor: string;
    captionPadding: string;
    captionBorderRadius: string;
    captionOpacity: string;
    captionFontWeight: string;
    captionTextTransform: string;
    captionLetterSpacing: string;
    captionBorder: string;
    captionMarginTop: string;
    captionAlignment: string;
}

// --- Default Settings ---

export const DEFAULT_SETTINGS: ImageConverterSettings = {
    folderPresets: [
        { type: "DEFAULT", name: "默认 (Obsidian 设置)" },
        { type: "ROOT", name: "根目录" },
        { type: "CURRENT", name: "与当前笔记相同的文件夹" },
        // { type: "SUBFOLDER", name: "In subfolder under current note" }, // Example for adding SUBFOLDER later
    ],
    selectedFolderPreset: "默认 (Obsidian 设置)",
    filenamePresets: [
        // { name: "Default (No Change)", customTemplate: "{imagename}", skipRenamePatterns: "", conflictResolution: "increment" }, // This must be disabled!!!
        { name: "保留原始名称", customTemplate: "{imagename}", skipRenamePatterns: "", conflictResolution: "increment" },
        { name: "笔记名-时间戳", customTemplate: "{notename}-{timestamp}", skipRenamePatterns: "", conflictResolution: "increment" },
    ],
    selectedFilenamePreset: "保留原始名称",
    outputFormat: "NONE",
    quality: 100,
    colorDepth: 1,

    pngquantQuality: "65-80",

    ffmpegExecutablePath: "",  // Default for AVIF
    ffmpegCrf: 23,             // Default for AVIF
    ffmpegPreset: "medium",    // Default for AVIF
    detectedEncoder: undefined, // No cached encoder by default

    resizeMode: "None",
    desiredWidth: 800,
    desiredHeight: 600,
    desiredLongestEdge: 1000,
    enlargeOrReduce: "Auto",
    allowLargerFiles: false,
    showPresetModal: {
        folder: false,
        filename: false,
    },
    subfolderTemplate: "",
    conversionPresets: [
        {
            name: "无",
            outputFormat: "NONE",
            quality: 100,
            colorDepth: 1,
            resizeMode: "None",
            desiredWidth: 800,
            desiredHeight: 600,
            desiredLongestEdge: 1000,
            enlargeOrReduce: "Auto",
            allowLargerFiles: false,
            revertToOriginalIfLarger: false,
            minimumCompressionSavingsInKB: 30,
            skipConversionPatterns: "",
            pngquantExecutablePath: "",
            pngquantQuality: "65-80",
            ffmpegExecutablePath: "",
            ffmpegCrf: 23,
            ffmpegPreset: "medium",
        },
        {
            name: "WEBP (75, 不调整大小)",
            outputFormat: "WEBP",
            quality: 75,
            colorDepth: 1,
            resizeMode: "None",
            desiredWidth: 800,
            desiredHeight: 600,
            desiredLongestEdge: 1000,
            enlargeOrReduce: "Auto",
            allowLargerFiles: false,
            revertToOriginalIfLarger: false,
            minimumCompressionSavingsInKB: 30,
            skipConversionPatterns: "",
            pngquantExecutablePath: "",
            pngquantQuality: "65-80",
            ffmpegExecutablePath: "",
            ffmpegCrf: 23,
            ffmpegPreset: "medium",
        },
        {
            name: "PNGQUANT (65-80, 不调整大小)",
            outputFormat: "PNGQUANT",
            quality: 75, //Not really used, but can be used for unified settings,
            colorDepth: 1,
            resizeMode: "None",
            desiredWidth: 800,
            desiredHeight: 600,
            desiredLongestEdge: 1000,
            enlargeOrReduce: "Auto",
            allowLargerFiles: false,
            revertToOriginalIfLarger: false,
            minimumCompressionSavingsInKB: 30,
            skipConversionPatterns: "",
            pngquantExecutablePath: "",
            pngquantQuality: "65-80",
            ffmpegExecutablePath: "",
            ffmpegCrf: 23,
            ffmpegPreset: "medium",
        },
    ],
    selectedConversionPreset: "无",
    globalPresets: [
        {
            name: "WebP 75",
            folderPreset: "默认 (Obsidian 设置)",
            filenamePreset: "笔记名-时间戳",
            conversionPreset: "WEBP (75, 不调整大小)",
            linkFormatPreset: "默认 (Wikilink, 最短路径)",
            resizePreset: "默认 (不调整大小)"
        }
    ],
    selectedGlobalPreset: "", // Base default remains none; fresh installs opt into "WebP 75" in loadSettings()
    linkFormatSettings: new LinkFormatSettings(),
    nonDestructiveResizeSettings: new NonDestructiveResizeSettings(),
    resizeCursorLocation: "none",
    dropPasteCursorLocation: "back",
    neverProcessFilenames: "",
    modalBehavior: "never",

    singleImageModalSettings: undefined,

    ProcessCurrentNoteconvertTo: 'webp',
    ProcessCurrentNotequality: 0.75,
    ProcessCurrentNoteResizeModalresizeMode: 'None',
    ProcessCurrentNoteresizeModaldesiredWidth: 600,
    ProcessCurrentNoteresizeModaldesiredHeight: 800,
    ProcessCurrentNoteresizeModaldesiredLength: 800,
    ProcessCurrentNoteskipImagesInTargetFormat: false,
    ProcessCurrentNoteEnlargeOrReduce: 'Always',
    ProcessCurrentNoteSkipFormats: 'tif,tiff,heic',
    ProcessCurrentNoteIgnoreFolders: '',

    ProcessAllVaultconvertTo: "disabled",
    ProcessAllVaultquality: 0.75,
    ProcessAllVaultResizeModalresizeMode: "None",
    ProcessAllVaultResizeModaldesiredWidth: 500,
    ProcessAllVaultResizeModaldesiredHeight: 500,
    ProcessAllVaultResizeModaldesiredLength: 500,
    ProcessAllVaultEnlargeOrReduce: "Always",
    ProcessAllVaultSkipFormats: "",
    ProcessAllVaultskipImagesInTargetFormat: false,

    annotationPresets: {
        drawing: [
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 2 },
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 2 },
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 2 }
        ] as ToolPreset[],
        arrow: [
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 8 },
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 8 },
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 8 }
        ] as ToolPreset[],
        text: [
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 24, backgroundColor: 'transparent', backgroundOpacity: 0.7 },
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 24, backgroundColor: 'transparent', backgroundOpacity: 0.7 },
            { color: '#000000', opacity: 1, blendMode: 'source-over', size: 24, backgroundColor: 'transparent', backgroundOpacity: 0.7 }
        ] as ToolPreset[]
    },

    isImageAlignmentEnabled: true,
    imageAlignmentDefaultAlignment: 'none',
    imageAlignmentCacheCleanupInterval: 3600000,
    imageAlignmentCacheLocation: "config",

    isDragResizeEnabled: true,
    isScrollResizeEnabled: true,
    isDragAspectRatioLocked: true,
    isResizeInReadingModeEnabled: false,
    disableObsidianImageSelectionOnClick: false,

    resizeSensitivity: 0.1,
    scrollwheelModifier: "Shift",
    isImageResizeEnbaled: true,
    resizeState: { isResizing: false },

    enableContextMenu: true,

    showSpaceSavedNotification: true,
    revertToOriginalIfLarger: false,
    minimumCompressionSavingsInKB: 30,

    enableImageCaptions: false,
    skipCaptionExtensions: "icns",
    captionFontSize: "var(--font-smaller)",
    captionColor: "var(--text-gray)",
    captionFontStyle: "italic",
    captionBackgroundColor: 'transparent',
    captionPadding: '2px 4px',
    captionBorderRadius: '0',
    captionOpacity: '1',
    captionFontWeight: 'normal',
    captionTextTransform: 'none',
    captionLetterSpacing: 'normal',
    captionBorder: 'none',
    captionMarginTop: '4px',
    captionAlignment: 'center'
};

// --- Settings Tab Class ---

export class ImageConverterSettingTab extends PluginSettingTab {
    private cachedFirstMarkdownFile?: TFile;

    private getCachedFirstMarkdownFile(): TFile | undefined {
        if (!this.cachedFirstMarkdownFile) {
            [this.cachedFirstMarkdownFile] = this.app.vault.getMarkdownFiles(); // Cache for this settings-tab instance
        }
        return this.cachedFirstMarkdownFile;
    }

    /**
     * Creates preview context, using real vault files when available, or mock data as fallback.
     * This ensures previews always work even in empty vaults.
     */
    private getPreviewContext(): { file: TFile | File; activeFile: TFile } {
        const activeFile = this.app.workspace.getActiveFile();
        const firstImage = this.app.vault.getFiles().find(file => file.extension.match(/^(jpg|jpeg|png|gif|webp)$/i));
        const firstNote = (activeFile?.extension === 'md') ? activeFile : this.getCachedFirstMarkdownFile();

        // Use real image if available, otherwise create mock File
        const imageFile: TFile | File = (activeFile?.extension.match(/^(jpg|jpeg|png|gif|webp)$/i) ? activeFile : firstImage)
            ?? new File([new Uint8Array(256 * 1024)], 'example-image.png', { type: 'image/png' });

        // Use real note if available, otherwise create mock TFile-like object
        const noteFile: TFile = firstNote ?? ({
            basename: 'MyNote',
            name: 'MyNote.md',
            path: 'MyNote.md',
            extension: 'md',
            parent: this.app.vault.getRoot(),
            stat: { mtime: Date.now(), ctime: Date.now(), size: 1024 },
            vault: this.app.vault
        // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- Mock object for preview in empty vaults
        } as unknown as TFile);

        return { file: imageFile, activeFile: noteFile };
    }
    activeTab: "folder" | "filename" | "conversion" | "linkformat" | "resize" = "folder";
    presetUIState: PresetUIState;
    editingPresetKey: string | null = null;
    formContainer: HTMLElement;

    constructor(app: App, private plugin: ImageConverterPlugin) {
        super(app, plugin);
        // Initialize UI state with everything collapsed
        this.presetUIState = {
            folder: { editingPreset: null, newPreset: null },
            filename: { editingPreset: null, newPreset: null },
            conversion: { editingPreset: null, newPreset: null },
            linkformat: { editingPreset: null, newPreset: null },
            globalPresetVisible: true,
            resize: { editingPreset: null, newPreset: null },
            imageAlignmentSectionCollapsed: true,
            imageDragResizeSectionCollapsed: true,
            imageCaptionSectionCollapsed: true // ADDED: Initialize caption section collapse state
        };
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass("image-converter-settings-tab");

        // Add or remove the 'global-presets-visible' class based on visibility state
        if (this.presetUIState.globalPresetVisible) {
            containerEl.addClass("global-presets-visible");
        } else {
            containerEl.removeClass("global-presets-visible");
        }

        this.renderGlobalPresetSelector();

        // No need to check or update isFormExpanded here
        this.renderTabs();

        // Initialize the form container before rendering preset groups
        this.initializeFormContainer();

        // Only render preset groups if globalPresetVisible is true
        if (this.presetUIState.globalPresetVisible) {
            switch (this.activeTab) {
                case "folder":
                    this.renderPresetGroup(
                        "文件夹预设",
                        this.plugin.settings.folderPresets,
                        "selectedFolderPreset",
                        this.presetUIState.folder
                    );
                    break;
                case "filename":
                    this.renderPresetGroup(
                        "文件名预设",
                        this.plugin.settings.filenamePresets,
                        "selectedFilenamePreset",
                        this.presetUIState.filename
                    );
                    break;
                case "conversion":
                    this.renderPresetGroup(
                        "转换预设",
                        this.plugin.settings.conversionPresets,
                        "selectedConversionPreset",
                        this.presetUIState.conversion
                    );
                    break;
                case "linkformat":
                    this.renderPresetGroup(
                        "链接格式预设",
                        this.plugin.settings.linkFormatSettings.linkFormatPresets,
                        "selectedLinkFormatPreset",
                        this.presetUIState.linkformat
                    );
                    break;
                case "resize":
                    this.renderPresetGroup(
                        "调整大小预设",
                        this.plugin.settings.nonDestructiveResizeSettings.resizePresets, // Correct type
                        "selectedResizePreset",
                        this.presetUIState.resize
                    );
                    break;
            }
        }

        // Set the form container to visible if editingPresetKey is not null
        if (this.editingPresetKey && this.formContainer) {
            this.formContainer.addClass("visible");
        }


        // --- Image Alignment Settings Section ---
        this.renderImageAlignmentSettingsSection(containerEl);


        // --- Image Drag and scroll resize Section--- 
        this.renderImageDragResizeSettingsSection(containerEl);

        // --- Image Captions Settings Section ---  // ADDED: Call renderImageCaptionSettingsSection here
        this.renderImageCaptionSettingsSection(containerEl);

        new Setting(containerEl)
            .setName("右键菜单")
            .then((setting) => addInfoIcon(setting, "启用后显示右键上下文菜单。"))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableContextMenu)
                    .onChange(async (value) => {
                        this.plugin.settings.enableContextMenu = value;
                        await this.plugin.saveSettings();
                        if (!value) {
                            new Notice("右键菜单已禁用。请重新加载 Obsidian 以查看更改。", 5000);
                        } else {
                            new Notice("右键菜单已启用。请重新加载 Obsidian 以查看更改。", 5000);
                        }
                    })
            );

        new Setting(containerEl)
            .setName("拖放/粘贴后的光标位置")
            .then((setting) => addInfoIcon(setting, "拖放或粘贴图片后光标放置的位置"))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("front", "在链接前面")
                    .addOption("back", "在链接后面")
                    .setValue(this.plugin.settings.dropPasteCursorLocation)
                    .onChange(async (value: "front" | "back") => {
                        this.plugin.settings.dropPasteCursorLocation = value;
                        await this.plugin.saveSettings();
                    });
            });


        new Setting(containerEl)
            .setName("从不处理这些文件名")
            .then((setting) => addInfoIcon(setting, "以逗号分隔的文件名或模式列表，插件将永远不处理这些文件。支持 glob（*）和正则表达式（用 `/` 或 `r/` 或 `regex:` 包裹）。例如：`old.png, /^_/, r/temp-.*\\.jpg$/`。或者简单地跳过所有猫的图片：/cat/，或所有 gif 图片：*.gif"))
            .addTextArea((text) => {
                text.setValue(this.plugin.settings.neverProcessFilenames)
                    .onChange(async (value) => {
                        this.plugin.settings.neverProcessFilenames = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.setAttr('spellcheck', 'false');
            });

        new Setting(containerEl)
            .setName('显示图片大小变化通知')
            .then((setting) => addInfoIcon(setting, '处理图片后显示节省了多少空间的通知。'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSpaceSavedNotification)
                .onChange(async (value) => {
                    this.plugin.settings.showSpaceSavedNotification = value;
                    await this.plugin.saveSettings();
                })
            );


        new Setting(containerEl)
            .setName("显示窗口")
            .setDesc("选择是否在每次拖放/粘贴图片时显示处理选项")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("always", "始终显示")
                    .addOption("never", "从不显示")
                    .addOption("ask", "每次询问")
                    .setValue(this.plugin.settings.modalBehavior)
                    .onChange(async (value: ModalBehavior) => {
                        this.plugin.settings.modalBehavior = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    initializeFormContainer(): void {
        // Find the tab content wrapper
        const tabContentWrapper = this.containerEl.querySelector(".image-converter-tab-content-wrapper") as HTMLElement;

        // Check if the form container already exists to avoid duplicates
        this.formContainer = this.containerEl.querySelector(".image-converter-form-container") as HTMLElement;
        if (!this.formContainer) {
            this.formContainer = this.containerEl.createDiv("image-converter-form-container");
        }

        // Append the form container to the tab content wrapper if it's not already there
        if (tabContentWrapper && !tabContentWrapper.contains(this.formContainer)) {
            tabContentWrapper.appendChild(this.formContainer);
        }

    }


    renderGlobalPresetSelector(): void {
        const { containerEl } = this;

        const globalPresetContainer = containerEl.createDiv("image-converter-global-preset-container");

        // --- Click to Toggle Visibility ---
        // Create a clickable element for toggling visibility
        const toggleVisibilityEl = globalPresetContainer.createDiv("image-converter-global-preset-toggle");

        // Add a chevron icon
        const chevronIcon = toggleVisibilityEl.createEl("i");
        setIcon(chevronIcon, "chevron-down"); // Initial state (expanded)
        chevronIcon.addClass("image-converter-chevron-icon");

        // Add a label that changes based on visibility
        const toggleLabel = toggleVisibilityEl.createEl("span", { text: "拖放/粘贴预设", cls: "settings-section-title" });

        // Add click handler to toggle visibility specifically to the toggle element
        toggleVisibilityEl.onClickEvent((event: MouseEvent) => {
            // Prevent event propagation to avoid conflicts with other interactive elements
            event.stopPropagation();

            // Toggle the visibility state!
            this.presetUIState.globalPresetVisible = !this.presetUIState.globalPresetVisible;

            // Update icon and label based on new visibility state
            if (this.presetUIState.globalPresetVisible) {
                setIcon(chevronIcon, "chevron-down"); // Point down when expanded
                toggleLabel.textContent = "拖放/粘贴预设";
            } else {
                setIcon(chevronIcon, "chevron-right"); // Point right when collapsed
                toggleLabel.textContent = "拖放/粘贴预设";
            }

            this.display(); // Re-render the settings tab
        });

        // --- Dropdown ---
        new Setting(globalPresetContainer)
            // .setName("Drop/paste presets")
            .setDesc("快速应用预设组合")
            .addDropdown((dropdown) => {
                dropdown.addOption("", "无");
                this.plugin.settings.globalPresets.forEach((preset) => {
                    dropdown.addOption(preset.name, preset.name);
                });
                dropdown.setValue(this.plugin.settings.selectedGlobalPreset);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.selectedGlobalPreset = value;
                    if (value) {
                        const selectedPreset = this.plugin.settings.globalPresets.find((presetItem) => presetItem.name === value);
                        if (selectedPreset) {
                            this.plugin.settings.selectedFolderPreset = selectedPreset.folderPreset;
                            this.plugin.settings.selectedFilenamePreset = selectedPreset.filenamePreset;
                            this.plugin.settings.selectedConversionPreset = selectedPreset.conversionPreset;
                            this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset = selectedPreset.linkFormatPreset;
                            this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset = selectedPreset.resizePreset;
                        }
                    } else {
                        this.plugin.settings.selectedFolderPreset = DEFAULT_SETTINGS.selectedFolderPreset;
                        this.plugin.settings.selectedFilenamePreset = DEFAULT_SETTINGS.selectedFilenamePreset;
                        this.plugin.settings.selectedConversionPreset = DEFAULT_SETTINGS.selectedConversionPreset;
                        this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset = DEFAULT_SETTINGS.linkFormatSettings.selectedLinkFormatPreset;
                        this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset = DEFAULT_SETTINGS.nonDestructiveResizeSettings.selectedResizePreset;
                    }
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        // "Save as New Preset" button
        new ButtonComponent(globalPresetContainer)
            .setIcon("plus")
    .setTooltip("将当前选择保存为新的全局预设")
            .onClick((event: MouseEvent) => {
                // Prevent the click from affecting the global visibility toggle
                event.stopPropagation();
                // Open a modal to prompt for the preset name
                new SaveGlobalPresetModal(this.app, this.plugin, (presetName) => {
                    const newPreset: GlobalPreset = {
                        name: presetName,
                        folderPreset: this.plugin.settings.selectedFolderPreset,
                        filenamePreset: this.plugin.settings.selectedFilenamePreset,
                        conversionPreset: this.plugin.settings.selectedConversionPreset,
                        linkFormatPreset: this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset,
                        resizePreset: this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset, // Add this line
                    };
                    this.plugin.settings.globalPresets.push(newPreset);
                    this.plugin.settings.selectedGlobalPreset = presetName;
                    void this.plugin.saveSettings().then(() => this.display());
                }).open();
            });

        // "Delete" button (only visible when a global preset is selected)
        if (this.plugin.settings.selectedGlobalPreset) {
            new ButtonComponent(globalPresetContainer)
                .setIcon("trash")
                .setClass("danger")
    .setTooltip("删除选中的全局预设")
            .onClick((event: MouseEvent) => {
                    // Prevent the click from affecting the global visibility toggle
                    event.stopPropagation();
                    new ConfirmDialog(
                        this.app,
                        "确认删除",
                        `确定要删除全局预设「${this.plugin.settings.selectedGlobalPreset}」吗？`,
                        "删除",
                                  () => {
                            this.plugin.settings.globalPresets = this.plugin.settings.globalPresets.filter(
                                (presetItem) => presetItem.name !== this.plugin.settings.selectedGlobalPreset
                            );
                            this.plugin.settings.selectedGlobalPreset = ""; // Reset selection
                            void this.plugin.saveSettings().then(() => this.display());
                        }
                    ).open();
                });
        }
    }

    renderImageAlignmentSettingsSection(containerEl: HTMLElement): void {
        // --- Image Alignment Settings Section ---
        const imageAlignmentSection = containerEl.createDiv("image-converter-settings-section");
        imageAlignmentSection.addClass("image-alignment-settings-section");

        // Conditionally add 'image-alignment-enabled' class
        if (this.plugin.settings.isImageAlignmentEnabled) {
            imageAlignmentSection.addClass("image-alignment-enabled");
        } else {
            imageAlignmentSection.removeClass("image-alignment-enabled");
        }

        // --- Clickable Header with Toggle ---
        const toggleAlignmentVisibilityEl = imageAlignmentSection.createDiv("settings-section-header");

        // Chevron Icon (for collapsing/expanding)
        const alignmentChevronIcon = toggleAlignmentVisibilityEl.createEl("i");
        setIcon(alignmentChevronIcon, "chevron-down");
        alignmentChevronIcon.addClass("settings-section-chevron-icon");

        // Section Title
        toggleAlignmentVisibilityEl.createEl("span", { text: "图片对齐", cls: "settings-section-title" });
        // // Clarification Text
        // toggleAlignmentVisibilityEl.createEl("span", {
        //     text: "For changes to take effect, please reload the app",
        //     cls: "settings-section-clarification-text"
        // });

        // Toggle Switch (integrated into header)
        const alignmentToggle = new Setting(toggleAlignmentVisibilityEl)
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.isImageAlignmentEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.isImageAlignmentEnabled = value;
                        await this.plugin.saveSettings();
                        if (!value) {
                            new Notice("图片对齐已禁用。请重新加载 Obsidian 以查看更改。", 5000);
                        } else {
                            new Notice("图片对齐已启用。请重新加载 Obsidian 以查看更改。", 5000);
                        }
                        this.display(); // Refresh the settings UI
                    })
            );
        alignmentToggle.settingEl.addClass("settings-section-toggle-button");

        // --- APPLY COLLAPSED STATE FROM UI STATE ---
        if (this.presetUIState.imageAlignmentSectionCollapsed) { // CHECK UI STATE
            imageAlignmentSection.addClass("settings-section-collapsed");
            setIcon(alignmentChevronIcon, "chevron-right"); // Ensure chevron is correct on initial render
        }

        toggleAlignmentVisibilityEl.onClickEvent((event: MouseEvent) => {
            event.stopPropagation();
            // TOGGLE UI STATE AND CLASS INDEPENDENTLY
            this.presetUIState.imageAlignmentSectionCollapsed = !this.presetUIState.imageAlignmentSectionCollapsed; // UPDATE UI STATE
            imageAlignmentSection.toggleClass("settings-section-collapsed", this.presetUIState.imageAlignmentSectionCollapsed); // APPLY CLASS BASED ON UI STATE

            if (this.presetUIState.imageAlignmentSectionCollapsed) { // CHECK UI STATE
                setIcon(alignmentChevronIcon, "chevron-right");
            } else {
                setIcon(alignmentChevronIcon, "chevron-down");
            }
        });

        if (this.plugin.settings.isImageAlignmentEnabled) { // Conditionally render cleanup options
            new Setting(imageAlignmentSection)
                .setName("新图片的默认对齐方式")
                .setDesc("插入新图片时自动应用此对齐方式。设置为\u201c无\u201d以禁用。")
                .addDropdown(dropdown => dropdown
                    .addOptions({
                        'none': 'None',
                        'left': 'Left',
                        'center': 'Center',
                        'right': 'Right'
                    })
                    .setValue(this.plugin.settings.imageAlignmentDefaultAlignment)
                    .onChange(async (value: 'none' | 'left' | 'center' | 'right') => {
                        this.plugin.settings.imageAlignmentDefaultAlignment = value;
                        await this.plugin.saveSettings();
                    })
                );

            // --- Cache Location Setting ---
            new Setting(imageAlignmentSection)
                .setName("图片对齐缓存位置")
                .setDesc(
                    "选择图片对齐缓存文件的存储位置。" +
                    "注意：需要重新加载应用。"
                )
                .then((setting) => addInfoIcon(
                    setting,
                    "如果使用 Obsidian 同步，强烈建议在所有设备上使用相同的位置以确保一致的行为。默认：Obsidian 配置文件夹（可同步）。"
                ))
                .addDropdown(dropdown => dropdown
                    .addOptions({
                        config: "配置文件夹内（可同步）",
                        plugin: "插件文件夹内（不可同步）",
                    })
                    .setValue(this.plugin.settings.imageAlignmentCacheLocation)
                    .onChange(async (value: "config" | "plugin") => {
                        this.plugin.settings.imageAlignmentCacheLocation = value;
                        await this.plugin.saveSettings();
                        this.plugin.ImageAlignmentManager?.updateCacheFilePath();
                        void this.plugin.ImageAlignmentManager?.loadCache();
                    })
                );

            new Setting(imageAlignmentSection) // Interval setting is now inside the collapsible section
                .setName("图片对齐缓存清理间隔")
                .setDesc(
                    "Interval (in minutes) to clean up redundant entries from image alignment cache. Default: 1 hour (0 to disable)"
                )
                .addSlider(slider => slider
                    .setLimits(0, 120, 5) // Min: 0, Max: 120, Step: 5 (minutes)
                    .setValue(this.plugin.settings.imageAlignmentCacheCleanupInterval / (60 * 1000))
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        const minutes = value;
                        this.plugin.settings.imageAlignmentCacheCleanupInterval = minutes * 60 * 1000;
                        await this.plugin.saveSettings();
                        this.plugin.ImageAlignmentManager?.scheduleCacheCleanup();
                    })
                );
        }
    }

    renderImageDragResizeSettingsSection(containerEl: HTMLElement): void {
        // --- Image Drag & Resize Settings Section ---
        const imageDragResizeSection = containerEl.createDiv("image-converter-settings-section");
        imageDragResizeSection.addClass("image-drag-resize-settings-section");

        // Conditionally add 'image-drag-resize-enabled' class
        if (this.plugin.settings.isImageResizeEnbaled) {
            imageDragResizeSection.addClass("image-drag-resize-enabled");
        } else {
            imageDragResizeSection.removeClass("image-drag-resize-enabled");
        }

        // --- Clickable Header with Toggle ---
        const toggleDragResizeVisibilityEl = imageDragResizeSection.createDiv("settings-section-header");

        // Chevron Icon (for collapsing/expanding)
        const dragResizeChevronIcon = toggleDragResizeVisibilityEl.createEl("i");
        setIcon(dragResizeChevronIcon, "chevron-down");
        dragResizeChevronIcon.addClass("settings-section-chevron-icon");

        // Section Title
        toggleDragResizeVisibilityEl.createEl("span", { text: "拖拽和滚轮调整大小", cls: "settings-section-title" });
        // // Clarification Text
        // toggleDragResizeVisibilityEl.createEl("span", {
        //     text: "For changes to take effect, please reload the app",
        //     cls: "settings-section-clarification-text"
        // });

        // Toggle Switch (integrated into header)
        const dragResizeToggle = new Setting(toggleDragResizeVisibilityEl)
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.isImageResizeEnbaled)
                    .onChange(async (value) => {
                        this.plugin.settings.isImageResizeEnbaled = value;
                        await this.plugin.saveSettings();
                        if (!value) {
                            new Notice("图片调整大小已禁用。请重新加载 Obsidian 以查看更改。", 5000);
                        } else {
                            new Notice("图片调整大小已启用。请重新加载 Obsidian 以查看更改。", 5000);
                        }
                        this.display(); // Refresh the settings UI
                    })
            );
        dragResizeToggle.settingEl.addClass("settings-section-toggle-button");

        // --- APPLY COLLAPSED STATE FROM UI STATE ---
        if (this.presetUIState.imageDragResizeSectionCollapsed) { // CHECK UI STATE
            imageDragResizeSection.addClass("settings-section-collapsed");
            setIcon(dragResizeChevronIcon, "chevron-right"); // Ensure chevron is correct on initial render
        }

        toggleDragResizeVisibilityEl.onClickEvent((event: MouseEvent) => {
            event.stopPropagation();
            // TOGGLE UI STATE AND CLASS INDEPENDENTLY
            this.presetUIState.imageDragResizeSectionCollapsed = !this.presetUIState.imageDragResizeSectionCollapsed; // UPDATE UI STATE
            imageDragResizeSection.toggleClass("settings-section-collapsed", this.presetUIState.imageDragResizeSectionCollapsed); // APPLY CLASS BASED ON UI STATE

            if (this.presetUIState.imageDragResizeSectionCollapsed) { // CHECK UI STATE
                setIcon(dragResizeChevronIcon, "chevron-right");
            } else {
                setIcon(dragResizeChevronIcon, "chevron-down");
            }
        });

        if (this.plugin.settings.isImageResizeEnbaled) { // Conditionally render cleanup options
            // --- Checkboxes for Drag and Scroll Resize ---
            new Setting(imageDragResizeSection)
                .setName("启用拖拽调整大小")
                .setDesc("允许通过拖拽图片边缘来调整大小。")
                .then((setting) => addInfoIcon(setting, "这会在图片下方创建一个新的 <DIV> 来显示调整大小的手柄。但这可能与某些主题不兼容，导致图片跳动。"))
                .addToggle((toggle) =>
                    toggle
                        .setValue(this.plugin.settings.isDragResizeEnabled)
                        .onChange(async (value) => {
                            this.plugin.settings.isDragResizeEnabled = value;
                            await this.plugin.saveSettings();
                            // Force refresh to update visible options
                            this.display();                            
                        })
                );

            // Drag-resize specific settings - only show when drag resize is enabled
            if (this.plugin.settings.isDragResizeEnabled) {
                const apectRatioSettingsContainer = imageDragResizeSection.createDiv('fix-aspect-ratio-settings');

                new Setting(apectRatioSettingsContainer)
                    .setName('拖拽时锁定宽高比')
                    .setDesc('防止拖拽调整大小时意外变形')
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.isDragAspectRatioLocked)
                        .onChange(async (value) => {
                            this.plugin.settings.isDragAspectRatioLocked = value;
                            await this.plugin.saveSettings();

                        }));
            }


            new Setting(imageDragResizeSection)
                .setName('启用滚轮调整大小')
                .setDesc('允许使用滚轮调整图片大小')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.isScrollResizeEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.isScrollResizeEnabled = value;
                        await this.plugin.saveSettings();
                        // Force refresh to update visible options
                        this.display();
                    }));


            // Scroll-wheel specific settings - only show when scroll-wheel resize is enabled
            if (this.plugin.settings.isScrollResizeEnabled) {
                const scrollSettingsContainer = imageDragResizeSection.createDiv('scroll-resize-settings');

                new Setting(scrollSettingsContainer)
                    .setName('滚轮修饰键')
                    .setDesc('使用滚轮调整大小时需要按住的键')
                    .addDropdown(dropdown => dropdown
                        .addOptions({
                            'None': 'None',
                            'Shift': 'Shift',
                            'Control': 'Control',
                            'Alt': 'Alt',
                            'Meta': 'Meta'
                        })
                        .setValue(this.plugin.settings.scrollwheelModifier)
                        .onChange(async (value: "None" | "Shift" | "Control" | "Alt" | "Meta") => {
                            this.plugin.settings.scrollwheelModifier = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(scrollSettingsContainer)
                    .setName('滚轮调整灵敏度')
                    .setDesc('调整滚轮调整大小的灵敏度 (0.01-1.0)')
                    .addSlider(slider => slider
                        .setLimits(0.01, 1, 0.01)
                        .setValue(this.plugin.settings.resizeSensitivity)
                        .setDynamicTooltip()
                        .onChange(async (value) => {
                            this.plugin.settings.resizeSensitivity = value;
                            await this.plugin.saveSettings();
                        }));
            }

            new Setting(imageDragResizeSection)
                .setName("禁用 Obsidian 点击选中图片")
                .then((setting) => addInfoIcon(setting, "在实时预览中点击内部图片时保持编辑器焦点，而不是显示 Obsidian 默认的轮廓/调整角。光标位置遵循拖放/粘贴光标位置设置。"))
                .setDesc("在实时预览中点击内部图片时保持编辑器焦点，而不是显示 Obsidian 默认的轮廓/调整角。光标位置遵循拖放/粘贴光标位置设置。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(this.plugin.settings.disableObsidianImageSelectionOnClick)
                        .onChange(async (value) => {
                            this.plugin.settings.disableObsidianImageSelectionOnClick = value;
                            await this.plugin.saveSettings();
                        })
                );

            // New Setting: Resize Cursor Location
            new Setting(imageDragResizeSection)
                .setName("调整大小时的光标位置")
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- Intentional messaging style
                .then((setting) => addInfoIcon(setting, "调整图片大小时光标放置的位置。注意：「不移动光标」会尝试保持现有光标位置，但如果您拖拽调整大小时光标仍在图片上方，完成调整后文本会被选中。"))
                .addDropdown((dropdown) => {
                    dropdown
                        .addOption("front", "在链接前面")
                        .addOption("back", "在链接后面")
                        .addOption("below", "图片下方一行")
                        .addOption("none", "不移动光标")
                        .setValue(this.plugin.settings.resizeCursorLocation)
                        .onChange(async (value: "front" | "back" | "below" | "none") => {
                            this.plugin.settings.resizeCursorLocation = value;
                            await this.plugin.saveSettings();
                        });
                });

            new Setting(imageDragResizeSection)
                .setName("允许在阅读模式下调整大小")
                .setDesc("阅读模式下的非破坏性调整仅为视觉效果，如果觉得干扰可以禁用。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(this.plugin.settings.isResizeInReadingModeEnabled)
                        .onChange(async (value) => {
                            this.plugin.settings.isResizeInReadingModeEnabled = value;
                            await this.plugin.saveSettings();
                        })
                );

        }
    }

    renderImageCaptionSettingsSection(containerEl: HTMLElement): void {
        // --- Image Caption Settings Section ---
        const imageCaptionSection = containerEl.createDiv("image-converter-settings-section");
        imageCaptionSection.addClass("image-caption-settings-section");

        // Conditionally add 'image-caption-enabled' class
        if (this.plugin.settings.enableImageCaptions) {
            imageCaptionSection.addClass("image-caption-enabled");
        } else {
            imageCaptionSection.removeClass("image-caption-enabled");
        }

        // --- Clickable Header with Toggle ---
        const toggleCaptionVisibilityEl = imageCaptionSection.createDiv("settings-section-header");

        // Chevron Icon (for collapsing/expanding)
        const captionChevronIcon = toggleCaptionVisibilityEl.createEl("i");
        setIcon(captionChevronIcon, "chevron-down");
        captionChevronIcon.addClass("settings-section-chevron-icon");

        // Section Title
        toggleCaptionVisibilityEl.createEl("span", { text: "图片标题", cls: "settings-section-title" });
        // // Clarification Text
        // toggleCaptionVisibilityEl.createEl("span", {
        //     text: "For changes to take effect, please reload the app",
        //     cls: "settings-section-clarification-text"
        // });

        // Toggle Switch (integrated into header)
        const imageCaptionToggle = new Setting(toggleCaptionVisibilityEl)
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableImageCaptions)
                    .onChange(async (value) => {
                        this.plugin.settings.enableImageCaptions = value;
                        await this.plugin.saveSettings();
                        if (!value) {
                            new Notice("图片标题已禁用。请重新加载 Obsidian 以查看更改。", 5000);
                        } else {
                            new Notice("图片标题已启用。请重新加载 Obsidian 以查看更改。", 5000);
                        }
                        this.display();
                    })
            );
        imageCaptionToggle.settingEl.addClass("settings-section-toggle-button");

        // --- APPLY COLLAPSED STATE FROM UI STATE ---
        if (this.presetUIState.imageCaptionSectionCollapsed) {
            imageCaptionSection.addClass("settings-section-collapsed");
            setIcon(captionChevronIcon, "chevron-right");
        }

        toggleCaptionVisibilityEl.onClickEvent((event: MouseEvent) => {
            event.stopPropagation();
            // TOGGLE UI STATE AND CLASS INDEPENDENTLY
            this.presetUIState.imageCaptionSectionCollapsed = !this.presetUIState.imageCaptionSectionCollapsed;
            imageCaptionSection.toggleClass("settings-section-collapsed", this.presetUIState.imageCaptionSectionCollapsed);

            if (this.presetUIState.imageCaptionSectionCollapsed) {
                setIcon(captionChevronIcon, "chevron-right");
            } else {
                setIcon(captionChevronIcon, "chevron-down");
            }
        });

        // --- Image Captions Settings (Moved from display() function) ---
        if (this.plugin.settings.enableImageCaptions) {
            new Setting(imageCaptionSection)
                .setName("标题文字对齐方式")
                .addDropdown(dropdown =>
                    dropdown.addOptions({
                        "left": "左对齐",
                        "center": "居中",
                        "right": "右对齐"
                    })
                        .setValue(this.plugin.settings.captionAlignment)
                        .onChange(async (value) => {
                            this.plugin.settings.captionAlignment = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("文字转换")
                .setDesc("设置文字转换方式")
                .addDropdown(dropdown =>
                    dropdown.addOptions({
                        "none": "无",
                        "uppercase": "全部大写",
                        "lowercase": "全部小写",
                        "capitalize": "首字母大写"
                    })
                        .setValue(this.plugin.settings.captionTextTransform)
                        .onChange(async (value) => {
                            this.plugin.settings.captionTextTransform = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection) // Font Size Setting is now FIRST setting in the section
                .setName("字体大小")
                .setDesc("设置图片标题的字体大小（例如 12px、1.2em）。")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionFontSize)
                        .onChange(async (value) => {
                            this.plugin.settings.captionFontSize = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("字重")
                .setDesc("设置字重（例如 normal、bold、600）")
                .addDropdown(dropdown =>
                    dropdown.addOptions({
                        "normal": "正常",
                        "bold": "粗体",
                        ["300"]: "细体",
                        ["400"]: "常规",
                        ["500"]: "中等",
                        ["600"]: "半粗",
                        ["700"]: "粗体"
                    })
                        .setValue(this.plugin.settings.captionFontWeight)
                        .onChange(async (value) => {
                            this.plugin.settings.captionFontWeight = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("颜色")
                .setDesc("选择图片标题颜色，例如：red、grey、white、black、hsl(50, 50%, 50%)、rgb(50%, 75%, 100%)")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionColor)
                        .onChange(async (value) => {
                            this.plugin.settings.captionColor = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("字体样式")
                .setDesc("设置字体样式（例如 italic、normal）。")
                .addDropdown(dropdown =>
                    dropdown.addOptions({
                        "italic": "斜体", "normal": "正常"
                    })
                        .setValue(this.plugin.settings.captionFontStyle)
                        .onChange(async (value) => {
                            this.plugin.settings.captionFontStyle = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("背景颜色")
                .setDesc("选择图片标题背景颜色（例如：transparent、#f5f5f5、rgba(255,255,255,0.8)）")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionBackgroundColor)
                        .onChange(async (value) => {
                            this.plugin.settings.captionBackgroundColor = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            // In renderImageCaptionSettingsSection
            new Setting(imageCaptionSection)
                .setName("边框")
                .setDesc("设置边框样式（例如 1px solid gray）")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionBorder)
                        .onChange(async (value) => {
                            this.plugin.settings.captionBorder = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );
            new Setting(imageCaptionSection)
                .setName("边框圆角")
                .setDesc("设置标题边框圆角（例如轻微圆角：4px）")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionBorderRadius)
                        .onChange(async (value) => {
                            this.plugin.settings.captionBorderRadius = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("顶部间距")
                .setDesc("设置图片和标题之间的间距（例如 4px、8px）")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionMarginTop)
                        .onChange(async (value) => {
                            this.plugin.settings.captionMarginTop = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            new Setting(imageCaptionSection)
                .setName("内边距")
                .setDesc("设置标题内边距（例如 4px 8px）")
                .addText(text =>
                    text.setValue(this.plugin.settings.captionPadding)
                        .onChange(async (value) => {
                            this.plugin.settings.captionPadding = value;
                            await this.plugin.saveSettings();
                            this.plugin.captionManager?.applyCaptionStyles();
                        })
                );

            // Skip Caption Extensions
            new Setting(imageCaptionSection)
                .setName("跳过标题的扩展名")
                .setDesc("逗号分隔的图片扩展名列表，排除这些格式的标题（例如 PNG、JPG）。")
                .addText((text) => {
                    text.setValue(this.plugin.settings.skipCaptionExtensions)
                        .onChange(async (value) => {
                            this.plugin.settings.skipCaptionExtensions = value;
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.setAttr('spellcheck', 'false');
                });
        }
    }


    renderTabs(): void {
        const { containerEl } = this;
        // Check if tabs container already exists to avoid duplicates
        let tabContainer = containerEl.querySelector(".image-converter-setting-tabs") as HTMLElement;
        if (!tabContainer) {
            tabContainer = containerEl.createDiv("image-converter-setting-tabs");
        }
        // Only add tabs if they haven't been already
        if (tabContainer.children.length === 0) {
            // Correct the type of the first argument
            this.createTab("folder", "folder", "文件夹");
            this.createTab("filename", "pencil", "文件名");
            this.createTab("conversion", "settings", "转换");
            this.createTab("linkformat", "link", "链接格式");
            this.createTab("resize", "frame", "调整大小");
        }

        // Highlight active tab 
        const tabs = tabContainer.querySelectorAll(".image-converter-tab");
        tabs.forEach((tab) => tab.removeClass("image-converter-tab-active"));

        const activeTab = tabContainer.querySelector(`.image-converter-tab-${this.activeTab}`);
        if (activeTab) {
            activeTab.addClass("image-converter-tab-active");
        }

    }

    createTab(tabId: "folder" | "filename" | "conversion" | "linkformat" | "resize", icon: string, label: string) {
        const { containerEl } = this;
        // Check if tabs container already exists to avoid duplicates
        let tabContainer = containerEl.querySelector(".image-converter-setting-tabs") as HTMLElement;
        if (!tabContainer) {
            tabContainer = containerEl.createDiv("image-converter-setting-tabs");
        }
        const tab = tabContainer.createDiv(`image-converter-tab image-converter-tab-${tabId}`);
        setIcon(tab, icon);
        tab.createSpan({ text: label, cls: "image-converter-tab-label" });
        tab.onclick = () => {
            // Close form before switching tabs
            if (this.formContainer) {
                this.formContainer.removeClass("visible");
                this.formContainer.empty();
            }
            this.editingPresetKey = null;

            // Reset relevant UI state
            this.presetUIState[tabId].editingPreset = null;
            this.presetUIState[tabId].newPreset = null;

            this.activeTab = tabId;
            this.display();
        };
    }

    renderPresetGroup<
        T extends FolderPreset | FilenamePreset | ConversionPreset | LinkFormatPreset | NonDestructiveResizePreset
    >(
        title: string,
        presets: T[],
        activePresetSetting: ActivePresetSetting,
        uiState: PresetCategoryUIState<T>
    ): void {
        const { containerEl } = this;

        // 1. Create a wrapper for each tab's content:
        const tabContentWrapper = containerEl.createDiv("image-converter-tab-content-wrapper");
        const groupContainer = tabContentWrapper.createDiv(
            "image-converter-preset-group"
        );

        const headerContainer = groupContainer.createDiv(
            "image-converter-preset-group-header" // Add a wrapper for header and description
        );

        // eslint-disable-next-line obsidianmd/settings-tab/no-manual-html-headings -- setHeading() not available in test mocks
        headerContainer.createEl("h3", { text: title, cls: "settings-group-heading" });

        // --- Add explanation here ---
        const description = this.getPresetGroupDescription(activePresetSetting);
        if (description) {
            headerContainer.createEl("p", {
                text: description,
                cls: "image-converter-preset-group-description",
            });
        }

        const cardsContainer = groupContainer.createDiv(
            "image-converter-preset-cards"
        );

        // Initialize SortableJS for drag and drop
        new Sortable(cardsContainer, {
            animation: 150, // Add a smooth animation
            handle: ".image-converter-preset-card-header", // Make the card header the drag handle
            draggable: ".image-converter-preset-card", // Only allow preset cards to be dragged
            ghostClass: 'image-converter-sortable-ghost',
            onEnd: (evt) => {
                if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
                    if (activePresetSetting === "selectedFolderPreset") {
                        const reorderedPresets = this.arrayMove(
                            this.plugin.settings.folderPresets,
                            evt.oldIndex,
                            evt.newIndex
                        );
                        this.plugin.settings.folderPresets = reorderedPresets;
                        void this.plugin.saveSettings().then(() => this.display());
                    } else if (activePresetSetting === "selectedFilenamePreset") {
                        // Duplicate the logic for filename presets
                        const reorderedPresets = this.arrayMove(
                            this.plugin.settings.filenamePresets,
                            evt.oldIndex,
                            evt.newIndex
                        );
                        this.plugin.settings.filenamePresets = reorderedPresets;
                        void this.plugin.saveSettings().then(() => this.display());
                    } else if (activePresetSetting === "selectedConversionPreset") {
                        // Duplicate the logic for conversion presets
                        const reorderedPresets = this.arrayMove(
                            this.plugin.settings.conversionPresets,
                            evt.oldIndex,
                            evt.newIndex
                        );
                        this.plugin.settings.conversionPresets = reorderedPresets;
                        void this.plugin.saveSettings().then(() => this.display());
                    } else if (activePresetSetting === "selectedLinkFormatPreset") {
                        const reorderedPresets = this.arrayMove(
                            this.plugin.settings.linkFormatSettings.linkFormatPresets,
                            evt.oldIndex,
                            evt.newIndex
                        );
                        this.plugin.settings.linkFormatSettings.linkFormatPresets = reorderedPresets;
                        void this.plugin.saveSettings().then(() => this.display());
                    } else if (activePresetSetting === "selectedResizePreset") {
                        const reorderedPresets = this.arrayMove(
                            this.plugin.settings.nonDestructiveResizeSettings.resizePresets,
                            evt.oldIndex,
                            evt.newIndex
                        );
                        this.plugin.settings.nonDestructiveResizeSettings.resizePresets = reorderedPresets;
                        void this.plugin.saveSettings().then(() => this.display());
                    }
                }
            },
        });

        // Add all default cards
        for (const preset of presets) {
            const isEditing = uiState.editingPreset === preset;
            const isActive = preset.name === this.getSelectedPresetName(activePresetSetting); // Use helper function here
            this.renderPresetCard(
                cardsContainer,
                preset,
                activePresetSetting,
                isEditing,
                isActive,
                uiState
            );
        }

        // Append the form container after the cards if it's a valid Node
        if (this.formContainer instanceof Node) {
            tabContentWrapper.appendChild(this.formContainer);
        }

        // "Add New" card and Form Rendering
        if (!uiState.newPreset) {
            this.addAddNewPresetCard(
                cardsContainer,
                activePresetSetting,
                uiState
            );
        } else {
            // Check if form should be expanded
            // const isNewExpanded = this.isFormExpanded && this.editingPresetKey === "new";
            this.renderPresetForm(
                this.formContainer,
                uiState.newPreset,
                true,
                activePresetSetting,
                uiState
            );
        }
    }

    // Helper method to get descriptions
    getPresetGroupDescription(activePresetSetting: ActivePresetSetting): string {
        switch (activePresetSetting) {
            case "selectedFolderPreset":
                return "定义转换后的图片存储位置。从预定义位置中选择，或使用变量创建自定义路径。";
            case "selectedFilenamePreset":
                return "控制转换后的图片命名方式。使用 {notename}、{timestamp}、{uuid} 或 {MD5:filename} 等变量创建唯一的文件名。";
            case "selectedConversionPreset":
                return "控制转换后图片的输出格式、质量和调整大小选项。这可以显著减小文件大小，保持仓库体积小巧。";
            case "selectedLinkFormatPreset":
                return "确定图片链接如何插入笔记中。在 Wikilink 和 Markdown 链接之间选择，并指定文件路径的格式。这允许使用与仓库默认不同的链接样式，提供更好的跨应用兼容性。";
            case "selectedResizePreset":
                return "配置编辑器中图片的非破坏性调整大小选项。这可以调整显示大小而不改变原始文件。";
            default:
                return "";
        }
    }

    // Helper to get a unique key for a preset
    getPresetKey<
        T extends FolderPreset | FilenamePreset | ConversionPreset | LinkFormatPreset | NonDestructiveResizePreset
    >(preset: T): string {
        if ('type' in preset) { // Check if the property exists to narrow down the type
            return `${preset.name}-${preset.type}`;
        }
        if ('linkFormat' in preset) {
            return `${preset.name}-${preset.linkFormat}`;
        }
        return `${preset.name}`;
    }

    getTabContentWrapper(): HTMLElement {
        const { containerEl } = this;
        const tabContentWrapper = containerEl.querySelector(".image-converter-tab-content-wrapper") as HTMLElement;
        return tabContentWrapper;
    }

    private arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
        const newArray = array.slice();
        const [movedItem] = newArray.splice(fromIndex, 1);
        newArray.splice(toIndex, 0, movedItem);
        return newArray;
    }

    renderPresetCard<
        T extends
        | FolderPreset
        | FilenamePreset
        | ConversionPreset
        | LinkFormatPreset
        | NonDestructiveResizePreset
    >(
        containerEl: HTMLElement,
        preset: T,
        activePresetSetting: ActivePresetSetting,
        isEditing: boolean,
        isActive: boolean,
        uiState: PresetCategoryUIState<T>
    ): void {

        const card = containerEl.createDiv({
            cls: `image-converter-preset-card ${this.isDefaultPreset(preset, activePresetSetting)
                ? "image-converter-default-preset"
                : ""
                } ${isActive ? "image-converter-active-preset" : ""}`,
        });

        const presetKey = this.getPresetKey(preset);
        const isEditingExpanded = this.editingPresetKey === presetKey;

        if (isEditing || isEditingExpanded) {
            // Render the form in the form container
            this.renderPresetForm(
                this.formContainer, // Render in the dedicated form container
                preset,
                false,
                activePresetSetting,
                uiState
            );
            return; // Skip rendering the regular card content
        }

        // Preset Name and Summary
        const cardHeader = card.createDiv("image-converter-preset-card-header");
        cardHeader.createEl("span", {
            text: preset.name,
            cls: "image-converter-preset-card-title",
            title: preset.name, // Add the full name as a tooltip
        });

        if (!this.isDefaultPreset(preset, activePresetSetting)) {
            const actionsContainer = cardHeader.createDiv("image-converter-preset-card-actions");

            // Edit Button
            new ButtonComponent(actionsContainer)
                .setIcon("pencil")
                .setTooltip("编辑")
                .onClick(() => {
                    let correctActivePresetSetting = activePresetSetting;
                    if (preset.hasOwnProperty('linkFormat')) { // Check if it's a Link Format preset
                        correctActivePresetSetting = "selectedLinkFormatPreset";
                    }

                    uiState.editingPreset = preset;
                    this.showPresetForm(preset, false, correctActivePresetSetting, uiState);
                });

            // Delete Button
            new ButtonComponent(actionsContainer)
                .setIcon("trash")
                .setClass("danger")
                .setTooltip("删除")
                .onClick(() => {
                    new ConfirmDialog(
                        this.app,
                        "确认删除",
                        `确定要删除预设「${preset.name}」吗？`,
                        "删除",
                        () => {
                            if (activePresetSetting === "selectedFolderPreset") {
                                this.plugin.settings.folderPresets = this.plugin.settings.folderPresets.filter(
                                    (presetItem) => presetItem.name !== preset.name
                                );
                                this.plugin.settings.selectedFolderPreset = DEFAULT_SETTINGS.selectedFolderPreset;
                            } else if (activePresetSetting === "selectedFilenamePreset") {
                                this.plugin.settings.filenamePresets = this.plugin.settings.filenamePresets.filter(
                                    (presetItem) => presetItem.name !== preset.name
                                );
                                this.plugin.settings.selectedFilenamePreset = DEFAULT_SETTINGS.selectedFilenamePreset;
                            } else if (activePresetSetting === "selectedConversionPreset") {
                                this.plugin.settings.conversionPresets = this.plugin.settings.conversionPresets.filter(
                                    (presetItem) => presetItem.name !== preset.name
                                );
                                this.plugin.settings.selectedConversionPreset = DEFAULT_SETTINGS.selectedConversionPreset;
                            } else if (activePresetSetting === "selectedLinkFormatPreset") {
                                    this.plugin.settings.linkFormatSettings.linkFormatPresets =
                                        this.plugin.settings.linkFormatSettings.linkFormatPresets.filter(
                                            (presetItem) => presetItem.name !== preset.name
                                        );
                                if (this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset === preset.name) {
                                    this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset =
                                        DEFAULT_SETTINGS.linkFormatSettings.selectedLinkFormatPreset;
                                }
                            } else if (activePresetSetting === "selectedResizePreset") { // Add this case
                                this.plugin.settings.nonDestructiveResizeSettings.resizePresets =
                                    this.plugin.settings.nonDestructiveResizeSettings.resizePresets.filter(
                                        (presetItem) => presetItem.name !== preset.name
                                    );
                                // Reset to default if the deleted preset was the active one
                                if (this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset === preset.name) {
                                    this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset =
                                        DEFAULT_SETTINGS.nonDestructiveResizeSettings.selectedResizePreset;
                                }
                            }

                            void this.plugin.saveSettings().then(() => this.display());
                        }
                    ).open();
                });
        }

        // Card Body (Summary)
        const cardBody = card.createDiv("image-converter-preset-card-body");
        if (activePresetSetting === "selectedFolderPreset") {
            void this.generateFolderPresetSummary(cardBody, preset as FolderPreset);
        } else if (activePresetSetting === "selectedFilenamePreset") {
            void this.generateFilenamePresetSummary(cardBody, preset as FilenamePreset);
        } else if (activePresetSetting === "selectedLinkFormatPreset") {
            cardBody.createEl("p", {
                text: this.getLinkFormatPresetSummary(preset as LinkFormatPreset),
            });
        } else if (activePresetSetting === "selectedResizePreset") {
            cardBody.appendChild(this.getResizePresetSummary(preset as NonDestructiveResizePreset));
        } else {
            cardBody.appendChild(
                this.getConversionPresetSummary(preset as ConversionPreset)
            );
        }

        // Activate Preset on Click
        card.onClickEvent(async () => {
            if (!isActive) {
                switch (activePresetSetting) {
                    case "selectedFolderPreset":
                        this.plugin.settings.selectedFolderPreset = preset.name;
                        break;
                    case "selectedFilenamePreset":
                        this.plugin.settings.selectedFilenamePreset = preset.name;
                        break;
                    case "selectedConversionPreset":
                        this.plugin.settings.selectedConversionPreset = preset.name;
                        break;
                    case "selectedLinkFormatPreset":
                        this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset = preset.name;
                        break;
                    case "selectedResizePreset":
                        this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset = preset.name;
                        break;
                }
                await this.plugin.saveSettings();
                this.display();
            }
        });
    }

    showAvailableVariables() {
        new AvailableVariablesModal(this.app, this.plugin.variableProcessor).open();
    }

    showPresetForm<T extends FolderPreset | FilenamePreset | ConversionPreset | LinkFormatPreset | NonDestructiveResizePreset>(
        preset: T,
        isNew: boolean,
        activePresetSetting: ActivePresetSetting,
        uiState: PresetCategoryUIState<T>
    ) {
        // Ensure form container is initialized
        if (!this.formContainer) {
            this.initializeFormContainer();
        }

        // Add the 'visible' class to show the form
        this.formContainer.addClass("visible");

        // No need to set isFormExpanded here
        this.editingPresetKey = isNew ? "new" : this.getPresetKey(preset);

        // Clear and render the form
        this.formContainer.empty();
        this.renderPresetForm(this.formContainer, preset, isNew, activePresetSetting, uiState);

        // Scroll the form into view
        this.formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }



    // This renders the form to create OR edit preset
    renderPresetForm<
        T extends
        | FolderPreset
        | FilenamePreset
        | ConversionPreset
        | LinkFormatPreset
        | NonDestructiveResizePreset
    >(
        containerEl: HTMLElement,
        preset: T,
        isNew: boolean,
        activePresetSetting: ActivePresetSetting,
        uiState: PresetCategoryUIState<T>
    ): void {

        containerEl.empty(); // Clear the form container before rendering

        const isDefault = isNew ? false : this.isDefaultPreset(preset, activePresetSetting);

        // Render form directly into the container
        const formContainer = containerEl.createDiv("image-converter-preset-form");


        // Name Input
        new Setting(formContainer)
            .setName("预设名称")
            .addText((text) => {
                text.setValue(preset.name).onChange((value) => {
                    preset.name = value;
                });
                text.inputEl.setAttr('spellcheck', 'false'); // Disable spellcheck
                // Disable name input only when editing a default preset
                if (!isNew && isDefault) text.setDisabled(true);
            });

        // Render form fields based on preset type
        if (activePresetSetting === "selectedFolderPreset") {
            this.renderFolderPresetFormFields(
                formContainer,
                preset as FolderPreset,
                isDefault,
                () => this.showAvailableVariables()
            );
        } else if (activePresetSetting === "selectedFilenamePreset") {
            // Directly add Custom Template Setting
            this.addCustomTemplateSetting(
                formContainer,
                preset as FilenamePreset,
                () => this.showAvailableVariables()
            );

            // Add Skip Rename Patterns Setting for Filename Preset
            this.addSkipPatternsSetting(formContainer, preset as FilenamePreset, 'skipRenamePatterns', '跳过重命名模式');
        } else if (activePresetSetting === "selectedLinkFormatPreset") {
            this.renderLinkFormatFormFields(formContainer, preset as LinkFormatPreset);
        } else if (activePresetSetting === "selectedResizePreset") {
            this.renderResizePresetFormFields(formContainer, preset as NonDestructiveResizePreset);
        } else {
            this.renderConversionPresetFormFields(
                formContainer,
                preset as ConversionPreset
            );
            // Add Skip Patterns Setting for Conversion Preset
            this.addSkipPatternsSetting(formContainer, preset as ConversionPreset, 'skipConversionPatterns', '跳过转换模式');

        }

        // Save/Cancel Buttons
        const buttonContainer = formContainer.createDiv("image-converter-form-buttons");
        this.addSaveButton(buttonContainer, preset, isNew, activePresetSetting, uiState);
        this.addCancelButton(buttonContainer, uiState, isNew);
    }

    addCustomTemplateSetting(
        containerEl: HTMLElement,
        preset: FilenamePreset,
        showVariablesCallback: () => void
    ): void {
        const formButtons = containerEl.querySelector(
            ".image-converter-form-buttons"
        );

        const settingWrapper = containerEl.createDiv("image-converter-custom-template-setting-wrapper");

        const customTemplateSetting = new Setting(settingWrapper)
            .setName("自定义图片名")
            .setClass("image-converter-custom-template-setting");

        const inputContainer = customTemplateSetting.controlEl.createDiv("image-converter-input-button-container");

        // Add text input
        let customTemplateText: TextComponent | undefined;
        customTemplateSetting.addText((text) => {
            customTemplateText = text;
            text.setPlaceholder("例如 {notename}-{timestamp}")
                .setValue(preset.customTemplate || "")
                .onChange((value) => {
            preset.customTemplate = value;
                    void updatePreview();
                });
            text.inputEl.setAttr('spellcheck', 'false');
            return text;
        });

        new ButtonComponent(inputContainer)
            .setIcon("help-circle")
            .setTooltip("显示可用变量")
            .onClick(showVariablesCallback);

        // Add preview area
        const previewContainer = settingWrapper.createDiv("image-converter-preview-container");
        previewContainer.createEl('div', { text: '预览：', cls: 'image-converter-preview-label' }); // Use previewLabel here
        const previewEl = previewContainer.createDiv('image-converter-preview-path');

        const updatePreview = async () => {
            if (!customTemplateText) return;

            const templateValue = customTemplateText.getValue();
            if (!templateValue) {
                previewEl.empty();
                return;
            }

            try {
                const ctx = this.getPreviewContext();
                const processedPath = await this.plugin.variableProcessor.processTemplate(templateValue, ctx);
                previewEl.setText(processedPath);
            } catch (error) {
                console.error('Preview generation error:', error);
                previewEl.setText('预览生成出错');
            }
        };

        // Initial preview update
        void updatePreview();

        new Setting(settingWrapper)
            .setName("如果输出文件已存在")
            .setDesc("选择如何处理文件名冲突")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        reuse: "重用库中已有的文件（如果有）",
                        increment: "添加数字后缀（-1、-2 等）",
                    })
                    .setValue(preset.conflictResolution || "reuse")
                    .onChange((value: "reuse" | "increment") => {
                        preset.conflictResolution = value;
                    });
            });

        if (formButtons) {
            containerEl.insertBefore(settingWrapper, formButtons);
        } else {
            containerEl.appendChild(settingWrapper);
        }
    }



    renderFolderPresetFormFields(
        formContainer: HTMLElement,
        preset: FolderPreset,
        isDefault: boolean,
        showVariablesCallback: () => void
    ): void {
        // Options for the dropdown when creating a new preset
        const newPresetOptions = {
            SUBFOLDER: "当前笔记的子文件夹中",
            CUSTOM: "自定义",
        };

        // Options for the dropdown when editing an existing preset (includes all options)
        const existingPresetOptions = {
            DEFAULT: "默认（Obsidian 设置）",
            ROOT: "根文件夹",
            CURRENT: "与当前笔记相同的文件夹",
            ...newPresetOptions, // Include the options for new presets
        };

        new Setting(formContainer)
            .setName("位置")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(
                        isDefault || !this.presetUIState.folder.newPreset
                            ? existingPresetOptions
                            : newPresetOptions
                    )
                    .setValue(preset.type || "DEFAULT") // Default to "DEFAULT" for existing, "SUBFOLDER" for new
                    .onChange((value: FolderPresetType) => {
                        preset.type = value;
                        this.updateFolderPresetFormFields(
                            formContainer,
                            preset,
                            isDefault,
                            showVariablesCallback
                        );
                    });
                if (isDefault) dropdown.setDisabled(true);
            });

        this.updateFolderPresetFormFields(formContainer, preset, isDefault, showVariablesCallback);
    }

    updateFolderPresetFormFields(
        containerEl: HTMLElement,
        preset: FolderPreset,
        isDefault: boolean,
        showVariablesCallback: () => void
    ): void {
        const subfolderSetting = containerEl.querySelector(
            ".image-converter-subfolder-name-setting-wrapper" // Changed selector to target the wrapper
        );
        const customTemplateSetting = containerEl.querySelector(
            ".image-converter-custom-path-setting-wrapper" // Changed selector to target the wrapper
        );
        const formButtons = containerEl.querySelector(
            ".image-converter-form-buttons"
        );

        // Remove both subfolder and custom path settings (including previews)
        subfolderSetting?.remove();
        customTemplateSetting?.remove();

        if (preset.type === "SUBFOLDER") {
            const wrapper = containerEl.createDiv("image-converter-subfolder-name-setting-wrapper");

            const subfolderNameSetting = new Setting(wrapper)
                .setName("子文件夹名称")
                .setDesc("输入自定义子文件夹名称或路径。")
                .setClass("image-converter-subfolder-name-setting");

            const inputContainer = subfolderNameSetting.controlEl.createDiv("image-converter-input-button-container");

            let subfolderTemplateText: TextComponent | undefined;
            subfolderNameSetting.addText((text) => {
                subfolderTemplateText = text;
                text.setPlaceholder("例如 {YYYY}/{MM}/{imagename}")
                    .setValue(this.plugin.settings.subfolderTemplate)
                    .onChange(async (value) => {
                        this.plugin.settings.subfolderTemplate = value;
                        void updatePreview();
                    });
                text.inputEl.setAttr('spellcheck', 'false');
                if (isDefault) text.setDisabled(true);
            });

            new ButtonComponent(inputContainer)
                .setIcon("help-circle")
                .setTooltip("显示可用变量")
                .onClick(showVariablesCallback);

            const previewContainer = wrapper.createDiv("image-converter-preview-container");
            previewContainer.createEl('div', { text: '预览：', cls: 'image-converter-preview-label' });
            const previewEl = previewContainer.createDiv('image-converter-preview-path');

            const updatePreview = async () => {
                if (!subfolderTemplateText) return;

                const templateValue = subfolderTemplateText.getValue();
                if (!templateValue) {
                    previewEl.empty();
                    return;
                }

                try {
                    const ctx = this.getPreviewContext();
                    const processedPath = await this.plugin.variableProcessor.processTemplate(templateValue, ctx);
                    previewEl.setText(processedPath);
                } catch (error) {
                    console.error('Preview generation error:', error);
                    previewEl.setText('预览生成出错');
                }
            };

            void updatePreview();

            if (formButtons) {
                containerEl.insertBefore(wrapper, formButtons);
            } else {
                containerEl.appendChild(wrapper);
            }
        } else if (preset.type === "CUSTOM") {
            const wrapper = containerEl.createDiv("image-converter-custom-path-setting-wrapper");

            const customPathSetting = new Setting(wrapper)
                .setName("自定义路径")
                .setDesc("输入自定义路径。")
                .setClass("image-converter-custom-template-setting");

            const inputContainer = customPathSetting.controlEl.createDiv("image-converter-input-button-container");

            let customTemplateText: TextComponent | undefined;
            customPathSetting.addText((text) => {
                customTemplateText = text;
                text.setPlaceholder("例如 {YYYY}/{MM}/{imagename}")
                    .setValue(preset.customTemplate || "")
                    .onChange((value) => {
                            preset.customTemplate = value;
                        void updatePreview();
                    });
                text.inputEl.setAttr('spellcheck', 'false');
                if (isDefault) text.setDisabled(true);
            });

            new ButtonComponent(inputContainer)
                .setIcon("help-circle")
                .setTooltip("显示可用变量")
                .onClick(showVariablesCallback);

            const previewContainer = wrapper.createDiv("image-converter-preview-container");
            previewContainer.createEl('div', { text: '预览：', cls: 'image-converter-preview-label' });
            const previewEl = previewContainer.createDiv('image-converter-preview-path');

            const updatePreview = async () => {
                if (!customTemplateText) return;

                const templateValue = customTemplateText.getValue();
                if (!templateValue) {
                    previewEl.empty();
                    return;
                }

                try {
                    const ctx = this.getPreviewContext();
                    const processedPath = await this.plugin.variableProcessor.processTemplate(templateValue, ctx);
                    previewEl.setText(processedPath);
                } catch (error) {
                    console.error('Preview generation error:', error);
                    previewEl.setText('预览生成出错');
                }
            };

            void updatePreview();

            if (formButtons) {
                containerEl.insertBefore(wrapper, formButtons);
            } else {
                containerEl.appendChild(wrapper);
            }
        }
    }

    renderConversionPresetFormFields(
        formContainer: HTMLElement,
        preset: ConversionPreset
    ): void {
        const outputFormatSetting = new Setting(formContainer)
            .setName("输出格式")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        WEBP: "WEBP",
                        JPEG: "JPEG",
                        PNG: "PNG",
                        ORIGINAL: "原始（压缩）",
                        NONE: "无（不转换/压缩）",
                        PNGQUANT: "pngquant（仅压缩 PNG）",
                        AVIF: "AVIF（通过 ffmpeg）",
                    })
                    .setValue(preset.outputFormat)
                    .onChange((value: OutputFormat) => {
                        preset.outputFormat = value;
                        this.updateConversionPresetFormFields(
                            formContainer,
                            preset,
                            outputFormatSetting
                        );
                    });
            });

        this.updateConversionPresetFormFields(
            formContainer,
            preset,
            outputFormatSetting
        );
    }

    updateConversionPresetFormFields(
        containerEl: HTMLElement,
        preset: ConversionPreset,
        outputFormatSetting: Setting
    ): void {
        const qualitySetting = containerEl.querySelector(
            ".image-converter-quality-setting"
        );
        const colorDepthSetting = containerEl.querySelector(
            ".image-converter-color-depth-setting"
        );
        const resizeModeSetting = containerEl.querySelector(
            ".image-converter-resize-mode-setting"
        );
        const desiredWidthSetting = containerEl.querySelector(
            ".image-converter-desired-width-setting"
        );
        const desiredHeightSetting = containerEl.querySelector(
            ".image-converter-desired-height-setting"
        );
        const desiredLongestEdgeSetting = containerEl.querySelector(
            ".image-converter-desired-longest-edge-setting"
        );
        const enlargeOrReduceSetting = containerEl.querySelector(
            ".image-converter-enlarge-or-reduce-setting"
        );
        const revertToOriginalSetting = containerEl.querySelector(
            ".image-converter-revert-to-original"
        );
        const minSavingsSettingEl = containerEl.querySelector(
            ".image-converter-min-savings-setting"
        );
        const pngquantExecutablePathSetting = containerEl.querySelector(".image-converter-pngquant-executable-path");
        const pngquantQualitySetting = containerEl.querySelector(".image-converter-pngquant-quality");

        // AVIF settings
        const ffmpegExecutablePathSetting = containerEl.querySelector(".image-converter-ffmpeg-executable-path");
        const ffmpegCrfSetting = containerEl.querySelector(".image-converter-ffmpeg-crf");
        const ffmpegPresetSetting = containerEl.querySelector(".image-converter-ffmpeg-preset");
        const encoderDetectionSetting = containerEl.querySelector(".image-converter-encoder-detection");


        qualitySetting?.remove();
        colorDepthSetting?.remove();
        resizeModeSetting?.remove();
        desiredWidthSetting?.remove();
        desiredHeightSetting?.remove();
        desiredLongestEdgeSetting?.remove();
        enlargeOrReduceSetting?.remove();
        revertToOriginalSetting?.remove();
        minSavingsSettingEl?.remove();
        pngquantExecutablePathSetting?.remove();
        pngquantQualitySetting?.remove();

        //Remove AVIF settings
        ffmpegExecutablePathSetting?.remove();
        ffmpegCrfSetting?.remove();
        ffmpegPresetSetting?.remove();
        encoderDetectionSetting?.remove();

        // Insert Quality setting after Output Format
        if (["WEBP", "JPEG", "ORIGINAL"].includes(preset.outputFormat)) {
            const newSetting = new Setting(containerEl)
                .setName("质量")
                .setClass("image-converter-quality-setting")
                .addSlider((slider) => {
                    slider
                        .setLimits(0, 100, 1)
                        .setValue(preset.quality)
                        .setDynamicTooltip()
                        .onChange(async (value) => {
                            preset.quality = value;
                        });
                });
            outputFormatSetting.settingEl.insertAdjacentElement(
                "afterend",
                newSetting.settingEl
            );
        }

        // Insert Color Depth setting after Quality (if applicable) or Output Format
        if (preset.outputFormat === "PNG") {
            const newSetting = new Setting(containerEl)
                .setName("色彩深度")
                .setClass("image-converter-color-depth-setting")
                .addSlider((slider) => {
                    slider
                        .setLimits(0, 1, 0.1)
                        .setValue(preset.colorDepth)
                        .setDynamicTooltip()
                        .onChange(async (value) => {
                            preset.colorDepth = value;
                        });
                });

            const qualitySettingEl = containerEl.querySelector(
                ".image-converter-quality-setting"
            );
            if (qualitySettingEl) {
                qualitySettingEl.insertAdjacentElement(
                    "afterend",
                    newSetting.settingEl
                );
            } else {
                outputFormatSetting.settingEl.insertAdjacentElement(
                    "afterend",
                    newSetting.settingEl
                );
            }
        }

        // Insert PNGQUANT settings after Output Format
        if (preset.outputFormat === "PNGQUANT") {
            const executablePathSetting = new Setting(containerEl)
                .setName("pngquant 可执行文件路径")
                .then((setting) => addInfoIcon(setting, "提供二进制文件的完整路径。它可以在库内或文件系统的任何位置。"))
                .setClass("image-converter-pngquant-executable-path") // Add class for easy selection
                .addText((text) => {
                    text.setValue(preset.pngquantExecutablePath || "")
                        .onChange((value) => {
                            preset.pngquantExecutablePath = value;
                            void this.plugin.saveSettings();
                        });
                    text.inputEl.setAttr('spellcheck', 'false'); // Disable spellcheck
                });
            outputFormatSetting.settingEl.insertAdjacentElement(
                "afterend",
                executablePathSetting.settingEl
            );

            const qualitySetting = new Setting(containerEl)
                .setName("pngquant 质量范围")
                .setDesc("pngquant 质量设置（例如 65-80）。必须提供最小-最大值。")
                .setClass("image-converter-pngquant-quality") // Add class for easy selection
                .addText((text) => {
                    text.setValue(preset.pngquantQuality || "")
                        .onChange((value) => {
                            preset.pngquantQuality = value;
                            void this.plugin.saveSettings();
                        });
                    text.inputEl.setAttr('spellcheck', 'false'); // Disable spellcheck
                });
            executablePathSetting.settingEl.insertAdjacentElement( // Insert after executable path
                "afterend",
                qualitySetting.settingEl
            );
        }

        // Insert AVIF settings after Output Format
        if (preset.outputFormat === "AVIF") {
            let textComponent: TextComponent | undefined;

            const buildEncoderDesc = (prefix: string, encoderLabel: string, suffix: string): DocumentFragment => {
                const fragment = document.createDocumentFragment();
                const prefixSpan = document.createElement("span");
                prefixSpan.textContent = prefix;
                const encoderSpan = document.createElement("span");
                encoderSpan.textContent = encoderLabel;
                encoderSpan.className = "image-converter-encoder-highlight";
                const suffixSpan = document.createElement("span");
                suffixSpan.textContent = suffix;
                fragment.append(prefixSpan, encoderSpan, suffixSpan);
                return fragment;
            };

            let encoderDetectionButton: ButtonComponent | undefined;

            const defaultEncoderDesc = "通过运行测试编码来检测和验证可用的 AV1 编码器。这可确保硬件编码器在您的系统上确实可用。";
            const defaultCrfDesc = "AVIF 的恒定速率因子（0-63，越低质量越好）。范围因编码器而异 - 点击'检测编码器'查看具体范围。";

            const resetEncoderUi = (encoderDetectionSetting: Setting, crfSetting: Setting, presetSetting: Setting) => {
                encoderDetectionSetting.setDesc(defaultEncoderDesc);
                encoderDetectionSetting.settingEl.removeClass("image-converter-encoder-detected");
                encoderDetectionButton?.buttonEl?.removeClass("image-converter-encoder-detected");

                crfSetting.setDesc(defaultCrfDesc);
                crfSetting.settingEl.removeClass("image-converter-encoder-detected");

                presetSetting.settingEl.show();
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- Technical description
                presetSetting.setDesc("编码预设（速度与压缩的平衡）。");

                const dropdown = presetSetting.controlEl.querySelector('select');
                if (dropdown) {
                    dropdown.innerHTML = '';
                    const defaultPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow', 'placebo'];
                    defaultPresets.forEach(presetName => {
                        const option = document.createElement('option');
                        option.value = presetName;
                        option.text = presetName;
                        dropdown.appendChild(option);
                    });
                    dropdown.value = preset.ffmpegPreset || 'medium';
                }
            };

            const executablePathSetting = new Setting(containerEl)
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- Product name
                .setName("FFmpeg 可执行文件路径")
                .then((setting) => addInfoIcon(setting, "提供二进制文件的完整路径。它可以在库内或文件系统的任何位置。"))
                .setClass("image-converter-ffmpeg-executable-path")
                .addButton(button => {
                    button
                        .setIcon("search")
                        // eslint-disable-next-line obsidianmd/ui/sentence-case -- FFmpeg is the official brand name
                        .setTooltip("自动检测 FFmpeg")
                        .setClass("image-converter-icon-button")
                        .onClick(async () => {
                            button.setDisabled(true);
                            try {
                                const detectedPath = await findFfmpegExecutablePath(this.app);
                                if (!detectedPath) {
                                    // eslint-disable-next-line obsidianmd/ui/sentence-case
                                    new Notice("未找到 FFmpeg。请尝试通过以下方式安装：Homebrew (macOS)、Chocolatey (Windows) 或 apt/snap (Linux)。然后手动设置路径。", 8000);
                                    return;
                                }

                                const normalizedPath = normalizeExecutablePath(detectedPath);
                                const previousPath = preset.ffmpegExecutablePath || "";
                                preset.ffmpegExecutablePath = normalizedPath;
                                this.plugin.settings.ffmpegExecutablePath = normalizedPath;
                                if (this.plugin.settings.singleImageModalSettings) {
                                    this.plugin.settings.singleImageModalSettings.ffmpegExecutablePath = normalizedPath;
                                }
                                if (normalizedPath !== previousPath) {
                                    preset.detectedEncoder = undefined;
                                    this.plugin.settings.detectedEncoder = undefined;
                                    if (this.plugin.settings.singleImageModalSettings) {
                                        this.plugin.settings.singleImageModalSettings.detectedEncoder = undefined;
                                    }
                                    resetEncoderUi(encoderDetectionSetting, crfSetting, presetSetting);
                                }
                                void this.plugin.saveSettings();

                                textComponent?.setValue(normalizedPath);
                                // eslint-disable-next-line obsidianmd/ui/sentence-case
                                new Notice("已检测并保存 FFmpeg 路径。", 4000);
                            } catch (error) {
                                const message = error instanceof Error ? error.message : String(error);
                                console.error("FFmpeg auto-detection failed:", message);
                                new Notice(`FFmpeg 自动检测失败：${message}`);
                            } finally {
                                button.setDisabled(false);
                            }
                        });
                })
                .addText(text => {
                    textComponent = text;
                    text.setValue(preset.ffmpegExecutablePath || "")
                        .onChange(value => {
                            const normalizedPath = normalizeExecutablePath(value);
                            const previousPath = preset.ffmpegExecutablePath || "";
                            preset.ffmpegExecutablePath = normalizedPath;
                            this.plugin.settings.ffmpegExecutablePath = normalizedPath;
                            if (this.plugin.settings.singleImageModalSettings) {
                                this.plugin.settings.singleImageModalSettings.ffmpegExecutablePath = normalizedPath;
                            }
                            if (normalizedPath !== previousPath) {
                                preset.detectedEncoder = undefined;
                                this.plugin.settings.detectedEncoder = undefined;
                                if (this.plugin.settings.singleImageModalSettings) {
                                    this.plugin.settings.singleImageModalSettings.detectedEncoder = undefined;
                                }
                                resetEncoderUi(encoderDetectionSetting, crfSetting, presetSetting);
                            }
                            if (normalizedPath !== value) {
                                text.setValue(normalizedPath);
                            }
                            void this.plugin.saveSettings();
                        });
                    text.inputEl.setAttr('spellcheck', 'false');
                });
            outputFormatSetting.settingEl.insertAdjacentElement("afterend", executablePathSetting.settingEl);

            // Add encoder detection button
            const encoderDetectionSetting = new Setting(containerEl)
                .setName("编码器检测")
                .setDesc(defaultEncoderDesc)
                .setClass("image-converter-encoder-detection")
                .addButton(button => {
                    encoderDetectionButton = button;
                    button
                        .setButtonText("检测编码器")
                        .setCta()
                        .onClick(async () => {
                            if (!preset.ffmpegExecutablePath) {
                                // eslint-disable-next-line obsidianmd/ui/sentence-case -- FFmpeg is the official brand name
                                new Notice("请先指定 FFmpeg 可执行文件路径");
                                return;
                            }
                            
                            button.setButtonText("验证中...");
                            button.setDisabled(true);
                            
                            try {
                                // Import ImageProcessor to use detection method
                                // eslint-disable-next-line @typescript-eslint/naming-convention -- Import matches class name
                                const { ImageProcessor, ENCODER_CONFIGS } = await import('./ImageProcessor');
                                type AvifEncoder = keyof typeof ENCODER_CONFIGS;
                                const processor = new ImageProcessor(this.plugin.supportedImageFormats);
                                
                                const encoder = await processor.detectAvifEncoder(preset.ffmpegExecutablePath, preset.detectedEncoder);
                                
                                if (encoder) {
                                    const encoderInfo = ENCODER_CONFIGS[encoder];
                                    const platformHint = encoderInfo ? ` (${encoderInfo.platformHint})` : '';
                                    new Notice(`✓ 可用编码器：${encoder}${platformHint}`, 5000);
                                    
                                    // Save detected encoder to preset (persists in data.json)
                                    preset.detectedEncoder = encoder;
                                    void this.plugin.saveSettings();
                                    
                                    encoderDetectionDesc(`${encoder}${platformHint}`, encoderInfo?.crfMin, encoderInfo?.crfMax);
                                    encoderDetectionSetting.settingEl.addClass("image-converter-encoder-detected");
                                    encoderDetectionButton?.buttonEl?.addClass("image-converter-encoder-detected");
                                    
                                    // Update CRF description with the detected encoder's range
                                    crfDesc(encoder, encoderInfo?.crfMin, encoderInfo?.crfMax);
                                    crfSetting.settingEl.addClass("image-converter-encoder-detected");
                                    
                                    // Show/hide preset setting based on encoder support
                                    if (encoderInfo?.supportsPreset && encoderInfo.presetNames) {
                                        presetSetting.settingEl.show();
                                        presetSetting.setDesc(`${encoder} 的编码预设（速度与压缩的平衡）。`);
                                        
                                        // Update dropdown options with encoder-specific presets
                                        const dropdown = presetSetting.controlEl.querySelector('select');
                                        if (dropdown) {
                                            // Clear existing options
                                            dropdown.innerHTML = '';
                                            
                                            // Add encoder-specific presets
                                            encoderInfo.presetNames.forEach(presetName => {
                                                const option = document.createElement('option');
                                                option.value = presetName;
                                                option.text = presetName;
                                                dropdown.appendChild(option);
                                            });
                                            
                                            // Set current value or default to middle option
                                            const currentPreset = preset.ffmpegPreset || encoderInfo.presetNames[Math.floor(encoderInfo.presetNames.length / 2)];
                                            dropdown.value = encoderInfo.presetNames.includes(currentPreset) ? currentPreset : encoderInfo.presetNames[Math.floor(encoderInfo.presetNames.length / 2)];
                                            preset.ffmpegPreset = dropdown.value;
                                            void this.plugin.saveSettings();
                                        }
                                    } else {
                                        presetSetting.settingEl.hide();
                                    }
                                } else {
                                    const cachedEncoder = preset.detectedEncoder as AvifEncoder | undefined;
                                    const cachedInfo = cachedEncoder ? ENCODER_CONFIGS[cachedEncoder] : undefined;
                                    if (cachedInfo) {
                                        if (!cachedEncoder) {
                                            return;
                                        }
                                        const platformHint = cachedInfo ? ` (${cachedInfo.platformHint})` : '';
                                        new Notice(`编码器检测失败。使用缓存的编码器：${cachedEncoder}${platformHint}`, 5000);
                                        encoderDetectionDesc(`${cachedEncoder}${platformHint}`, cachedInfo.crfMin, cachedInfo.crfMax);
                                        encoderDetectionSetting.settingEl.addClass("image-converter-encoder-detected");
                                        encoderDetectionButton?.buttonEl?.addClass("image-converter-encoder-detected");
                                        crfDesc(cachedEncoder, cachedInfo.crfMin, cachedInfo.crfMax);
                                        crfSetting.settingEl.addClass("image-converter-encoder-detected");

                                        if (cachedInfo.supportsPreset && cachedInfo.presetNames) {
                                            presetSetting.settingEl.show();
                                            presetSetting.setDesc(`${cachedEncoder} 的编码预设（速度与压缩的平衡）。`);

                                            const dropdown = presetSetting.controlEl.querySelector('select');
                                            if (dropdown) {
                                                dropdown.innerHTML = '';
                                                cachedInfo.presetNames.forEach(presetName => {
                                                    const option = document.createElement('option');
                                                    option.value = presetName;
                                                    option.text = presetName;
                                                    dropdown.appendChild(option);
                                                });

                                                const currentPreset = preset.ffmpegPreset || cachedInfo.presetNames[Math.floor(cachedInfo.presetNames.length / 2)];
                                                dropdown.value = cachedInfo.presetNames.includes(currentPreset) ? currentPreset : cachedInfo.presetNames[Math.floor(cachedInfo.presetNames.length / 2)];
                                                preset.ffmpegPreset = dropdown.value;
                                                void this.plugin.saveSettings();
                                            }
                                        } else {
                                            presetSetting.settingEl.hide();
                                        }
                                        return;
                                    }

                                    // eslint-disable-next-line obsidianmd/ui/sentence-case -- Technical terms: AV1, FFmpeg
                                    new Notice("未找到可用的 AV1 编码器。请安装支持 AV1 的 FFmpeg。", 5000);
                                    // eslint-disable-next-line obsidianmd/ui/sentence-case
                                    encoderDetectionSetting.setDesc("未找到可用编码器。请安装 FFmpeg 的 libaom-av1、libsvtav1，或确保硬件驱动已安装。");
                                    resetEncoderUi(encoderDetectionSetting, crfSetting, presetSetting);
                                }
                            } catch (error) {
                                console.error("Encoder detection error:", error);
                                new Notice(`检测编码器出错：${error instanceof Error ? error.message : String(error)}`);
                            } finally {
                                button.setButtonText("检测编码器");
                                button.setDisabled(false);
                            }
                        });
                });
            executablePathSetting.settingEl.insertAdjacentElement("afterend", encoderDetectionSetting.settingEl);

            const crfSetting = new Setting(containerEl)
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- Product name and acronym
                .setName("FFmpeg CRF")
                .setDesc(defaultCrfDesc)
                .setClass("image-converter-ffmpeg-crf")
                .addText((text) => { // Keep as TextComponent for numeric input
                    text.setValue(preset.ffmpegCrf?.toString() || "")
                        .onChange(value => {
                            const parsedValue = parseInt(value, 10);
                            preset.ffmpegCrf = isNaN(parsedValue) ? undefined : parsedValue;
                            void this.plugin.saveSettings();
                        });
                    text.inputEl.setAttr('spellcheck', 'false');
                });
            const encoderDetectionDesc = (encoderLabel: string, crfMin?: number, crfMax?: number) => {
                encoderDetectionSetting.setDesc(
                    buildEncoderDesc(
                        "可用编码器：",
                        encoderLabel,
                        `。CRF 范围：${crfMin ?? "?"}-${crfMax ?? "?"}`
                    )
                );
            };

            const crfDesc = (encoderLabel: string, crfMin?: number, crfMax?: number) => {
                crfSetting.setDesc(
                    buildEncoderDesc(
                        "恒定速率因子，编码器：",
                        encoderLabel,
                        ` （${crfMin ?? "?"}-${crfMax ?? "?"}，越低质量越好）。`
                    )
                );
            };
            encoderDetectionSetting.settingEl.insertAdjacentElement("afterend", crfSetting.settingEl);


            const presetSetting = new Setting(containerEl)
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- Product name
                .setName("FFmpeg 预设")
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- Technical description
                .setDesc("编码预设（速度与压缩的平衡）。")
                .setClass("image-converter-ffmpeg-preset")
                // Change this to a dropdown:
                .addDropdown(dropdown => {
                    dropdown
                        .addOptions({
                            ultrafast: "ultrafast",
                            superfast: "superfast",
                            veryfast: "veryfast",
                            faster: "faster",
                            fast: "fast",
                            medium: "medium",
                            slow: "slow",
                            slower: "slower",
                            veryslow: "veryslow",
                            placebo: "placebo",
                        })
                        .setValue(preset.ffmpegPreset || "medium") // default
                        .onChange(value => {
                            preset.ffmpegPreset = value;
                            void this.plugin.saveSettings();
                        });
                });
            crfSetting.settingEl.insertAdjacentElement("afterend", presetSetting.settingEl);

            // Rehydrate encoder UI from cached preset value (if present)
            void (async () => {
                if (!preset.detectedEncoder) {
                    return;
                }

                try {
                    const { ENCODER_CONFIGS } = await import('./ImageProcessor');
                    type AvifEncoder = keyof typeof ENCODER_CONFIGS;
                    const encoder = preset.detectedEncoder as AvifEncoder;
                    const encoderInfo = ENCODER_CONFIGS[encoder];
                    if (!encoderInfo) {
                        return;
                    }

                    const platformHint = encoderInfo ? ` (${encoderInfo.platformHint})` : '';
                    encoderDetectionDesc(`${encoder}${platformHint}`, encoderInfo.crfMin, encoderInfo.crfMax);
                    encoderDetectionSetting.settingEl.addClass("image-converter-encoder-detected");
                    encoderDetectionButton?.buttonEl?.addClass("image-converter-encoder-detected");
                    crfDesc(encoder, encoderInfo.crfMin, encoderInfo.crfMax);
                    crfSetting.settingEl.addClass("image-converter-encoder-detected");

                    if (encoderInfo.supportsPreset && encoderInfo.presetNames) {
                        presetSetting.settingEl.show();
                        presetSetting.setDesc(`${encoder} 的编码预设（速度与压缩的平衡）。`);

                        const dropdown = presetSetting.controlEl.querySelector('select');
                        if (dropdown) {
                            dropdown.innerHTML = '';
                            encoderInfo.presetNames.forEach(presetName => {
                                const option = document.createElement('option');
                                option.value = presetName;
                                option.text = presetName;
                                dropdown.appendChild(option);
                            });

                            const currentPreset = preset.ffmpegPreset || encoderInfo.presetNames[Math.floor(encoderInfo.presetNames.length / 2)];
                            dropdown.value = encoderInfo.presetNames.includes(currentPreset) ? currentPreset : encoderInfo.presetNames[Math.floor(encoderInfo.presetNames.length / 2)];
                            preset.ffmpegPreset = dropdown.value;
                            void this.plugin.saveSettings();
                        }
                    } else {
                        presetSetting.settingEl.hide();
                    }
                } catch (error) {
                    console.error("Encoder rehydration error:", error);
                }
            })();
        }

        // Find the last setting added so far
        let lastAddedSetting: HTMLElement | null =
            containerEl.querySelector(
                ".image-converter-color-depth-setting"
            ) || containerEl.querySelector(".image-converter-quality-setting");
        if (!lastAddedSetting) {
            lastAddedSetting = outputFormatSetting.settingEl;
        }

        // Insert Resize Mode setting after the last added setting
        const resizeSetting = new Setting(containerEl)
            .setName("调整大小模式")
            .setClass("image-converter-resize-mode-setting")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        None: "无",
                        Fit: "适应",
                        Fill: "填充",
                        LongestEdge: "最长边",
                        ShortestEdge: "最短边",
                        Width: "宽度",
                        Height: "高度",
                    })
                    .setValue(preset.resizeMode)
                    .onChange((value: ResizeMode) => {
                        preset.resizeMode = value;
                        this.updateConversionPresetFormFields(
                            containerEl,
                            preset,
                            outputFormatSetting
                        );
                    });
            });
        if (lastAddedSetting) {
            lastAddedSetting.insertAdjacentElement(
                "afterend",
                resizeSetting.settingEl
            );
        }

        // Update lastAddedSetting to be the Resize Mode setting
        lastAddedSetting = resizeSetting.settingEl;

        if (["Fit", "Fill", "Width"].includes(preset.resizeMode)) {
            const newSetting = new Setting(containerEl)
                .setName("目标宽度")
                .setClass("image-converter-desired-width-setting")
                .addText((text) => {
                    text.setValue(preset.desiredWidth.toString()).onChange(
                        (value) => {
                            preset.desiredWidth = parseInt(value, 10);
                        }
                    );
                    text.inputEl.setAttr('spellcheck', 'false'); // Disable spellcheck
                });
            lastAddedSetting.insertAdjacentElement(
                "afterend",
                newSetting.settingEl
            );
            lastAddedSetting = newSetting.settingEl;
        }

        if (["Fit", "Fill", "Height"].includes(preset.resizeMode)) {
            const newSetting = new Setting(containerEl)
                .setName("目标高度")
                .setClass("image-converter-desired-height-setting")
                .addText((text) => {
                    text.setValue(preset.desiredHeight.toString()).onChange(
                        (value) => {
                            preset.desiredHeight = parseInt(value, 10);
                        }
                    );
                    text.inputEl.setAttr('spellcheck', 'false'); // Disable spellcheck
                });
            lastAddedSetting.insertAdjacentElement(
                "afterend",
                newSetting.settingEl
            );
            lastAddedSetting = newSetting.settingEl;
        }

        if (["LongestEdge", "ShortestEdge"].includes(preset.resizeMode)) {
            // Remove existing longest/shortest edge setting
            const existingEdgeSetting = containerEl.querySelector(
                ".image-converter-desired-longest-edge-setting, .image-converter-desired-shortest-edge-setting"
            );
            existingEdgeSetting?.remove();

            const newSetting = new Setting(containerEl)
                .setName(preset.resizeMode === "LongestEdge" ? "目标最长边" : "目标最短边") // Dynamically set the name
                .setClass(preset.resizeMode === "LongestEdge" ? "image-converter-desired-longest-edge-setting" : "image-converter-desired-shortest-edge-setting") // Dynamically set the class
                .addText((text) => {
                    text.setValue(
                        preset.desiredLongestEdge.toString() // Still use desiredLongestEdge to store the value for both cases
                    ).onChange((value) => {
                        preset.desiredLongestEdge = parseInt(value, 10); // Still use desiredLongestEdge to store the value for both cases
                    });
                    text.inputEl.setAttr('spellcheck', 'false');
                });
            lastAddedSetting.insertAdjacentElement(
                "afterend",
                newSetting.settingEl
            );
            lastAddedSetting = newSetting.settingEl;
        }

        if (preset.resizeMode !== "None") {
            const newSetting = new Setting(containerEl)
                .setName("缩放模式")
                .setClass("image-converter-enlarge-or-reduce-setting")
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            Auto: "自动",
                            Reduce: "仅缩小",
                            Enlarge: "仅放大",
                        })
                        .setValue(preset.enlargeOrReduce)
                        .onChange((value: EnlargeReduce) => {
                            preset.enlargeOrReduce = value;
                        });
                });
            lastAddedSetting.insertAdjacentElement(
                "afterend",
                newSetting.settingEl
            );
            lastAddedSetting = newSetting.settingEl;
        }

        const newSetting = new Setting(containerEl)
            .setName("如果更大则恢复原图")
            .setClass("image-converter-revert-to-original")
            .setDesc("如果处理后的图片文件大小大于原始图片，则使用原始图片。有时压缩可能会增加文件大小，特别是某些格式或设置，如果您希望始终获得更小的文件大小，请启用此选项。")
            .addToggle((toggle) =>
                toggle
                    .setValue(preset.revertToOriginalIfLarger ?? this.plugin.settings.revertToOriginalIfLarger)
                    .onChange(async (value) => {
                        preset.revertToOriginalIfLarger = value;
                        await this.plugin.saveSettings();
                        updateMinSavingsVisibility();
                    })
            );
        lastAddedSetting.insertAdjacentElement(
            "afterend",
            newSetting.settingEl
        );
        lastAddedSetting = newSetting.settingEl;

        const minSavingsSetting = new Setting(containerEl)
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setName("最小压缩节省量 (KB)")
            .setClass("image-converter-min-savings-setting")
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            .setDesc("此选项允许您进一步指定压缩图片前文件大小必须减少多少。有时图片大小可能只缩小 3 KB，但可见的质量下降却很明显。此选项有助于捕获这些情况并避免压缩此类图片。默认值为 30KB，即如果压缩后图片文件大小仅减少 30KB 或更少，则将使用原始图片字节。设置为 0 则在输出较小时始终允许压缩。")
            .addText((text) =>
                text
                    .setPlaceholder("30")
                    .setValue(String(preset.minimumCompressionSavingsInKB ?? this.plugin.settings.minimumCompressionSavingsInKB))
                    .onChange(async (value) => {
                        const numValue = Number(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                            preset.minimumCompressionSavingsInKB = numValue;
                            await this.plugin.saveSettings();
                        }
                    })
            );
        lastAddedSetting.insertAdjacentElement(
            "afterend",
            minSavingsSetting.settingEl
        );
        lastAddedSetting = minSavingsSetting.settingEl;

        const updateMinSavingsVisibility = () => {
            if (preset.revertToOriginalIfLarger ?? this.plugin.settings.revertToOriginalIfLarger) {
                minSavingsSetting.settingEl.show();
            } else {
                minSavingsSetting.settingEl.hide();
            }
        };

        updateMinSavingsVisibility();
    }


    renderLinkFormatSettings(): void {
        const { containerEl } = this;
        containerEl.createDiv("image-converter-tab-content-wrapper");

        // 1. Preset Management:
        this.renderPresetGroup(
            "链接格式预设",
            this.plugin.settings.linkFormatSettings.linkFormatPresets,
            "selectedLinkFormatPreset",
            this.presetUIState.linkformat
        );
    }

    // New method to render form fields specifically for LinkFormatPreset
    renderLinkFormatFormFields(
        formContainer: HTMLElement,
        preset: LinkFormatPreset
    ): void {
        // Link Format (Dropdown)
        new Setting(formContainer)
            .setName("链接格式")
            .setDesc("在 Wikilink 和 Markdown 格式之间选择")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        wikilink: "Wikilink",
                        markdown: "Markdown",
                    })
                    .setValue(preset.linkFormat)
                    .onChange((value: LinkFormat) => {
                        preset.linkFormat = value;
                        this.updateExamples(formContainer, preset); // Update examples on change
                    });
            });

        // Path Format (Dropdown)
        new Setting(formContainer)
            .setName("路径格式")
            .setDesc("选择路径格式化方式")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        shortest: "最短路径",
                        relative: "相对路径",
                        absolute: "绝对路径",
                    })
                    .setValue(preset.pathFormat)
                    .onChange((value: PathFormat) => {
                        preset.pathFormat = value;
                        this.updateExamples(formContainer, preset); // Update examples on change
                    });
            });

        // Collapsible Examples Section
        const examplesSection = formContainer.createEl("details", {
            cls: "image-converter-format-examples-section"
        });
        examplesSection.createEl("summary", { text: "示例" }); // Use summary for details

        examplesSection.createEl("div", {
            cls: "image-converter-format-examples-content"
        });

        // Examples table (Initially populated)
        this.updateExamples(formContainer, preset);
    }

    // Helper method to update examples content
    updateExamples(formContainer: HTMLElement, preset: LinkFormatPreset): void {
        const examplesSection = formContainer.querySelector(".image-converter-format-examples-section");
        if (!examplesSection) return;

        const content = examplesSection.querySelector(".image-converter-format-examples-content") as HTMLElement;
        content.empty();

        const table = content.createEl("table", { cls: "image-converter-format-examples-table" });

        const buildExample = (format: PathFormat) => {
            const { linkFormat } = preset;
            switch (format) {
                case "shortest":
                    return linkFormat === "wikilink" ? "![[image.jpg]]" : "![](image.jpg)";
                case "relative":
                    return linkFormat === "wikilink" ? "![[./subfolder/image.jpg]]" : "![](./subfolder/image.jpg)";
                case "absolute":
                    return linkFormat === "wikilink" ? "![[/subfolder/image.jpg]]" : "![](/subfolder/image.jpg)";
                default:
                    return "";
            }
        };

        const formats = [
            ["最短路径",
                `仅使用文件名，不包含任何路径：
             <ul>
                 <li><b>Wikilink</b>: ![[image.jpg]]</li>
                 <li><b>Markdown</b>: ![](image.jpg)</li>
             </ul>`,
                buildExample("shortest")],

            ["相对路径",
                `使用相对于当前笔记的路径：
             <ul>
                 <li>同一文件夹：以 <code>./</code> 开头（例如 <code>./image.jpg</code>）</li>
                 <li>上级文件夹：以 <code>../</code> 开头（例如 <code>../image.jpg</code>）</li>
                 <li>子文件夹：包含文件夹路径（例如 <code>./subfolder/image.jpg</code>）</li>
             </ul>`,
                buildExample("relative")],

            ["绝对路径",
                `使用从库根目录开始的完整路径，始终以 <code>/</code> 开头。
             这确保链接在库中的任何笔记中都有效，无论其位置如何。`,
                buildExample("absolute")]
        ];

        formats.forEach(([format, description, example]) => {
            const row = table.createEl("tr");
            row.createEl("td", { cls: "image-converter-format-label", text: format });
        // eslint-disable-next-line @microsoft/sdl/no-inner-html -- Safe: developer-controlled static HTML content
            row.createEl("td", { cls: "image-converter-format-description" }).innerHTML = description;
            row.createEl("td", { cls: "image-converter-format-example", text: example });
        });

        // Practical example
        const scenario = content.createEl("div", { cls: "image-converter-format-scenario" });
        const paths = scenario.createEl("div", { cls: "image-converter-format-paths" });
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- Example label with emoji
        paths.createEl("div", { cls: "image-converter-path-label" }).setText("📄 笔记位置：");
        paths.createEl("div", { cls: "image-converter-path-value" }).setText("/Folder/Subfolder1/note.md");
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- Example label with emoji
        paths.createEl("div", { cls: "image-converter-path-label" }).setText("🖼️ 图片位置：");
        paths.createEl("div", { cls: "image-converter-path-value" }).setText("/Folder/Subfolder2/image.jpg");

        const result = scenario.createEl("div", { cls: "image-converter-format-result" });
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- Example label with arrow
        result.createEl("div", { cls: "image-converter-result-label" }).setText("→ 路径变为：");
        const resultValue = result.createEl("div", { cls: "image-converter-result-value" });

        const updateResult = () => {
            const { linkFormat } = preset;

            // Clear previous content first
            resultValue.empty();

            // Create a new table
            const resultTable = resultValue.createEl("table");

            const addRow = (format: string, path: string) => {
                const row = resultTable.createEl("tr");
                row.createEl("td", { text: format, cls: "format-label" });
                row.createEl("td", { text: path, cls: "format-value" });
            };

            if (linkFormat === "wikilink") {
                addRow("最短路径：", "![[Bäume.jpg]]");
                addRow("相对路径：", "![[../Subfolder2/Bäume.jpg]]");
                addRow("绝对路径：", "![[/Folder/Subfolder2/Bäume.jpg]]");
            } else {
                addRow("最短路径：", "![](Bäume.jpg)");
                addRow("相对路径：", "![](../Subfolder2/Bäume.jpg)");
                addRow("绝对路径：", "![](/Folder/Subfolder2/Bäume.jpg)");
            }
        };

        updateResult();
    }

    isDefaultPreset<
        T extends
        | FolderPreset
        | FilenamePreset
        | ConversionPreset
        | LinkFormatPreset
        | NonDestructiveResizePreset
    >(preset: T, activePresetSetting: ActivePresetSetting): boolean {
        const defaultPresetNames: Record<ActivePresetSetting, string[]> = {
            selectedFolderPreset: [
                "Default (Obsidian setting)",
                "Root folder",
                "Same folder as current note",
            ],
            selectedFilenamePreset: ["Keep original name", "NoteName-Timestamp"],
            selectedConversionPreset: ["None", "WEBP (75, no resizing)"],
            selectedLinkFormatPreset: [
                "Default (Wikilink, Shortest)",
                "Markdown, Relative",
            ],
            selectedResizePreset: ["Default (No Resize)"], // Add this line
        };

        return defaultPresetNames[activePresetSetting]?.includes(preset.name);
    }

    // this renders the + Add New preset card
    addAddNewPresetCard<T extends FolderPreset | FilenamePreset | ConversionPreset | LinkFormatPreset | NonDestructiveResizePreset>(
        containerEl: HTMLElement,
        activePresetSetting: ActivePresetSetting,
        uiState: PresetCategoryUIState<T>
    ): void {
        const card = containerEl.createDiv({
            cls: "image-converter-preset-card image-converter-add-new-preset",
        });
        card.createEl("div", {
            // eslint-disable-next-line obsidianmd/ui/sentence-case -- Action button text
            text: "+ 新增",
            cls: "image-converter-add-new-preset-text",
        });

        card.onClickEvent(() => {
            if (activePresetSetting === "selectedFolderPreset") {
                uiState.newPreset = { name: "", type: "SUBFOLDER" } as T;
            } else if (activePresetSetting === "selectedFilenamePreset") {
                uiState.newPreset = {
                    name: "",
                    customTemplate: "",
                    skipRenamePatterns: "",
                } as T;
            } else if (activePresetSetting === "selectedLinkFormatPreset") {
                uiState.newPreset = {
                    name: "",
                    linkFormat: "wikilink",
                    pathFormat: "shortest",
                } as T;
            } else if (activePresetSetting === "selectedConversionPreset") {
                uiState.newPreset = {
                    name: "",
                    outputFormat: "NONE",
                    quality: 100,
                    colorDepth: 1,
                    resizeMode: "None",
                    desiredWidth: 800,
                    desiredHeight: 600,
                    desiredLongestEdge: 1000,
                    enlargeOrReduce: "Auto",
                    allowLargerFiles: false,
                    revertToOriginalIfLarger: false,
                    minimumCompressionSavingsInKB: 30,
                    skipConversionPatterns: "",
                    ffmpegExecutablePath: this.plugin.settings.ffmpegExecutablePath || "",
                    ffmpegCrf: 23,
                    ffmpegPreset: "medium",
                } as T;
            } else if (activePresetSetting === "selectedResizePreset") {
                // Add this case
                uiState.newPreset = {
                    name: "",
                    resizeDimension: "none",
                } as T;
            }

            // Check if uiState.newPreset is not null before passing it to showPresetForm
            if (uiState.newPreset !== null) {
                // Ensure formContainer is initialized before showing the form
                if (!this.formContainer) {
                    this.initializeFormContainer();
                }

                this.showPresetForm(uiState.newPreset, true, activePresetSetting, uiState);
            } else {
                // Handle the case where newPreset is null, e.g., show an error message
                console.error("Error: newPreset is null.");
            }
        });
    }

    async generateFolderPresetSummary(containerEl: HTMLElement, preset: FolderPreset): Promise<void> {
        containerEl.empty(); // Clear existing content
        this.cachedFirstMarkdownFile = undefined;

        const fragment = document.createDocumentFragment();

        const addLine = (text: string) => {
            fragment.createEl("p", { text });
        };

        const addExample = async (template: string) => {
            const exampleEl = fragment.createEl("p", { cls: "image-converter-summary-example" });
            exampleEl.textContent = "示例: 加载中..."; // Placeholder

            try {
                const ctx = this.getPreviewContext();
                const processedPath = await this.plugin.variableProcessor.processTemplate(template, ctx);
                exampleEl.textContent = `示例: ${processedPath}`;
            } catch (error) {
                console.error('Preview generation error:', error);
            exampleEl.textContent = '示例: 生成预览时出错';
            }
        };

        switch (preset.type) {
            case "DEFAULT":
                addLine("默认（使用 Obsidian 配置的附件设置）");
                void addExample("Assets/{notename}/{imagename}");
                break;
            case "ROOT":
                addLine("仓库根目录（顶层文件夹）。");
                void addExample("{imagename}");
                break;
            case "CURRENT":
                addLine("与当前编辑的笔记相同的文件夹。");
                void addExample("{notepath}/{imagename}");
                break;
            case "SUBFOLDER":
                addLine(`子文件夹: ${this.plugin.settings.subfolderTemplate}`);
                void addExample(this.plugin.settings.subfolderTemplate);
                break;
            case "CUSTOM":
                addLine(`自定义位置: ${preset.customTemplate}`);
                void addExample(preset.customTemplate || "");
                break;
            default:
                addLine("未知位置");
                break;
        }

        containerEl.appendChild(fragment);
    }

    async generateFilenamePresetSummary(containerEl: HTMLElement, preset: FilenamePreset): Promise<void> {
        containerEl.empty(); // Clear existing content
        this.cachedFirstMarkdownFile = undefined;

        const fragment = document.createDocumentFragment();

        const addLine = (text: string) => {
            fragment.createEl("p", { text });
        };

        const addExample = async (template: string) => {
            const exampleEl = fragment.createEl("p", { cls: "image-converter-summary-example" });
            exampleEl.textContent = "示例: 加载中..."; // Placeholder

            try {
                const ctx = this.getPreviewContext();
                const processedPath = await this.plugin.variableProcessor.processTemplate(template, ctx);
                exampleEl.textContent = `示例: ${processedPath}`;
            } catch (error) {
                console.error('Preview generation error:', error);
                exampleEl.textContent = '示例: 生成预览时出错';
            }
        };

        addLine(`模板: ${preset.customTemplate || "{imagename}"}`);
        void addExample(preset.customTemplate || "{imagename}");

        if (preset.skipRenamePatterns) {
            addLine(`跳过重命名模式: ${preset.skipRenamePatterns}`);
        }
        if (preset.conflictResolution) {
            addLine(`如果输出文件已存在: ${preset.conflictResolution}`);
        }

        containerEl.appendChild(fragment);
    }



    getLinkFormatPresetSummary(preset: LinkFormatPreset): string {
        return `链接类型: ${preset.linkFormat}, 路径类型: ${preset.pathFormat}`;
    }

    getConversionPresetSummary(preset: ConversionPreset): DocumentFragment {
        const fragment = document.createDocumentFragment();

        const addLine = (text: string) => {
            fragment.createEl("p", { text });
        };

        addLine(`格式: ${preset.outputFormat}`);

        if (preset.outputFormat !== "NONE") {
            // Only show quality for formats that use it (not AVIF - it uses CRF instead)
            if (preset.outputFormat !== "AVIF") {
                addLine(`质量: ${preset.quality}`);
            }
            if (preset.outputFormat === "PNG") {
                addLine(`色深: ${preset.colorDepth}`);
            }
            if (preset.outputFormat === "AVIF") {
                addLine(`FFmpeg CRF: ${preset.ffmpegCrf}`);
                addLine(`FFmpeg 预设: ${preset.ffmpegPreset}`);
            }

            addLine(`调整大小: ${preset.resizeMode}`);

            switch (preset.resizeMode) {
                case "Fit":
                case "Fill":
                    addLine(`(${preset.desiredWidth}x${preset.desiredHeight})`);
                    break;
                case "Width":
                    addLine(`(宽度: ${preset.desiredWidth})`);
                    break;
                case "Height":
                    addLine(`(高度: ${preset.desiredHeight})`);
                    break;
                case "LongestEdge":
                    addLine(`(最长边: ${preset.desiredLongestEdge})`);
                    break;
                case "ShortestEdge":
                    addLine(`(最短边: ${preset.desiredLongestEdge})`);
                    break;
                default: // "None"
                    break;
            }

            if (preset.resizeMode !== "None") {
                addLine(`放大/缩小: ${preset.enlargeOrReduce}`);
            }

            addLine(`允许更大的文件: ${preset.allowLargerFiles ? "是" : "否"}`);
        }

        if (preset.skipConversionPatterns) {
            addLine(`跳过模式: ${preset.skipConversionPatterns}`);
        }
        if (preset.revertToOriginalIfLarger) {
            addLine("如果更大则恢复原图: 是");
            if (preset.minimumCompressionSavingsInKB !== undefined) {
                addLine(`最小压缩节省量 (KB): ${preset.minimumCompressionSavingsInKB}`);
            }
        }

        return fragment;
    }

    addSkipPatternsSetting(
        containerEl: HTMLElement,
        preset: ConversionPreset | FilenamePreset,
        property: 'skipConversionPatterns' | 'skipRenamePatterns',
        title: string
    ): void {
        new Setting(containerEl)
            .setName(title)
            .setDesc(
                "逗号分隔的跳过模式列表（glob 或正则表达式）。正则表达式模式必须用 `/` 或 `r/` 或 `regex:` 包围。例如，不处理名称中包含 CAT 的图片：/CAT/"
            )
            .setTooltip(
                "支持多种模式类型：\n\n" +
                "1. Glob 模式：\n" +
                "   *.png, draft-*, test-?.jpg\n" +
                "   * = 任意字符\n" +
                "   ? = 单个字符\n\n" +
                "2. 正则表达式：\n" +
                "   /pattern/ 或 r/pattern/ 或 regex:pattern\n\n" +
                "示例：\n" +
                " *.png（所有 PNG 文件）\n" +
                " draft-*（以 draft- 开头的文件）\n" +
                " /^IMG_\\d{4}\\./ （IMG_ 后跟 4 位数字）\n" +
                " r/\\.(jpe?g|png)$/（以 .jpg/.jpeg/.png 结尾的文件）\n" +
                " regex:^(draft|temp)-（以 draft- 或 temp- 开头的文件）"
            )
            .addTextArea((text) => {
                const value = property === 'skipConversionPatterns'
                    ? (preset as ConversionPreset).skipConversionPatterns
                    : (preset as FilenamePreset).skipRenamePatterns;
                text
                    .setPlaceholder("例如 *.png, draft-*, /^IMG_\\d{4}\\./)")
                    .setValue(value)
                    .onChange(async (newValue) => {
                        const trimmedValue = newValue.trim() ? newValue : "";
                        if (property === 'skipConversionPatterns') {
                            (preset as ConversionPreset).skipConversionPatterns = trimmedValue;
                        } else {
                            (preset as FilenamePreset).skipRenamePatterns = trimmedValue;
                        }
                    });
                text.inputEl.setAttr('spellcheck', 'false');
            });
    }

    getResizePresetSummary(preset: NonDestructiveResizePreset): DocumentFragment {
        const fragment = document.createDocumentFragment();

        const addLine = (text: string) => {
            const paragraphEl = document.createElement("p");
            paragraphEl.textContent = text;
            fragment.appendChild(paragraphEl);
        };

        // Store values in variables before the switch statement
        const widthValue = `${preset.width}${preset.resizeUnits === "percentage" ? "%" : "px"}`;
        const heightValue = `${preset.height}${preset.resizeUnits === "percentage" ? "%" : "px"}`;
        const { customValue } = preset;
        const longestEdgeValue = `${preset.longestEdge}${preset.resizeUnits === "percentage" ? "%" : "px"}`;
        const shortestEdgeValue = `${preset.shortestEdge}${preset.resizeUnits === "percentage" ? "%" : "px"}`;
        const editorMaxWidthValue = `${preset.editorMaxWidthValue}${preset.resizeUnits === "percentage" ? "%" : "px"}`;
        const scaleModeValue = preset.resizeScaleMode;
        const respectEditorMaxWidthValue = preset.respectEditorMaxWidth ? "是" : "否";
        const maintainAspectRatioValue = preset.maintainAspectRatio ? "是" : "否";

        switch (preset.resizeDimension) {
            case "none":
                addLine("不调整大小");
                break;
            case "width":
                addLine(`宽度: ${widthValue}`);
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                addLine(`保持宽高比: ${maintainAspectRatioValue}`);
                break;
            case "height":
                addLine(`高度: ${heightValue}`);
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                addLine(`保持宽高比: ${maintainAspectRatioValue}`);
                break;
            case "both":
                addLine(`自定义: ${customValue}`);
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                addLine(`保持宽高比: ${maintainAspectRatioValue}`);
                break;
            case "longest-edge":
                addLine(`最长边: ${longestEdgeValue}`);
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                addLine(`保持宽高比: ${maintainAspectRatioValue}`);
                break;
            case "shortest-edge":
                addLine(`最短边: ${shortestEdgeValue}`);
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                addLine(`保持宽高比: ${maintainAspectRatioValue}`);
                break;
            case "original-width":
                addLine("原始宽度");
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                break;
            case "original-height":
                addLine("原始高度");
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                break;
            case "editor-max-width":
                addLine(`编辑器最大宽度: ${editorMaxWidthValue}`);
                addLine(`缩放模式: ${scaleModeValue}`);
                addLine(`遵循编辑器最大宽度: ${respectEditorMaxWidthValue}`);
                break;
        }

        return fragment;
    }

    renderResizePresetFormFields(formContainer: HTMLElement, preset: NonDestructiveResizePreset): void {
        // Resize Dimension (Dropdown)
        new Setting(formContainer)
            .setName("调整尺寸维度")
            .setDesc("选择如何调整图片大小")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        "none": "无",
                        "width": "宽度",
                        "height": "高度",
                        "both": "宽x高（自定义）",
                        ["longest-edge"]: "最长边",
                        ["shortest-edge"]: "最短边",
                        ["original-width"]: "应用原始图片宽度",
                        ["original-height"]: "应用原始图片高度",
                        ["editor-max-width"]: "适应编辑器最大宽度"
                    })
                    .setValue(preset.resizeDimension)
                    .onChange((value: ResizeDimension) => {
                        preset.resizeDimension = value;
                        this.updateResizePresetFormFields(formContainer, preset);
                    });
            });

        this.updateResizePresetFormFields(formContainer, preset);
    }

    updateResizePresetFormFields(
        formContainer: HTMLElement,
        preset: NonDestructiveResizePreset
    ): void {
        // Remove existing settings (except Resize Dimension)
        formContainer
            .querySelectorAll(
                ".image-converter-resize-width-setting, .image-converter-resize-height-setting, .image-converter-resize-custom-setting, .image-converter-resize-scale-mode-setting, .image-converter-resize-respect-width-setting, .image-converter-resize-units-setting, .image-converter-maintain-aspect-ratio-setting, .image-converter-resize-longest-edge-setting, .image-converter-resize-shortest-edge-setting, .image-converter-resize-editor-max-width-value-setting"
            )
            .forEach((el) => el.remove());

        // Find the Save/Cancel buttons
        const buttonContainer = formContainer.querySelector(
            ".image-converter-form-buttons"
        );

        // Helper function to add input settings
        const addInputSetting = (
            name: string,
            classname: string,
            value: number | undefined,
            onChange: (value: string) => void,
            addUnits = false
        ) => {
            const newSetting = new Setting(formContainer)
                .setName(name)
                .setClass(classname)
                .addText((text) => {
                    text.setValue(value?.toString() || "")
                        .onChange(onChange);

                    // Set placeholder using text component
                    text.setPlaceholder(
                        preset.resizeUnits === "percentage"
                            ? `${name} (%)`
                            : `${name} (px)`
                    );
                });

            // Add units dropdown next to input field if required
            if (addUnits) {
                newSetting.addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            pixels: "px",
                            percentage: "%",
                        })
                        .setValue(preset.resizeUnits)
                        .onChange((value: ResizeUnits) => {
                            preset.resizeUnits = value;
                            // Update placeholder
                            const textComponent = newSetting.components[0] as TextComponent;
                            textComponent.setPlaceholder(
                                value === "percentage" ? `${name} (%)` : `${name} (px)`
                            );
                        });
                    dropdown.selectEl.addClass("image-converter-resize-units-dropdown");
                });
            }

            if (buttonContainer) {
                formContainer.insertBefore(
                    newSetting.settingEl,
                    buttonContainer
                );
            }
            return newSetting;
        };

        // Add settings based on selection
        let customValueSetting: Setting | undefined;
        let editorMaxWidthValueSetting: Setting | undefined;

        switch (preset.resizeDimension) {
            case "width":
                addInputSetting(
                    "Width",
                    "image-converter-resize-width-setting",
                    preset.width,
                    (value) => {
                        const parsedValue = parseFloat(value);
                        preset.width = isNaN(parsedValue)
                            ? undefined
                            : parsedValue;
                    },
                    true // Add units dropdown
                )
                    .setDesc("设置新的自定义宽度"); // Add description here
                break;
            case "height":
                addInputSetting(
                    "Height",
                    "image-converter-resize-height-setting",
                    preset.height,
                    (value) => {
                        const parsedValue = parseFloat(value);
                        preset.height = isNaN(parsedValue)
                            ? undefined
                            : parsedValue;
                    },
                    true // Add units dropdown
                )
                    .setDesc("设置新的自定义高度"); // Add description here
                break;
            case "longest-edge":
                addInputSetting(
                    "Longest edge",
                    "image-converter-resize-longest-edge-setting",
                    preset.longestEdge,
                    (value) => {
                        const parsedValue = parseFloat(value);
                        preset.longestEdge = isNaN(parsedValue)
                            ? undefined
                            : parsedValue;
                    },
                    true // Add units dropdown
                )
                    .setDesc("插件自动读取原始图片尺寸，将提供的值应用于宽度或高度中较长的一边。如果启用了'保持宽高比'，则另一个尺寸会自动计算。"); // Add description here
                break;
            case "shortest-edge":
                addInputSetting(
                    "Shortest edge",
                    "image-converter-resize-shortest-edge-setting",
                    preset.shortestEdge,
                    (value) => {
                        const parsedValue = parseFloat(value);
                        preset.shortestEdge = isNaN(parsedValue)
                            ? undefined
                            : parsedValue;
                    },
                    true // Add units dropdown
                )
                    .setDesc("插件自动读取原始图片尺寸，将提供的值应用于宽度或高度中较短的一边。如果启用了'保持宽高比'，则另一个尺寸会自动计算。"); // Add description here
                break;
            case "both":
                customValueSetting = new Setting(formContainer)
                    .setName("自定义值")
                    .setClass("image-converter-resize-custom-setting")
                    .addText((text) => {
                        text.setValue(preset.customValue || "")
                            .onChange((value) => {
                                // Basic validation for custom value format
                                if (
                                    /^\|?\d*(?:\.\d+)?(?:x\d*(?:\.\d+)?)?%?$/.test(
                                        value
                                    ) ||
                                    (preset.resizeUnits === "percentage" &&
                                        /^\d*(?:\.\d+)?x\d*(?:\.\d+)?%$/.test(
                                            value
                                        ))
                                ) {
                                    preset.customValue = value;
                                } else {
                                    new Notice(
                                        "自定义值格式无效。请使用 |宽x高 或百分比格式（例如 50x75%）。"
                                    );
                                }
                            });
                        // Set placeholder for customValueSetting correctly
                        text.setPlaceholder(
                            preset.resizeUnits === "percentage"
                                ? "e.g. 50x75"
                                : "widthxheight"
                        );
                    })
                    .setDesc("使用 |宽x高 格式同时设置宽度和高度（例如 300x200）或百分比格式（例如 50x75）。不保持宽高比。");
                if (buttonContainer) {
                    formContainer.insertBefore(
                        customValueSetting.settingEl,
                        buttonContainer
                    );
                }
                break;
            case "editor-max-width":
                editorMaxWidthValueSetting = new Setting(formContainer)
                    .setName("最大宽度值")
                    .setClass(
                        "image-converter-resize-editor-max-width-value-setting"
                    )
                    .addText((text) => {
                        text.setValue(
                            preset.editorMaxWidthValue?.toString() || ""
                        )
                            .onChange((value) => {
                                const parsedValue = parseFloat(value);
                                preset.editorMaxWidthValue = isNaN(parsedValue)
                                    ? undefined
                                    : parsedValue;
                            });
                        // Set placeholder based on selected units
                        text.setPlaceholder(
                            preset.resizeUnits === "percentage"
                                ? "e.g. 50%"
                                : "e.g. 200px"
                        );
                    })
                    .addDropdown((dropdown) => {
                        dropdown
                            .addOptions({
                                pixels: "px",
                                percentage: "%",
                            })
                            .setValue(preset.resizeUnits)
                            .onChange((value: ResizeUnits) => {
                                preset.resizeUnits = value;
                                // Update placeholder (using optional chaining)
                                (editorMaxWidthValueSetting?.components[0] as TextComponent)?.setPlaceholder(
                                    value === "percentage"
                                        ? "e.g. 50%"
                                        : "e.g. 200px"
                                );
                            });
                        dropdown.selectEl.addClass(
                            "image-converter-resize-units-dropdown"
                        );
                    })
                    .setDesc("设置图片的最大宽度以适应编辑器宽度。可以指定百分比或固定像素值。");
                if (buttonContainer) {
                    formContainer.insertBefore(
                        editorMaxWidthValueSetting.settingEl,
                        buttonContainer
                    );
                }
                break;
        }

        // Add Maintain Aspect Ratio toggle (only when resizeDimension is not "none" or "both")
        let aspectToggle: Setting | undefined = undefined;
        if (
            preset.resizeDimension !== "none" &&
            preset.resizeDimension !== "both"
        ) {
            aspectToggle = new Setting(formContainer)
                .setName("保持宽高比")
                .setClass("image-converter-maintain-aspect-ratio-setting")
                .setDesc(
                    "调整大小时保持图片的原始比例。"
                )
                .addToggle((toggle) => {
                    toggle
                        .setValue(preset.maintainAspectRatio)
                        .onChange((value) => {
                            preset.maintainAspectRatio = value;
                        });
                });

            if (buttonContainer) {
                formContainer.insertBefore(
                    aspectToggle.settingEl,
                    buttonContainer
                );
            }
        }

        // Hide aspect ratio toggle for specific resize dimensions
        if (
            preset.resizeDimension === "original-width" ||
            preset.resizeDimension === "original-height" ||
            preset.resizeDimension === "editor-max-width"
        ) {
            aspectToggle?.settingEl.hide();
        } else {
            aspectToggle?.settingEl.show(); // Make sure to show it otherwise
        }

        // Hide settings if not selected
        if (preset.resizeDimension !== "editor-max-width") {
            editorMaxWidthValueSetting?.settingEl.hide();
        }

        // Scale Mode Setting (only when resizeDimension is not "none", "original-width", "original-height", or "editor-max-width")
        if (
            preset.resizeDimension !== "none" &&
            preset.resizeDimension !== "original-width" &&
            preset.resizeDimension !== "original-height" &&
            preset.resizeDimension !== "editor-max-width"
        ) {
            const scaleModeSetting = new Setting(formContainer)
                .setName("缩放模式")
                .setClass("image-converter-resize-scale-mode-setting")
                .setDesc(
                    // eslint-disable-next-line obsidianmd/ui/sentence-case -- Technical description with list
                    "控制图片相对于目标尺寸的调整方式：\n- 自动：调整图片以适应指定尺寸\n- 仅缩小：仅缩小大于目标的图片\n- 仅放大：仅放大小于目标的图片"
                )
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            auto: "自动",
                            reduce: "仅缩小",
                            enlarge: "仅放大",
                        })
                        .setValue(preset.resizeScaleMode)
                        .onChange((value: ResizeScaleMode) => {
                            preset.resizeScaleMode = value;
                        });
                });

            if (buttonContainer) {
                formContainer.insertBefore(
                    scaleModeSetting.settingEl,
                    buttonContainer
                );
            }
        }

        // Respect Editor Max Width Toggle (not applicable for "editor-max-width")
        if (preset.resizeDimension !== "editor-max-width" && preset.resizeDimension !== "none") {
            const respectWidthToggle = new Setting(formContainer)
                .setName("遵循编辑器最大宽度")
                .setClass("image-converter-resize-respect-width-setting")
                .setDesc(
                    "计算尺寸时，防止图片超过编辑器的宽度。"
                )
                .addToggle((toggle) => {
                    toggle
                        .setValue(preset.respectEditorMaxWidth)
                        .onChange((value) => {
                            preset.respectEditorMaxWidth = value;
                        });
                });

            if (buttonContainer) {
                formContainer.insertBefore(
                    respectWidthToggle.settingEl,
                    buttonContainer
                );
            }
        }
    }

    private getSelectedPresetName(activePresetSetting: ActivePresetSetting): string | undefined {
        switch (activePresetSetting) {
            case "selectedFolderPreset":
                return this.plugin.settings.selectedFolderPreset;
            case "selectedFilenamePreset":
                return this.plugin.settings.selectedFilenamePreset;
            case "selectedConversionPreset":
                return this.plugin.settings.selectedConversionPreset;
            case "selectedLinkFormatPreset":
                return this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset;
            case "selectedResizePreset":
                return this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset;
            default:
                return undefined;
        }
    }

    private addSaveButton<
        T extends
        | FolderPreset
        | FilenamePreset
        | ConversionPreset
        | LinkFormatPreset
        | NonDestructiveResizePreset
    >(
        buttonContainer: HTMLElement,
        preset: T,
        isNew: boolean,
        activePresetSetting: ActivePresetSetting,
        uiState: PresetCategoryUIState<T>
    ): void {
        new ButtonComponent(buttonContainer)
            .setButtonText(isNew ? "添加" : "保存")
            .setCta()
            .onClick(async () => {
                if (!preset.name) {
                    new Notice("预设名称不能为空。");
                    return;
                }

                // Check for duplicate names
                if (
                    !this.isDefaultPreset(preset, activePresetSetting) &&
                    (
                        (activePresetSetting === "selectedFolderPreset" &&
                            this.plugin.settings.folderPresets.some(
                                (presetItem) => presetItem.name === preset.name && presetItem !== preset
                            )) ||
                        (activePresetSetting === "selectedFilenamePreset" &&
                            this.plugin.settings.filenamePresets.some(
                                (presetItem) => presetItem.name === preset.name && presetItem !== preset
                            )) ||
                        (activePresetSetting === "selectedConversionPreset" &&
                            this.plugin.settings.conversionPresets.some(
                                (presetItem) => presetItem.name === preset.name && presetItem !== preset
                            )) ||
                        (activePresetSetting === "selectedLinkFormatPreset" &&
                            this.plugin.settings.linkFormatSettings.linkFormatPresets.some(
                                (presetItem) => presetItem.name === preset.name && presetItem !== preset
                            )) ||
                        (activePresetSetting === "selectedResizePreset" && // Add this check
                            this.plugin.settings.nonDestructiveResizeSettings.resizePresets.some(
                                (presetItem) => presetItem.name === preset.name && presetItem !== preset
                            ))
                    )
                ) {
                    new Notice("已存在同名预设。");
                    return;
                }

                if (isNew) {
                    if (activePresetSetting === "selectedFolderPreset") {
                        this.plugin.settings.folderPresets.push(preset as FolderPreset);
                    } else if (activePresetSetting === "selectedFilenamePreset") {
                        this.plugin.settings.filenamePresets.push(preset as FilenamePreset);
                    } else if (activePresetSetting === "selectedConversionPreset") {
                        this.plugin.settings.conversionPresets.push(preset as ConversionPreset);
                    } else if (activePresetSetting === "selectedLinkFormatPreset") {
                        this.plugin.settings.linkFormatSettings.linkFormatPresets.push(preset as LinkFormatPreset);
                    } else if (activePresetSetting === "selectedResizePreset") { // Add this case
                        this.plugin.settings.nonDestructiveResizeSettings.resizePresets.push(preset as NonDestructiveResizePreset);
                    }
                } else {
                    // Update existing preset (handled by reference)
                }

                await this.plugin.saveSettings();

                // Reset UI state
                uiState.editingPreset = null;
                uiState.newPreset = null;
                this.editingPresetKey = null;

                this.display();
            });
    }

    private addCancelButton<T extends FolderPreset | FilenamePreset | ConversionPreset | LinkFormatPreset | NonDestructiveResizePreset>(
        buttonContainer: HTMLElement,
        uiState: PresetCategoryUIState<T>,
        isNew: boolean
    ): void {
        new ButtonComponent(buttonContainer)
            .setButtonText("取消")
            .onClick(() => {
                uiState.editingPreset = null;
                uiState.newPreset = null;

                // Reset the expanded state
                this.editingPresetKey = null;

                // Hide the form container by removing the 'visible' class - visbility and opacity
                this.formContainer.removeClass("visible");

                this.display();
            });
    }


    onClose() {
        // Reset the form state when settings are closed
        if (this.formContainer) {
            this.formContainer.removeClass("visible"); // Hide the form
            this.formContainer.empty(); // Clear any form content
        }

        // Reset UI state
        this.editingPresetKey = null;
        this.presetUIState = {
            folder: { editingPreset: null, newPreset: null },
            filename: { editingPreset: null, newPreset: null },
            conversion: { editingPreset: null, newPreset: null },
            linkformat: { editingPreset: null, newPreset: null },
            resize: { editingPreset: null, newPreset: null },
            globalPresetVisible: true,
            imageAlignmentSectionCollapsed: false,
            imageDragResizeSectionCollapsed: false,
            imageCaptionSectionCollapsed: false // ADDED: Reset caption section collapse state
        };
    }
}



export class ConfirmDialog extends Modal {
    message: string | DocumentFragment;
    confirmText: string;
    callback: () => void;

    constructor(
        app: App,
        title: string,
        message: string | DocumentFragment,
        confirmText: string,
        callback: () => void
    ) {
        super(app);
        this.titleEl.setText(title); // Set the title text
        this.message = message;
        this.confirmText = confirmText;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;

        // Check if the message is a string or a DocumentFragment
        if (typeof this.message === 'string') {
            contentEl.setText(this.message);
        } else {
            contentEl.empty();
            contentEl.appendChild(this.message);
        }

        // Create a container for buttons
        const buttonContainer = contentEl.createDiv(
            "image-converter-confirm-modal-buttons"
        );

        // Add a Cancel button
        new ButtonComponent(buttonContainer)
            .setButtonText("取消")
            .onClick(() => this.close());

        // Add a Confirm button with danger styling
        new ButtonComponent(buttonContainer)
            .setButtonText(this.confirmText)
            .setCta()
            .onClick(() => {
                this.close();
                this.callback();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class SaveGlobalPresetModal extends Modal {
    plugin: ImageConverterPlugin;
    callback: (presetName: string) => void;
    presetName = "";

    constructor(app: App, plugin: ImageConverterPlugin, callback: (presetName: string) => void) {
        super(app);
        this.plugin = plugin;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "保存全局预设" });

        // Preset Name Input
        new Setting(contentEl)
            .setName("预设名称")
            .addText((text) => {
                text.setPlaceholder("输入预设名称")
                    .setValue(this.presetName)
                    .onChange((value) => {
                        this.presetName = value;
                    });
            });

        // Preset Summary
        const summaryEl = contentEl.createEl("div", { cls: "image-converter-preset-summary" });
        this.updateSummary(summaryEl);

        // --- Buttons ---
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("保存")
                    .setCta()
                    .onClick(() => {
                        if (this.presetName) {
                            this.callback(this.presetName);
                            this.close();
                        } else {
                            new Notice("请输入预设名称。");
                        }
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText("取消")
                    .onClick(() => {
                        this.close();
                    })
            );

    }

    updateSummary(summaryEl: HTMLElement) {
        summaryEl.empty();
        summaryEl.createEl("h4", { text: "摘要" });

        const folderPreset = this.plugin.settings.folderPresets.find(
            (presetItem) => presetItem.name === this.plugin.settings.selectedFolderPreset
        );
        const filenamePreset = this.plugin.settings.filenamePresets.find(
            (presetItem) => presetItem.name === this.plugin.settings.selectedFilenamePreset
        );
        const conversionPreset = this.plugin.settings.conversionPresets.find(
            (presetItem) => presetItem.name === this.plugin.settings.selectedConversionPreset
        );
        const linkFormatPreset = this.plugin.settings.linkFormatSettings.linkFormatPresets.find(
            (presetItem) => presetItem.name === this.plugin.settings.linkFormatSettings.selectedLinkFormatPreset
        );
        const resizePreset = this.plugin.settings.nonDestructiveResizeSettings.resizePresets.find(
            (presetItem) => presetItem.name === this.plugin.settings.nonDestructiveResizeSettings.selectedResizePreset
        );

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();

        // Helper function to create a section title
        const createSectionTitle = (title: string) => {
            const titleEl = document.createElement("div");
            titleEl.classList.add("summary-section-title");
            titleEl.textContent = title;
            return titleEl;
        };

        // Helper function to create a summary item
        const createSummaryItem = (label: string, value: string | undefined | number | boolean, boldValue = false) => {
            const itemEl = document.createElement("div");
            itemEl.classList.add("summary-item");
            itemEl.createEl("span", { text: `${label}: `, cls: "summary-label" });
            itemEl.createEl("span", {
                text: value !== undefined && value !== null ? value.toString() : "None",
                cls: boldValue ? "summary-value-bold" : "summary-value",
            });
            return itemEl;
        };

        // Function to add a preset summary section
        const addPresetSummary = (presetType: string, preset: FolderPreset | FilenamePreset | ConversionPreset | LinkFormatPreset | NonDestructiveResizePreset | undefined) => {
            if (preset) {
                const sectionEl = document.createElement("div");
                sectionEl.classList.add("summary-section");
                sectionEl.appendChild(createSectionTitle(`${presetType}预设: ${preset.name}`));

                switch (presetType) {
                    case "文件夹": {
                        const folderP = preset as FolderPreset;
                        sectionEl.appendChild(createSummaryItem("类型", folderP.type));
                        if (folderP.type === "SUBFOLDER") {
                            sectionEl.appendChild(createSummaryItem("子文件夹模板", this.plugin.settings.subfolderTemplate));
                        } else if (folderP.type === "CUSTOM") {
                            sectionEl.appendChild(createSummaryItem("自定义模板", folderP.customTemplate));
                        }
                        break;
                    }
                    case "文件名": {
                        const filenameP = preset as FilenamePreset;
                        sectionEl.appendChild(createSummaryItem("模板", filenameP.customTemplate));
                        break;
                    }
                    case "转换": {
                        const conversionP = preset as ConversionPreset;
                        sectionEl.appendChild(createSummaryItem("输出格式", conversionP.outputFormat));
                        if (conversionP.outputFormat !== "NONE") {
                            sectionEl.appendChild(createSummaryItem("质量", conversionP.quality));
                            if (conversionP.outputFormat === "PNG") {
                                sectionEl.appendChild(createSummaryItem("色彩深度", conversionP.colorDepth));
                            }
                            sectionEl.appendChild(createSummaryItem("调整大小模式", conversionP.resizeMode));
                            switch (conversionP.resizeMode) {
                                case "Fit":
                                case "Fill":
                                    sectionEl.appendChild(createSummaryItem("尺寸", `${conversionP.desiredWidth}x${conversionP.desiredHeight}`));
                                    break;
                                case "Width":
                                    sectionEl.appendChild(createSummaryItem("宽度", conversionP.desiredWidth));
                                    break;
                                case "Height":
                                    sectionEl.appendChild(createSummaryItem("高度", conversionP.desiredHeight));
                                    break;
                                case "LongestEdge":
                                case "ShortestEdge":
                                    sectionEl.appendChild(createSummaryItem("边长", conversionP.desiredLongestEdge));
                                    break;
                            }
                            if (conversionP.resizeMode !== "None") {
                                sectionEl.appendChild(createSummaryItem("缩放", conversionP.enlargeOrReduce));
                            }
                            sectionEl.appendChild(createSummaryItem("允许更大的文件", conversionP.allowLargerFiles ? "是" : "否"));
                            if (conversionP.revertToOriginalIfLarger) {
                                sectionEl.appendChild(createSummaryItem("如果更大则恢复原图", "是"));
                                sectionEl.appendChild(createSummaryItem("最小压缩节省量 (KB)", conversionP.minimumCompressionSavingsInKB));
                            }
                            sectionEl.appendChild(createSummaryItem("跳过模式", conversionP.skipConversionPatterns));
                        }
                        break;
                    }
                    case "链接格式": {
                        const linkP = preset as LinkFormatPreset;
                        sectionEl.appendChild(createSummaryItem("链接类型", linkP.linkFormat));
                        sectionEl.appendChild(createSummaryItem("路径格式", linkP.pathFormat));
                        break;
                    }
                    case "调整大小":
                        if (resizePreset) { // Add this check here
                            let resizeDimensionSummary = "";
                            switch (resizePreset.resizeDimension) {
                                case "width":
                                    resizeDimensionSummary = `宽度: ${resizePreset.width}${resizePreset.resizeUnits === "percentage" ? "%" : "px"}`;
                                    break;
                                case "height":
                                    resizeDimensionSummary = `高度: ${resizePreset.height}${resizePreset.resizeUnits === "percentage" ? "%" : "px"}`;
                                    break;
                                case "both":
                                    resizeDimensionSummary = `自定义: ${resizePreset.customValue}`;
                                    break;
                                case "longest-edge":
                                    resizeDimensionSummary = `最长边: ${resizePreset.longestEdge}${resizePreset.resizeUnits === "percentage" ? "%" : "px"}`;
                                    break;
                                case "shortest-edge":
                                    resizeDimensionSummary = `最短边: ${resizePreset.shortestEdge}${resizePreset.resizeUnits === "percentage" ? "%" : "px"}`;
                                    break;
                                case "original-width":
                                    resizeDimensionSummary = "原始宽度";
                                    break;
                                case "original-height":
                                    resizeDimensionSummary = "原始高度";
                                    break;
                                case "editor-max-width":
                                    resizeDimensionSummary = `编辑器最大宽度: ${resizePreset.editorMaxWidthValue}${resizePreset.resizeUnits === "percentage" ? "%" : "px"}`;
                                    break;
                                case "none":
                                    resizeDimensionSummary = "不调整大小";
                                    break;
                            }
                            sectionEl.appendChild(createSummaryItem("尺寸", resizeDimensionSummary));

                            // Add scale mode, respect editor max width, and maintain aspect ratio
                            if (resizePreset.resizeDimension !== "none") {
                                sectionEl.appendChild(createSummaryItem("缩放模式", resizePreset.resizeScaleMode));
                                sectionEl.appendChild(createSummaryItem("遵循编辑器最大宽度", resizePreset.respectEditorMaxWidth ? "是" : "否"));
                                if (resizePreset.resizeDimension !== "original-width" && resizePreset.resizeDimension !== "original-height" && resizePreset.resizeDimension !== "editor-max-width") {
                                    sectionEl.appendChild(createSummaryItem("保持宽高比", resizePreset.maintainAspectRatio ? "是" : "否"));
                                }
                            }
                        } // end of if (resizePreset) check
                        break;
                }

                fragment.appendChild(sectionEl);
            }
        };

        addPresetSummary("文件夹", folderPreset);
        addPresetSummary("文件名", filenamePreset);
        addPresetSummary("转换", conversionPreset);
        addPresetSummary("链接格式", linkFormatPreset);
        addPresetSummary("调整大小", resizePreset);

        // Append the fragment to the summary container
        summaryEl.appendChild(fragment);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class AvailableVariablesModal extends Modal {
    private variableProcessor: VariableProcessor;
    private modalClass = "image-converter-available-variables-modal";
    private searchInput: HTMLInputElement;
    private categorizedVariables: Record<string, { name: string; description: string; example: string }[]>;
    private contentContainer: HTMLElement;

    constructor(app: App, variableProcessor: VariableProcessor) {
        super(app);
        this.variableProcessor = variableProcessor;
    }

    onOpen() {
        this.modalEl.addClass(this.modalClass); // Add class to modal container
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Available variables" });

        // Create search container
        const searchContainer = contentEl.createEl("div", { cls: "variable-search-container" });
        
        // Create search input
        this.searchInput = searchContainer.createEl("input", {
            type: "text",
            placeholder: "Search variables...",
            cls: "variable-search-input"
        });

        // Add search icon (optional visual enhancement)
        searchContainer.createEl("span", { 
            text: "🔍", 
            cls: "variable-search-icon" 
        });

        // Create content container for the variables
        this.contentContainer = contentEl.createEl("div", { cls: "variable-content-container" });

        // Get categorized variables once
        this.categorizedVariables = this.variableProcessor.getCategorizedVariables();

        // Initial render
        this.renderVariables();

        // Add search functionality
        this.searchInput.addEventListener("input", () => {
            this.handleSearch();
        });

        // Focus on search input
        this.searchInput.focus();
    }

    private renderVariables(searchTerm = "") {
        this.contentContainer.empty();

        for (const [category, variables] of Object.entries(this.categorizedVariables)) {
            // Filter variables based on search term
            const filteredVariables = variables.filter(variable => {
                if (!searchTerm) return true;
                
                const searchLower = searchTerm.toLowerCase();
                return (
                    variable.name.toLowerCase().includes(searchLower) ||
                    variable.description.toLowerCase().includes(searchLower) ||
                    variable.example.toLowerCase().includes(searchLower)
                );
            });

            // Only show category if it has matching variables
            if (filteredVariables.length > 0) {
                const categoryEl = this.contentContainer.createEl("div", { cls: "variable-category" });
                categoryEl.createEl("h4", { text: category, cls: "variable-category-title" });
                
                const table = categoryEl.createEl("table", { cls: "variable-table" });
                
                // Add table header
                const thead = table.createEl("thead");
                const headerRow = thead.createEl("tr");
                headerRow.createEl("th", { text: "Variable" });
                headerRow.createEl("th", { text: "Description" });
                headerRow.createEl("th", { text: "Example" });
                
                const tbody = table.createTBody();
                
                for (const variable of filteredVariables) {
                    const row = tbody.createEl("tr", { cls: "variable-row" });
                    
                    // Highlight search term in the content
                    const nameCell = row.createEl("td", { cls: "variable-name" });
                    // eslint-disable-next-line @microsoft/sdl/no-inner-html -- Safe: content from variableProcessor with escaped search term
                    nameCell.innerHTML = this.highlightSearchTerm(variable.name, searchTerm);
                    
                    const descCell = row.createEl("td", { cls: "variable-description" });
                    // eslint-disable-next-line @microsoft/sdl/no-inner-html -- Safe: content from variableProcessor with escaped search term
                    descCell.innerHTML = this.highlightSearchTerm(variable.description, searchTerm);
                    const exampleCell = row.createEl("td", { cls: "variable-example" });
                    // eslint-disable-next-line @microsoft/sdl/no-inner-html -- Safe: content from variableProcessor with escaped search term
                    exampleCell.innerHTML = this.highlightSearchTerm(variable.example, searchTerm);
                    // Add click handler to copy variable name
                    nameCell.addEventListener("click", () => {
                        void (async () => {
                            try {
                                await navigator.clipboard.writeText(variable.name);
                                
                                // Visual feedback - add CSS class for copy success
                                nameCell.classList.add("variable-name-copied");
                                
                                // Show "Copied!" text temporarily
                                const originalText = nameCell.textContent;
                                nameCell.textContent = "Copied!";
                                
                                setTimeout(() => {
                                    nameCell.classList.remove("variable-name-copied");
                                    nameCell.textContent = originalText;
                                }, 800);
                            } catch (err) {
                                console.error("Failed to copy to clipboard:", err);
                                // Fallback visual indication for copy failure
                                nameCell.classList.add("variable-name-copy-error");
                                setTimeout(() => {
                                    nameCell.classList.remove("variable-name-copy-error");
                                }, 500);
                            }
                        })();
                    });
                    nameCell.title = "点击复制变量名";
                }
            }
        }

        // Show "no results" message if no variables match
        if (searchTerm && this.contentContainer.children.length === 0) {
            this.contentContainer.createEl("div", { 
                cls: "variable-no-results",
                text: `未找到匹配「${searchTerm}」的变量`
            });
        }
    }

    private highlightSearchTerm(text: string, searchTerm: string): string {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    private handleSearch() {
        const searchTerm = this.searchInput.value.trim();
        this.renderVariables(searchTerm);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.modalEl.removeClass(this.modalClass); // Remove class on close
    }
}
