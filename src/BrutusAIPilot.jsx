 import React, { useState, useEffect } from 'react';
import { Zap, Calendar, BarChart3, User, Lightbulb, MessageSquare, Users, Rocket, Search, Loader2, Trash2, Eye, Heart, TrendingUp } from 'lucide-react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

import { db } from './lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const firebaseApi = {
  getPrompts: async () => {
    const querySnapshot = await getDocs(collection(db, "prompts"));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  },
  addPrompt: async (prompt) => {
    const docRef = await addDoc(collection(db, "prompts"), {
      ...prompt,
      timestamp: serverTimestamp()
    });
    return { ...prompt, id: docRef.id };
  },
  updatePromptStatus: async (id, status) => {
    const promptDoc = doc(db, "prompts", id);
    await updateDoc(promptDoc, { status });
  },
  deletePrompt: async (id) => {
    await deleteDoc(doc(db, "prompts", id));
  },
  getVideos: async () => {
    const querySnapshot = await getDocs(collection(db, "videos"));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  },
  addVideo: async (video) => {
    const docRef = await addDoc(collection(db, "videos"), {
      ...video,
      publishedAt: serverTimestamp()
    });
    return { ...video, id: docRef.id };
  }
};

export default function BrutusAIPilot() {
  const [activeTab, setActiveTab] = useState('studio');
  const [autoMode, setAutoMode] = useState(false);
  const [theme, setTheme] = useState('');
  const [trends, setTrends] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  // Load prompts and videos
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [promptsData, videosData] = await Promise.all([
      firebaseApi.getPrompts(),
      firebaseApi.getVideos()
    ]);
    setPrompts(promptsData);
    setVideos(videosData);
  };

  // Auto-Pilot Loop
  useEffect(() => {
    if (!isAutoRunning) return;

    const runAutoPilot = async () => {
      try {
        const openPrompts = prompts.filter(p => p.status === 'Draft');
        if (openPrompts.length === 0) {
          setStatusMessage('Keine offenen Prompts gefunden...');
          return;
        }

        const selectedPrompt = openPrompts[0];
        setStatusMessage(`Bearbeite: ${selectedPrompt.title}...`);

        // Generate image with Pollinations.ai
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(selectedPrompt.imagePrompt)}?width=1080&height=1920&nologo=true`;

        // Update status
        await firebaseApi.updatePromptStatus(selectedPrompt.id, 'AUTO_PUBLISH');

        // Post to Make.com webhook (simulated)
        const webhookUrl = import.meta.env.VITE_MAKE_WEBHOOK_URL || 'https://hook.eu2.make.com/example';
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: imageUrl,
              text: selectedPrompt.text,
              promptId: selectedPrompt.id
            })
          });
          setStatusMessage(`✓ ${selectedPrompt.title} veröffentlicht!`);
        } catch (error) {
          console.error('Webhook error:', error);
          setStatusMessage(`⚠ Webhook-Fehler bei ${selectedPrompt.title}`);
        }

        loadData();
      } catch (error) {
        console.error('Auto-Pilot error:', error);
        setStatusMessage('⚠ Fehler im Auto-Pilot');
      }
    };

    const interval = setInterval(runAutoPilot, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoRunning]);

  const scanTrends = async () => {
    if (!theme.trim()) {
      alert('Bitte gib ein Thema ein!');
      return;
    }

    setIsScanning(true);
    setTrends([]);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analysiere aktuelle Trends zum Thema "${theme}" und erstelle 4 virale Kurzvideo-Konzepte für TikTok/Instagram Reels.

Antworte AUSSCHLIESSLICH mit einem JSON-Array (ohne Markdown-Formatierung):
[
  {
    "title": "Catchy Titel",
    "icon": "lightbulb|message-square|users|rocket",
    "description": "Kurze Beschreibung",
    "bullets": ["Punkt 1", "Punkt 2", "Punkt 3"],
    "imagePrompt": "Detaillierter Prompt für Thumbnail-Generierung",
    "text": "Vollständiger Video-Script-Text"
  }
]

Wichtig:
- Nur gültiges JSON ohne \`\`\`json
- 4 unterschiedliche Konzepte
- Bullets sind konkrete Hook-Strategien
- imagePrompt ist detailliert für Pollinations.ai
- text ist komplettes Video-Skript (30-60 Sekunden)`
              }]
            }],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 4000
            }
          })
        }
      );

      const data = await response.json();
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Robust JSON parsing
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonString = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);
        setTrends(parsed);
      } else {
        throw new Error('Kein JSON-Array gefunden in der Antwort');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Fehler beim Scannen der Trends. Bitte versuche es erneut. Details: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const createPrompt = async (trend) => {
    await firebaseApi.addPrompt({
      title: trend.title,
      theme: theme,
      status: 'Draft',
      imagePrompt: trend.imagePrompt,
      text: trend.text,
      bullets: trend.bullets
    });
    loadData();
    alert(`"${trend.title}" wurde als Draft gespeichert!`);
  };

  const deletePromptById = async (id) => {
    if (confirm('Wirklich löschen?')) {
      await firebaseApi.deletePrompt(id);
      loadData();
    }
  };

  const updateStatus = async (id, newStatus) => {
    await firebaseApi.updatePromptStatus(id, newStatus);
    loadData();
  };

  const getIconComponent = (iconName) => {
    const icons = {
      'lightbulb': Lightbulb,
      'message-square': MessageSquare,
      'users': Users,
      'rocket': Rocket
    };
    return icons[iconName] || Lightbulb;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
              BrutusAi Pilot
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Code
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Vorschau
            </button>
            <button className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
              Teilen
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
                activeTab === 'studio'
                  ? 'text-white bg-purple-600 rounded-t-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              Studio
            </button>
            <button
              onClick={() => setActiveTab('planer')}
              className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
                activeTab === 'planer'
                  ? 'text-white bg-purple-600 rounded-t-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Planer
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
                activeTab === 'tracking'
                  ? 'text-white bg-purple-600 rounded-t-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tracking
            </button>
            <button
              onClick={() => setActiveTab('profil')}
              className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
                activeTab === 'profil'
                  ? 'text-white bg-purple-600 rounded-t-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              Profil
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Studio Tab */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Auto Toggle */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Auto-Pilot Modus</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAutoMode(true)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      autoMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setAutoMode(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      !autoMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
              {autoMode && (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setIsAutoRunning(!isAutoRunning)}
                    className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isAutoRunning
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isAutoRunning ? 'Stop Auto' : 'Start Auto'}
                  </button>
                  {statusMessage && (
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      {isAutoRunning && <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
                      {statusMessage}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex gap-3">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Thema eingeben (z.B. Tech, Cooking)..."
                className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && scanTrends()}
              />
              <button
                onClick={scanTrends}
                disabled={isScanning}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scannen...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Scannen
                  </>
                )}
              </button>
            </div>

            {/* Sidebar & Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Trend AI
                  </label>
                  <input
                    type="text"
                    placeholder="Scanniere..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-purple-500"
                    readOnly
                  />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Strategie
                  </label>
                  <input
                    type="text"
                    placeholder="Aktueller Fokus..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-purple-500 mb-3"
                    readOnly
                  />
                  <button className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors">
                    Strategie Update
                  </button>
                </div>
              </div>

              {/* Trend Cards */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {trends.map((trend, index) => {
                  const IconComponent = getIconComponent(trend.icon);
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900 text-lg leading-tight">
                          {trend.title}
                        </h3>
                      </div>

                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        {trend.description}
                      </p>

                      <ul className="space-y-2 mb-6">
                        {trend.bullets.map((bullet, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-purple-600 font-bold mt-0.5">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex gap-2 pt-4 border-t border-slate-100">
                        <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                          Details ansehen
                        </button>
                        <button
                          onClick={() => createPrompt(trend)}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          Erstellen
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!isScanning && trends.length === 0 && theme && (
                  <div className="md:col-span-2 text-center py-12 text-slate-400">
                    Keine Trends gefunden. Klicke auf "Scannen" um zu starten.
                  </div>
                )}

                {!theme && !isScanning && (
                  <div className="md:col-span-2 text-center py-12 text-slate-400">
                    Gib ein Thema ein und klicke auf "Scannen" um virale Konzepte zu entdecken.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Planer Tab */}
        {activeTab === 'planer' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Content Planer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prompts.map((prompt) => (
                <div key={prompt.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">{prompt.title}</h3>
                    <button
                      onClick={() => deletePromptById(prompt.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      prompt.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                      prompt.status === 'AUTO_PUBLISH' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {prompt.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{prompt.text}</p>

                  <div className="flex gap-2">
                    {prompt.status === 'Draft' && (
                      <button
                        onClick={() => updateStatus(prompt.id, 'Completed')}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        Fertig
                      </button>
                    )}
                    {prompt.status === 'AUTO_PUBLISH' && (
                      <button
                        onClick={() => updateStatus(prompt.id, 'Draft')}
                        className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Zurück
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {prompts.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-slate-400">
                  Noch keine Prompts erstellt. Gehe zu Studio und scanne Trends!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Video Tracking</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Titel</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Plattform</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Views</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Likes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {videos.map((video) => (
                    <tr key={video.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900">{video.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {video.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-400" />
                        {video.views?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <span className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-400" />
                          {video.likes?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Live
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {videos.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  Noch keine Videos veröffentlicht.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profil Tab */}
        {activeTab === 'profil' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Profil Einstellungen</h2>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {mockFirebase.user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{mockFirebase.user.name}</h3>
                  <span className="inline-block px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full mt-1">
                    {mockFirebase.user.plan} Plan
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    defaultValue={mockFirebase.user.name}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="creator@brutusai.de"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors mt-4">
                  Änderungen speichern
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">API Einstellungen</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Gemini API Key</label>
                  <input
                    type="password"
                    value={GEMINI_API_KEY}
                    readOnly
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Make.com Webhook</label>
                  <input
                    type="text"
                    placeholder="https://hook.eu2.make.com/..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
