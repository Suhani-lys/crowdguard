import { Incident, User, SOSResponder } from './types';

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: '1',
    type: 'theft',
    latitude: 40.7128,
    longitude: -74.0060,
    description: 'Bicycle stolen from bike rack.',
    timestamp: '2023-10-27T10:00:00Z',
    verified: true,
    reporterId: 'u1',
    upvotes: 12
  },
  {
    id: '2',
    type: 'suspicious',
    latitude: 40.7150,
    longitude: -74.0100,
    description: 'Suspicious individual looking into cars.',
    timestamp: '2023-10-27T11:30:00Z',
    verified: false,
    reporterId: 'u2',
    upvotes: 5
  },
  {
    id: '3',
    type: 'accident',
    latitude: 40.7200,
    longitude: -73.9900,
    description: 'Minor collision between taxi and sedan.',
    timestamp: '2023-10-27T09:15:00Z',
    verified: true,
    reporterId: 'u3',
    upvotes: 20
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Chen',
    rank: 1,
    points: 2450,
    badges: ['Guardian', 'First Responder', 'Top Reporter'],
    avatar: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: 'u2',
    name: 'Sarah Jones',
    rank: 2,
    points: 1980,
    badges: ['Scout', 'Helper'],
    avatar: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: 'u3',
    name: 'Mike Ross',
    rank: 3,
    points: 1850,
    badges: ['Watcher'],
    avatar: 'https://picsum.photos/100/100?random=3'
  }
];

export const MOCK_RESPONDERS: SOSResponder[] = [
  { id: 'r1', name: 'Officer Miller', distance: '0.2 mi', type: 'police', eta: '2 min' },
  { id: 'r2', name: 'City Ambualnce 42', distance: '0.8 mi', type: 'medical', eta: '5 min' },
  { id: 'r3', name: 'Volunteer Guard: Jane', distance: '0.1 mi', type: 'volunteer', eta: '1 min' },
];

export const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGlqaXdoaWcwMzBzM2ptbDJob3h2b3Z0In0.XXXXXXXXXXXX'; // Placeholder
