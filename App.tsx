import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useStore } from './store';
import { Navbar, Footer, AssistantFab } from './components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from './components/ui/common';
import MapComponent from './components/Map';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Users, Award, Bell, Camera, MapPin, CheckCircle, Navigation, MessageSquare, X, Search } from 'lucide-react';
import { MOCK_USERS, MOCK_RESPONDERS } from './constants';
import { Incident } from './types';

// --- Page Components ---

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32 pb-16">
        <div className="container px-4 md:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto"
          >
            <Badge variant="outline" className="px-4 py-1 text-sm border-primary/50 text-primary">v2.0 Now Live</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-trust-500">
              Safety in Numbers. <br /> Power in Community.
            </h1>
            <p className="text-xl text-muted-foreground max-w-[42rem]">
              Real-time crowdsourced safety alerts, immediate SOS response, and a community looking out for each other.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button size="lg" className="h-12 px-8 text-lg" onClick={() => navigate('/dashboard')}>
                View Live Map
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => navigate('/report')}>
                Report Incident
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
      </section>

      {/* Stats / Impact */}
      <section className="py-12 bg-muted/50 border-y">
        <div className="container px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Active Users', value: '12K+' },
            { label: 'Incidents Resolved', value: '8.5K' },
            { label: 'Avg Response', value: '< 2min' },
            { label: 'Cities', value: '14' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <span className="text-3xl font-bold text-foreground">{stat.value}</span>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 container px-4 md:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Why CrowdGuard?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<MapPin className="text-trust-500" size={32} />}
            title="Real-Time Intelligence"
            desc="Live map updates with verified incident reports from trusted community members."
          />
          <FeatureCard
            icon={<AlertTriangle className="text-safety-500" size={32} />}
            title="Instant SOS"
            desc="One-tap emergency alerts that notify nearby responders and emergency services."
          />
          <FeatureCard
            icon={<Award className="text-alert-500" size={32} />}
            title="Gamified Citizenship"
            desc="Earn reputation points and badges for verifying reports and helping others."
          />
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <Card className="hover:shadow-lg transition-shadow bg-card/50 backdrop-blur">
    <CardHeader>
      <div className="mb-4 p-3 bg-background w-fit rounded-lg border shadow-sm">{icon}</div>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{desc}</p>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { incidents, upvoteIncident, filters, toggleFilter, selectedIncidentId, selectIncident, comments, fetchComments, addComment, currentUser } = useStore();
  const [timeFilter, setTimeFilter] = React.useState<'24h' | '7d' | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newComment, setNewComment] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'newest' | 'severity' | 'verified'>('newest');

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);
  const incidentComments = selectedIncidentId ? (comments[selectedIncidentId] || []) : [];

  React.useEffect(() => {
    if (selectedIncidentId) {
      fetchComments(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const filteredIncidents = incidents.filter(inc => {
    // Type Filter (Dropdown)
    if (typeFilter !== 'all' && inc.type !== typeFilter) return false;

    // Time Filter
    if (timeFilter !== 'all') {
      const incDate = new Date(inc.timestamp);
      const now = new Date();
      const diffHours = (now.getTime() - incDate.getTime()) / (1000 * 60 * 60);
      if (timeFilter === '24h' && diffHours > 24) return false;
      if (timeFilter === '7d' && diffHours > 24 * 7) return false;
    }

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        inc.description.toLowerCase().includes(query) ||
        (inc.address && inc.address.toLowerCase().includes(query)) ||
        inc.type.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sortBy === 'severity') {
      return (b.severity || 0) - (a.severity || 0);
    } else if (sortBy === 'verified') {
      return (Number(b.verified) - Number(a.verified));
    }
    return 0;
  });

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !newComment.trim()) return;

    await addComment({
      id: Date.now().toString(),
      incidentId: selectedIncidentId,
      userId: currentUser.id,
      userName: currentUser.name,
      text: newComment,
      timestamp: new Date().toISOString()
    });
    setNewComment('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 relative">
        <MapComponent />

        {/* Overlay Filters & Search */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-64">
          <Card className="bg-background/90 backdrop-blur border-none shadow-xl">
            <CardContent className="p-3 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  className="pl-8 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type Filter Dropdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">FILTER BY TYPE</p>
                <select
                  className="w-full text-sm border rounded p-1 bg-background"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="theft">Theft</option>
                  <option value="assault">Assault</option>
                  <option value="accident">Accident</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Time Range Dropdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">TIME RANGE</p>
                <select
                  className="w-full text-sm border rounded p-1 bg-background"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Feed Slide-in (Mobile hidden or collapsible) */}
        {!selectedIncident && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:top-4 md:bottom-auto md:w-80 z-10">
            <Card className="bg-background/95 backdrop-blur shadow-2xl max-h-[40vh] md:max-h-[60vh] overflow-hidden flex flex-col">
              <CardHeader className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">Nearby Alerts</CardTitle>
                  <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                </div>
                {/* Sort Dropdown */}
                <div className="mt-2">
                  <select
                    className="w-full text-xs border rounded p-1 bg-background"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="severity">Highest Severity</option>
                    <option value="verified">Verified First</option>
                  </select>
                </div>
              </CardHeader>
              <div className="overflow-y-auto p-0">
                {filteredIncidents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No incidents found matching your criteria.
                  </div>
                ) : (
                  filteredIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => selectIncident(inc.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex gap-2">
                          <Badge variant={inc.type === 'theft' ? 'outline' : 'secondary'} className="capitalize">{inc.type}</Badge>
                          {inc.severity && inc.severity > 3 && <Badge variant="destructive">High Severity</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{inc.description}</p>
                      {inc.address && <p className="text-xs text-muted-foreground mt-1 truncate"><MapPin size={10} className="inline mr-1" />{inc.address}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle size={12} className={inc.verified ? "text-eco-500" : "text-muted-foreground"} />
                          <span>{inc.upvotes} verifications</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            upvoteIncident(inc.id);
                          }}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Selected Incident Details */}
        <AnimatePresence>
          {selectedIncident && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute top-4 right-4 bottom-4 w-full md:w-96 bg-background/95 backdrop-blur shadow-2xl z-20 rounded-xl overflow-hidden flex flex-col border"
            >
              <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-lg capitalize flex items-center gap-2">
                  {selectedIncident.type}
                  {selectedIncident.verified && <CheckCircle size={16} className="text-eco-500" />}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => selectIncident(null)}>
                  <X size={18} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={selectedIncident.severity && selectedIncident.severity > 3 ? "destructive" : "secondary"}>
                      Severity: {selectedIncident.severity || 1}/5
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(selectedIncident.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{selectedIncident.description}</p>
                  {selectedIncident.address && (
                    <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <MapPin size={16} className="mt-0.5 shrink-0" />
                      {selectedIncident.address}
                    </div>
                  )}
                  {selectedIncident.imageUrl && (
                    <div className="mt-4">
                      <img
                        src={selectedIncident.imageUrl}
                        alt="Incident Evidence"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between py-2 border-y">
                  <div className="text-sm font-medium">
                    {selectedIncident.upvotes} Community Verifications
                  </div>
                  <Button
                    size="sm"
                    onClick={() => upvoteIncident(selectedIncident.id)}
                    className="gap-2"
                  >
                    <CheckCircle size={14} /> Verify Report
                  </Button>
                </div>

                {/* Comments Section */}
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MessageSquare size={14} /> Comments ({incidentComments.length})
                  </h4>
                  <div className="space-y-3 mb-4">
                    {incidentComments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first to add one.</p>
                    ) : (
                      incidentComments.map(comment => (
                        <div key={comment.id} className="bg-muted/30 p-3 rounded-lg text-sm">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-xs">{comment.userName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="text-sm"
                    />
                    <Button type="submit" size="sm" disabled={!newComment.trim()}>Post</Button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ReportPage = () => {
  const { addIncident, currentUser, userLocation } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [type, setType] = React.useState('suspicious');
  const [description, setDescription] = React.useState('');
  const [severity, setSeverity] = React.useState(1);
  const [address, setAddress] = React.useState('');
  const [isFetchingAddress, setIsFetchingAddress] = React.useState(false);

  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (userLocation) {
      setIsFetchingAddress(true);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation[0]}&lon=${userLocation[1]}`)
        .then(res => res.json())
        .then(data => {
          setAddress(data.display_name || '');
          setIsFetchingAddress(false);
        })
        .catch(err => {
          console.error('Failed to fetch address:', err);
          setIsFetchingAddress(false);
        });
    }
  }, [userLocation]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadedImageUrl(null);
      setAnalysisResult(null);

      // Upload and Analyze immediately
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('http://localhost:4000/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        setUploadedImageUrl(data.imageUrl);

        if (data.analysis) {
          setAnalysisResult(data.analysis);
          if (!data.analysis.toLowerCase().includes("not a safety incident")) {
            setDescription(data.analysis);
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalImageUrl = uploadedImageUrl;
    if (imageFile && !finalImageUrl) {
      const formData = new FormData();
      formData.append('image', imageFile);
      try {
        const res = await fetch('http://localhost:4000/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        finalImageUrl = data.imageUrl;
      } catch (err) {
        console.error('Failed to upload image:', err);
      }
    }

    const newIncident: Incident = {
      id: Date.now().toString(),
      type: type as any,
      latitude: userLocation ? userLocation[0] : 40.7128,
      longitude: userLocation ? userLocation[1] : -74.0060,
      description: description,
      address: address,
      severity: severity,
      timestamp: new Date().toISOString(),
      verified: false,
      reporterId: currentUser.id,
      upvotes: 0,
      imageUrl: finalImageUrl
    };

    await addIncident(newIncident);
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="container max-w-lg py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Report Incident</CardTitle>
            <p className="text-sm text-muted-foreground">Help keep your community safe. Reports are anonymous.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Incident Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="suspicious">Suspicious Activity</option>
                  <option value="theft">Theft</option>
                  <option value="assault">Assault</option>
                  <option value="accident">Accident</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Infrastructure Hazard</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Severity Level (1-5)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={severity}
                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                  <span className={`font-bold ${severity > 3 ? 'text-destructive' : 'text-primary'}`}>{severity}</span>
                </div>
                <p className="text-xs text-muted-foreground">1 = Minor, 5 = Critical Emergency</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Detecting location..."
                    value={isFetchingAddress ? "Fetching address..." : (address || (userLocation ? `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}` : "Detecting..."))}
                    readOnly
                  />
                  <Button type="button" variant="outline" size="icon"><Navigation size={18} /></Button>
                </div>
                {address && <p className="text-xs text-muted-foreground mt-1">{address}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Describe what you saw..."
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Evidence (Optional)</label>
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {previewUrl ? (
                    <div className="relative w-full">
                      <img src={previewUrl} alt="Preview" className="max-h-40 rounded object-contain mx-auto" />
                      {isAnalyzing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                          <div className="text-white text-xs font-bold animate-pulse">Analyzing...</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Camera size={24} className="mb-2" />
                      <span className="text-xs">Tap to upload photo</span>
                    </>
                  )}
                </div>
                {analysisResult && (
                  <div className="text-xs p-2 bg-muted rounded border">
                    <span className="font-bold">AI Analysis:</span> {analysisResult}
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={loading || isAnalyzing}>
                  {loading ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const SOSPage = () => {
  const { sosActive, setSosActive, triggerSOS, responders, fetchResponders, userLocation } = useStore();

  React.useEffect(() => {
    if (userLocation) {
      fetchResponders(userLocation[0], userLocation[1]);
    }
  }, [userLocation]);

  const handleSOS = () => {
    if (!sosActive) {
      triggerSOS();
    }
    setSosActive(!sosActive);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <motion.div
        animate={{ scale: sosActive ? [1, 1.1, 1] : 1 }}
        transition={{ repeat: sosActive ? Infinity : 0, duration: 1 }}
      >
        <button
          onClick={handleSOS}
          className={`relative w-64 h-64 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${sosActive ? 'bg-safety-600 shadow-safety-500/50' : 'bg-safety-500 hover:bg-safety-600'}`}
        >
          {sosActive && (
            <>
              <span className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping"></span>
              <span className="absolute inset-[-20px] rounded-full border-2 border-safety-500 opacity-40 animate-ping" style={{ animationDelay: '0.2s' }}></span>
            </>
          )}
          <div className="flex flex-col items-center text-white">
            <AlertTriangle size={64} className="mb-2" />
            <span className="text-4xl font-black tracking-widest">{sosActive ? 'SENDING...' : 'SOS'}</span>
            <span className="text-sm mt-2 font-medium opacity-90">{sosActive ? 'Tap to Cancel' : 'Tap for Emergency'}</span>
          </div>
        </button>
      </motion.div>

      <AnimatePresence>
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-12 w-full max-w-md"
          >
            <Card className="border-safety-500 bg-background/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-safety-500 flex items-center gap-2">
                  <Bell className="animate-bounce" /> Responders Alerted
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {responders.length === 0 ? (
                  <div className="text-center text-muted-foreground p-4">
                    Fetching nearby emergency services...
                  </div>
                ) : (
                  responders.map((res, i) => (
                    <div key={res.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          {res.type === 'police' ? '👮' : res.type === 'medical' ? '🚑' : '🛡️'}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{res.name}</p>
                          <p className="text-xs text-muted-foreground">{res.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-trust-500">{res.eta}</p>
                        <p className="text-xs text-muted-foreground">{res.distance}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LeaderboardPage = () => {
  const { leaderboardUsers, fetchLeaderboard } = useStore();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="container max-w-2xl py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-2">Community Guardians</h2>
        <p className="text-muted-foreground">Top contributors keeping our neighborhood safe.</p>
      </div>

      <div className="space-y-4">
        {leaderboardUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-none shadow-md ${index === 0 ? 'bg-gradient-to-r from-alert-500/10 to-transparent border border-alert-500/50' : ''}`}>
              <div className="flex items-center p-4">
                <div className="w-8 font-bold text-lg text-muted-foreground">#{user.rank}</div>
                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="w-12 h-12 rounded-full border-2 border-background shadow-sm mr-4" />
                <div className="flex-1">
                  <h3 className="font-bold">{user.name}</h3>
                  <div className="flex gap-1 mt-1">
                    {user.badges.map(b => (
                      <span key={b} className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded bg-muted text-muted-foreground">{b}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-xl text-primary">{user.points}</span>
                  <span className="text-xs text-muted-foreground">PTS</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const NewsPage = () => {
  const { news, fetchNews, userLocation } = useStore();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchNews(userLocation?.[0], userLocation?.[1]);
      setLoading(false);
    };
    load();
  }, [fetchNews, userLocation]);

  return (
    <div className="container max-w-4xl py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-2">Local Safety News</h2>
        <p className="text-muted-foreground">Stay informed about safety updates in your area.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {news.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                {item.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span className="font-semibold text-primary">{item.source}</span>
                    <span>•</span>
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                </CardContent>
                <div className="p-4 pt-0 mt-auto">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">Read Full Story</a>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const { theme, fetchIncidents, setUserLocation, connectSocket } = useStore();

  useEffect(() => {
    fetchIncidents();
    connectSocket();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error('Error getting location:', err)
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error('Error watching location:', err)
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [theme, fetchIncidents, setUserLocation]);

  return (
    <HashRouter>
      <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/sos" element={<SOSPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/news" element={<NewsPage />} />
          </Routes>
        </main>
        <Footer />
        <AssistantFab />
      </div>
    </HashRouter>
  );
};

export default App;