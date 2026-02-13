import { create } from 'zustand';
import type { AppState, ZoneNode, AirflowLink, TopologyJson } from '../types';

export const useAppStore = create<AppState>((set, get) => ({
  // Model data
  nodes: [],
  links: [],
  ambientTemperature: 283.15,
  ambientPressure: 0.0,
  windSpeed: 0.0,
  windDirection: 0.0,

  // UI state
  selectedNodeId: null,
  selectedLinkId: null,
  toolMode: 'select',
  nextId: 1,

  // Simulation
  result: null,
  isRunning: false,
  error: null,

  // Actions
  addNode: (partial) => set((state) => {
    const id = state.nextId;
    const node: ZoneNode = {
      id,
      name: partial.name || `房间 ${id}`,
      type: partial.type || 'normal',
      temperature: partial.temperature ?? 293.15,
      elevation: partial.elevation ?? 0.0,
      volume: partial.volume ?? 50.0,
      pressure: partial.pressure ?? 0.0,
      x: partial.x ?? 100,
      y: partial.y ?? 100,
      width: partial.width ?? 120,
      height: partial.height ?? 80,
    };
    return { nodes: [...state.nodes, node], nextId: id + 1, selectedNodeId: id, selectedLinkId: null };
  }),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  })),

  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id),
    links: state.links.filter((l) => l.from !== id && l.to !== id),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
  })),

  addLink: (partial) => set((state) => {
    const id = state.nextId;
    const link: AirflowLink = {
      id,
      from: partial.from!,
      to: partial.to!,
      elevation: partial.elevation ?? 1.5,
      element: partial.element ?? { type: 'PowerLawOrifice', C: 0.001, n: 0.65 },
      x: partial.x ?? 0,
      y: partial.y ?? 0,
    };
    return { links: [...state.links, link], nextId: id + 1, selectedLinkId: id, selectedNodeId: null };
  }),

  updateLink: (id, updates) => set((state) => ({
    links: state.links.map((l) => (l.id === id ? { ...l, ...updates } : l)),
  })),

  removeLink: (id) => set((state) => ({
    links: state.links.filter((l) => l.id !== id),
    selectedLinkId: state.selectedLinkId === id ? null : state.selectedLinkId,
  })),

  selectNode: (id) => set({ selectedNodeId: id, selectedLinkId: null }),
  selectLink: (id) => set({ selectedLinkId: id, selectedNodeId: null }),
  setToolMode: (mode) => set({ toolMode: mode }),

  setAmbient: (updates) => set((state) => ({ ...state, ...updates })),
  setResult: (result) => set({ result }),
  setIsRunning: (running) => set({ isRunning: running }),
  setError: (error) => set({ error }),

  exportTopology: (): TopologyJson => {
    const state = get();
    const ambientNodes = state.nodes.filter((n) => n.type === 'ambient');
    const ambTemp = ambientNodes.length > 0 ? ambientNodes[0].temperature : state.ambientTemperature;

    return {
      description: 'CONTAM-Next model',
      ambient: {
        temperature: ambTemp,
        pressure: state.ambientPressure,
        windSpeed: state.windSpeed,
        windDirection: state.windDirection,
      },
      nodes: state.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        temperature: n.temperature,
        elevation: n.elevation,
        volume: n.volume,
        pressure: n.pressure,
      })),
      links: state.links.map((l) => ({
        id: l.id,
        from: l.from,
        to: l.to,
        elevation: l.elevation,
        element: l.element,
      })),
    };
  },

  clearAll: () => set({
    nodes: [],
    links: [],
    selectedNodeId: null,
    selectedLinkId: null,
    result: null,
    error: null,
    nextId: 1,
  }),
}));
