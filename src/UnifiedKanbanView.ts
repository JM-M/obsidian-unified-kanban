import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App as KanbanApp } from './components/App';
import { KanbanStore } from './store';
import { PluginSettings } from './types';

export const VIEW_TYPE_UNIFIED_KANBAN = 'unified-kanban';

export class UnifiedKanbanView extends ItemView {
  private root: Root | null = null;
  private store: KanbanStore;
  private settings: PluginSettings;
  private onSaveSettings: (settings: PluginSettings) => Promise<void>;

  constructor(
    leaf: WorkspaceLeaf,
    store: KanbanStore,
    settings: PluginSettings,
    onSaveSettings: (settings: PluginSettings) => Promise<void>
  ) {
    super(leaf);
    this.store = store;
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
  }

  getViewType(): string {
    return VIEW_TYPE_UNIFIED_KANBAN;
  }

  getDisplayText(): string {
    return 'Unified Kanban';
  }

  getIcon(): string {
    return 'layout-dashboard';
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass('uk-view-root');
    this.root = createRoot(this.contentEl);
    this.render();
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  private handleSettingsChange = (settings: PluginSettings): void => {
    this.settings = settings;
    this.store.updateSettings(settings);
    this.onSaveSettings(settings);
    this.render();
  };

  private render(): void {
    if (!this.root) return;
    this.root.render(
      React.createElement(KanbanApp, {
        store: this.store,
        settings: this.settings,
        onSettingsChange: this.handleSettingsChange,
      })
    );
  }

  /** Called by the plugin when settings change */
  refreshSettings(settings: PluginSettings): void {
    this.settings = settings;
    this.render();
  }
}
