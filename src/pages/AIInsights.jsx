import React, { useState, useRef, useEffect } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, Users, Send, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import { getAnalyticsOverview, getIssues, aiChat } from '../services/api';
import toast from 'react-hot-toast';

const INSIGHT_CARDS = [
  { id: 'sprint',    icon: TrendingUp,    label: 'Sprint Summary',    color: 'var(--accent-blue)',    prompt: 'Analyze the current sprint health. Comment on velocity, completion rate, and what needs attention. Be specific and actionable.' },
  { id: 'risk',      icon: AlertTriangle, label: 'Risk Detection',     color: 'var(--accent-rose)',    prompt: 'Identify governance risks from the data. Look at overdue issues, blocked items, high-priority work, and sprint blockers. Provide concrete action items.' },
  { id: 'workload',  icon: Users,         label: 'Workload Analysis',  color: 'var(--accent-violet)',  prompt: 'Analyze workload distribution. Are there bottlenecks? What is the balance between issue types? What should be reprioritized?' },
  { id: 'exec',      icon: Sparkles,      label: 'Executive Summary',  color: 'var(--accent-amber)',   prompt: 'Write a concise executive summary of the current governance state. Include key metrics, status, risks, and recommendations for leadership.' },
];

async function getContext() {
  const [a, i] = await Promise.allSettled([getAnalyticsOverview(), getIssues({ maxResults: 20 })]);
  const ov = a.status === 'fulfilled' ? a.value : {};
  const issues = i.status === 'fulfilled' ? (i.value.issues || []) : [];
  return `
APNILEAP Live Jira Governance Data:
- Total Issues: ${ov.total || 0} across ${ov.projectCount || 0} projects
- Completion Rate: ${ov.completionRate || 0}%
- Overdue Issues: ${ov.overdue || 0}
- Status Breakdown: ${JSON.stringify(ov.byStatus || {})}
- Priority Breakdown: ${JSON.stringify(ov.byPriority || {})}
- Issue Types: ${JSON.stringify(ov.byType || {})}
- Recent Issues (sample): ${issues.slice(0, 8).map(i => `${i.key}: "${i.fields?.summary}" [${i.fields?.status?.name}/${i.fields?.priority?.name}]`).join(' | ')}
`.trim();
}

export default function AIInsights() {
  const [insights, setInsights] = useState({});
  const [loadingCard, setLoadingCard] = useState({});
  const [chat, setChat] = useState([
    { role: 'assistant', text: "Hello! I'm the APNILEAP AI Operations Intelligence, connected to your live Jira data.\n\nI can analyze your sprints, detect risks, summarize governance health, and answer any questions about your projects. What would you like to explore?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const generateInsight = async (card) => {
    setLoadingCard(l => ({ ...l, [card.id]: true }));
    try {
      const context = await getContext();
      const data = await aiChat(
        [{ role: 'user', content: `${card.prompt}\n\nUse the data below to give a specific, data-driven response with bullet points:\n\n${context}` }],
        'You are APNILEAP\'s enterprise governance AI. Provide concise, professional, actionable insights based on Jira data. Always reference specific numbers from the data.'
      );
      const text = data.content?.[0]?.text || 'No response generated.';
      setInsights(prev => ({ ...prev, [card.id]: text }));
    } catch (e) {
      const msg = typeof e === 'string' ? e : 'AI service error';
      setInsights(prev => ({ ...prev, [card.id]: `Error: ${msg}\n\nMake sure ANTHROPIC_API_KEY is set in server/.env` }));
      toast.error('AI error: ' + msg);
    } finally { setLoadingCard(l => ({ ...l, [card.id]: false })); }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChat(h => [...h, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const context = await getContext();
      const history = chat.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
      const data = await aiChat(
        [...history, { role: 'user', content: msg }],
        `You are APNILEAP's AI Governance Assistant. You have access to this live Jira data:\n\n${context}\n\nAnswer questions about the projects, issues, sprints, risks, and governance. Be specific and reference real data when available.`
      );
      const text = data.content?.[0]?.text || 'Sorry, I could not generate a response.';
      setChat(h => [...h, { role: 'assistant', text }]);
    } catch (e) {
      const msg = typeof e === 'string' ? e : 'Service error';
      setChat(h => [...h, { role: 'assistant', text: `⚠️ Error: ${msg}\n\nPlease ensure ANTHROPIC_API_KEY is configured in server/.env` }]);
    } finally { setChatLoading(false); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="AI Operational Intelligence" subtitle="Powered by Claude — Live Jira data" />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>
        {/* Left: Insight Cards */}
        <div style={{ overflow: 'auto', padding: 24, borderRight: '1px solid var(--border)' }}>
          {/* Setup note */}
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Setup:</strong> Add <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>GEMINI_API_KEY=your_key</code> to <code style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>server/.env</code> to enable AI.
            Get a <strong>free</strong> key (1500 req/day) at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>aistudio.google.com</a> — no credit card needed.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {INSIGHT_CARDS.map(card => (
              <div key={card.id} className="card" style={{
                border: insights[card.id] ? `1px solid ${card.color}35` : undefined,
                background: insights[card.id] ? `${card.color}04` : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <card.icon size={15} style={{ color: card.color }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{card.label}</span>
                  <button onClick={() => generateInsight(card)} className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 11, flexShrink: 0 }}
                    disabled={loadingCard[card.id]}>
                    {loadingCard[card.id]
                      ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                      : 'Generate'}
                  </button>
                </div>
                {loadingCard[card.id] ? (
                  <div style={{ display: 'flex', gap: 4, padding: '12px 0' }}>
                    <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                  </div>
                ) : insights[card.id] ? (
                  <div style={{
                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto',
                    borderTop: `1px solid ${card.color}20`, paddingTop: 10,
                  }}>
                    {insights[card.id]}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Click Generate to analyze your live Jira data with AI
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: '14px 18px' }}>
            <div className="section-title" style={{ marginBottom: 10 }}>Quick Prompts</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                'What are the top 3 risks right now?',
                'Which project has the lowest completion rate?',
                'Summarize overdue issues',
                'What should I prioritize today?',
                'How is the sprint velocity?',
              ].map(q => (
                <button key={q} onClick={() => { setChatInput(q); }}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: '5px 12px' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Brain size={15} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>AI Governance Assistant</div>
              <div style={{ fontSize: 10, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>● Live Jira Context</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chat.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                    <Brain size={11} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%', padding: '10px 14px', borderRadius: 12,
                  background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  fontSize: 12.5, color: msg.role === 'user' ? 'white' : 'var(--text-secondary)',
                  lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={11} color="white" />
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 2px', display: 'flex', gap: 4 }}>
                  <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask about your Jira data..."
                style={{ flex: 1, height: 36, fontSize: 12 }}
                disabled={chatLoading}
              />
              <button onClick={sendChat} className="btn btn-primary" style={{ padding: '0 14px', flexShrink: 0 }} disabled={chatLoading || !chatInput.trim()}>
                <Send size={13} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
              Press Enter to send · AI analyzes live Jira data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
