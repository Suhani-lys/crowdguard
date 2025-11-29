import { create } from 'zustand';
import { Incident, User, Comment, NewsItem, SOSResponder } from './types';
import { MOCK_INCIDENTS, MOCK_USERS } from './constants';
import { io, Socket } from 'socket.io-client';

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  incidents: Incident[];
  fetchIncidents: () => Promise<void>;
  addIncident: (incident: Incident) => Promise<void>;
  upvoteIncident: (id: string) => Promise<void>;
  receiveIncident: (incident: Incident) => void;
  updateIncident: (incident: Incident) => void;
  currentUser: User;
  userLocation: [number, number] | null;
  setUserLocation: (location: [number, number] | null) => void;
  sosActive: boolean;
  setSosActive: (active: boolean) => void;
  triggerSOS: () => void;
  filters: Record<string, boolean>;
  toggleFilter: (type: string) => void;
  comments: Record<string, Comment[]>;
  fetchComments: (incidentId: string) => Promise<void>;
  addComment: (comment: Comment) => Promise<void>;
  receiveComment: (comment: Comment) => void;
  selectedIncidentId: string | null;
  selectIncident: (id: string | null) => void;
  leaderboardUsers: User[];
  fetchLeaderboard: () => Promise<void>;
  news: NewsItem[];
  fetchNews: (latitude?: number, longitude?: number) => Promise<void>;
  responders: SOSResponder[];
  fetchResponders: (latitude: number, longitude: number) => Promise<void>;
  socket: Socket | null;
  connectSocket: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),
  incidents: [],
  fetchIncidents: async () => {
    try {
      const response = await fetch('http://localhost:4000/api/incidents');
      const data = await response.json();
      set({ incidents: data });
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  },
  addIncident: async (incident) => {
    // Optimistic update
    set((state) => ({ incidents: [incident, ...state.incidents] }));
    try {
      await fetch('http://localhost:4000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident)
      });
    } catch (error) {
      console.error('Failed to add incident:', error);
    }
  },
  upvoteIncident: async (id) => {
    try {
      const res = await fetch(`http://localhost:4000/api/incidents/${id}/upvote`, {
        method: 'POST',
      });
      const updatedIncident = await res.json();
      set((state) => ({
        incidents: state.incidents.map((inc) => (inc.id === id ? updatedIncident : inc)),
      }));
    } catch (error) {
      console.error('Failed to upvote incident:', error);
    }
  },
  receiveIncident: (incident) => {
    set((state) => {
      // Avoid duplicates
      if (state.incidents.some(i => i.id === incident.id)) return state;
      return { incidents: [incident, ...state.incidents] };
    });
  },
  updateIncident: (incident) => {
    set((state) => ({
      incidents: state.incidents.map((inc) => (inc.id === incident.id ? incident : inc)),
    }));
  },
  currentUser: MOCK_USERS[0],
  userLocation: null,
  setUserLocation: (location) => {
    set({ userLocation: location });
    const socket = get().socket;
    if (socket && location) {
      socket.emit('updateLocation', { latitude: location[0], longitude: location[1] });
    }
  },
  sosActive: false,
  setSosActive: (active) => set({ sosActive: active }),
  triggerSOS: () => {
    const { socket, currentUser, userLocation } = get();
    if (socket && userLocation) {
      socket.emit('sosAlert', {
        userId: currentUser.id,
        location: { latitude: userLocation[0], longitude: userLocation[1] }
      });
      console.log('SOS Alert Sent');
    }
  },
  filters: {
    theft: true,
    assault: true,
    accident: true,
    suspicious: true,
    harassment: true,
    other: true
  },
  toggleFilter: (type) => set((state) => ({
    filters: { ...state.filters, [type]: !state.filters[type] }
  })),
  comments: {},
  fetchComments: async (incidentId) => {
    try {
      const res = await fetch(`http://localhost:4000/api/incidents/${incidentId}/comments`);
      const data = await res.json();
      set((state) => ({
        comments: { ...state.comments, [incidentId]: data }
      }));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  },
  addComment: async (comment) => {
    // Optimistic update
    set((state) => ({
      comments: {
        ...state.comments,
        [comment.incidentId]: [comment, ...(state.comments[comment.incidentId] || [])]
      }
    }));
    try {
      await fetch(`http://localhost:4000/api/incidents/${comment.incidentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  },
  receiveComment: (comment) => {
    set((state) => {
      const existing = state.comments[comment.incidentId] || [];
      if (existing.some(c => c.id === comment.id)) return state;
      return {
        comments: {
          ...state.comments,
          [comment.incidentId]: [comment, ...existing]
        }
      };
    });
  },
  selectedIncidentId: null,
  selectIncident: (id) => set({ selectedIncidentId: id }),
  leaderboardUsers: [],
  fetchLeaderboard: async () => {
    try {
      const res = await fetch('http://localhost:4000/api/leaderboard');
      const data = await res.json();
      set({ leaderboardUsers: data });
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  },
  news: [],
  fetchNews: async (lat, lon) => {
    if (!lat || !lon) return;

    try {
      // Fetch from our backend proxy
      const newsRes = await fetch(`http://localhost:4000/api/news?lat=${lat}&lon=${lon}`);
      const text = await newsRes.text();

      // 3. Parse XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));

      const newsItems: NewsItem[] = items.slice(0, 12).map(item => {
        const descriptionHtml = item.querySelector("description")?.textContent || "";
        // Basic HTML stripping
        const div = document.createElement("div");
        div.innerHTML = descriptionHtml;
        const description = div.textContent || div.innerText || "";

        return {
          title: item.querySelector("title")?.textContent || "Untitled",
          description: description,
          url: item.querySelector("link")?.textContent || "#",
          source: item.querySelector("source")?.textContent || "Google News",
          publishedAt: item.querySelector("pubDate")?.textContent || new Date().toISOString(),
          imageUrl: ""
        };
      });

      // Fix image URL generation (index is not available in map callback above directly without arg)
      const newsWithImages = newsItems.map((item, index) => ({
        ...item,
        imageUrl: `https://picsum.photos/seed/${index + item.title.length}/400/200` // Deterministic random image
      }));

      set({ news: newsWithImages });

    } catch (error) {
      console.error("Failed to fetch news:", error);
      // Fallback to mock if API fails
      const mockNews: NewsItem[] = [
        {
          title: "Unable to load live news. Showing cached updates.",
          description: "Please check your internet connection or try again later.",
          source: "System",
          url: "#",
          publishedAt: new Date().toISOString()
        }
      ];
      set({ news: mockNews });
    }
  },
  responders: [],
  fetchResponders: async (lat, lon) => {
    try {
      const res = await fetch(`http://localhost:4000/api/nearby-responders?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      set({ responders: data });
    } catch (error) {
      console.error("Failed to fetch responders:", error);
    }
  },
  socket: null,
  connectSocket: () => {
    const { socket } = get();
    if (socket) return;

    const newSocket = io('http://localhost:4000');

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('newIncident', (incident) => {
      get().receiveIncident(incident);
    });

    newSocket.on('incidentUpdated', (incident) => {
      get().updateIncident(incident);
    });

    newSocket.on('newComment', (comment) => {
      get().receiveComment(comment);
    });

    newSocket.on('sosAlert', (data) => {
      console.log("SOS RECEIVED", data);
      // In a real app, we would trigger a UI alert here
      // For now, let's just log it or maybe set a global alert state if we had one
      alert(`SOS Alert! Someone needs help at ${data.location.latitude}, ${data.location.longitude}`);
    });

    set({ socket: newSocket });
  }
}));
