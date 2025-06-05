import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { CanvasState, ComponentInstance } from '../types';

export class CollaborationProvider {
  private doc: Y.Doc;
  private provider: WebrtcProvider;
  private persistence: IndexeddbPersistence;
  private awareness: any;
  private componentsMap: Y.Map<ComponentInstance>;
  private stateMap: Y.Map<any>;

  constructor(roomId: string, userId: string, userName: string) {
    this.doc = new Y.Doc();
    
    // Initialize Yjs maps
    this.componentsMap = this.doc.getMap('components');
    this.stateMap = this.doc.getMap('state');
    
    // WebRTC provider for real-time collaboration
    this.provider = new WebrtcProvider(roomId, this.doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
        'wss://y-webrtc-signaling-us.herokuapp.com',
      ],
    });
    
    // Local persistence
    this.persistence = new IndexeddbPersistence(roomId, this.doc);
    
    // Awareness for cursor positions
    this.awareness = this.provider.awareness;
    this.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: this.generateUserColor(userId),
    });
  }

  // Subscribe to component changes
  onComponentsChange(callback: (components: Record<string, ComponentInstance>) => void) {
    this.componentsMap.observe(() => {
      const components: Record<string, ComponentInstance> = {};
      this.componentsMap.forEach((value, key) => {
        components[key] = value;
      });
      callback(components);
    });
  }

  // Subscribe to state changes
  onStateChange(callback: (state: Partial<CanvasState>) => void) {
    this.stateMap.observe(() => {
      const state: any = {};
      this.stateMap.forEach((value, key) => {
        state[key] = value;
      });
      callback(state);
    });
  }

  // Subscribe to awareness changes (cursor positions, selections)
  onAwarenessChange(callback: (states: Map<number, any>) => void) {
    this.awareness.on('change', () => {
      callback(this.awareness.getStates());
    });
  }

  // Update a component
  updateComponent(id: string, component: ComponentInstance) {
    this.doc.transact(() => {
      this.componentsMap.set(id, component);
    });
  }

  // Remove a component
  removeComponent(id: string) {
    this.doc.transact(() => {
      this.componentsMap.delete(id);
    });
  }

  // Update canvas state
  updateState(key: string, value: any) {
    this.doc.transact(() => {
      this.stateMap.set(key, value);
    });
  }

  // Update local cursor position
  updateCursorPosition(position: { x: number; y: number }) {
    this.awareness.setLocalStateField('cursor', position);
  }

  // Update local selection
  updateSelection(selectedIds: string[]) {
    this.awareness.setLocalStateField('selection', selectedIds);
  }

  // Get all cursors
  getCursors(): Map<number, any> {
    return this.awareness.getStates();
  }

  // Disconnect and cleanup
  destroy() {
    this.provider.destroy();
    this.persistence.destroy();
    this.doc.destroy();
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#FFA07A', // Light Salmon
      '#98D8C8', // Mint
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
      '#85C1F2', // Light Blue
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}