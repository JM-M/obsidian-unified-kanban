import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import {
  VIEW_TYPE_UNIFIED_KANBAN,
  UnifiedKanbanView,
} from './UnifiedKanbanView';
import { KanbanStore } from './store';
import { PluginSettings, DEFAULT_SETTINGS } from './types';

export default class UnifiedKanbanPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  store!: KanbanStore;

  async onload() {
    await this.loadSettings();

    this.store = new KanbanStore(this.app, this.settings);

    // Register view
    this.registerView(
      VIEW_TYPE_UNIFIED_KANBAN,
      (leaf) =>
        new UnifiedKanbanView(leaf, this.store, this.settings, async (settings) => {
          this.settings = settings;
          await this.saveData(settings);
        })
    );

    // Ribbon icon
    this.addRibbonIcon('layout-dashboard', 'Unified Kanban', () => {
      this.openView();
    });

    // Command
    this.addCommand({
      id: 'open-unified-kanban',
      name: 'Open Unified Kanban Board',
      callback: () => this.openView(),
    });

    // File watcher — two-way binding
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile) {
          this.store.onFileModified(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        if (file instanceof TFile) {
          this.store.onFileDeleted(file);
        }
      })
    );

    // Initialize store once layout is ready (vault is fully loaded)
    this.app.workspace.onLayoutReady(async () => {
      await this.store.initialize();
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_UNIFIED_KANBAN);
  }

  async openView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_UNIFIED_KANBAN);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE_UNIFIED_KANBAN, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.store.updateSettings(this.settings);

    // Refresh any open views
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_UNIFIED_KANBAN)
      .forEach((leaf) => {
        if (leaf.view instanceof UnifiedKanbanView) {
          (leaf.view as UnifiedKanbanView).refreshSettings(this.settings);
        }
      });
  }
}
