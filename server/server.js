require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Jira clients ─────────────────────────────────────────────────────────────
const JIRA_BASE = process.env.JIRA_BASE_URL;

const jira = () => axios.create({
  baseURL: `${JIRA_BASE}/rest/api/3`,
  headers: {
    Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const agile = () => axios.create({
  baseURL: `${JIRA_BASE}/rest/agile/1.0`,
  headers: {
    Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ─── Helper: POST to /search/jql (new API) ───────────────────────────────────
const searchJQL = async (jql, fields = 'summary,status,assignee,priority,issuetype,created,updated,duedate,labels,parent,project', maxResults = 200) => {
  const r = await jira().post('/search/jql', { jql, fields: fields.split(','), maxResults });
  return { issues: r.data.issues || [], total: r.data.total || 0 };
};

const handleError = (res, err) => {
  const msg = err?.response?.data?.errorMessages?.[0]
    || err?.response?.data?.message
    || err?.response?.data?.errors
    || err.message;
  console.error(`[${new Date().toISOString()}] Jira Error ${err?.response?.status}:`, JSON.stringify(msg));
  res.status(err?.response?.status || 500).json({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) });
};

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const r = await jira().get('/myself');
    res.json({ status: 'connected', user: r.data.displayName, email: r.data.emailAddress });
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
app.get('/api/projects', async (req, res) => {
  try {
    const r = await jira().get('/project/search?maxResults=50&expand=lead');
    res.json(r.data.values || []);
  } catch (err) { handleError(res, err); }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, key, description, leadAccountId } = req.body;
    const r = await jira().post('/project', {
      name, key, description,
      projectTypeKey: 'software',
      projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-scrum-template',
      leadAccountId,
    });
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// ─── Helper: get all project keys ────────────────────────────────────────────
const getAllProjectKeys = async () => {
  const r = await jira().get('/project/search?maxResults=50');
  return (r.data.values || []).map(p => p.key);
};

// ─── ISSUES ───────────────────────────────────────────────────────────────────
app.get('/api/issues', async (req, res) => {
  try {
    const { projectKey, status, type, maxResults = 200 } = req.query;

    let jql = '';
    if (projectKey && projectKey !== 'all' && projectKey !== '') {
      jql = `project = "${projectKey}"`;
    } else {
      const keys = await getAllProjectKeys();
      if (keys.length === 0) return res.json({ issues: [], total: 0 });
      jql = `project in (${keys.map(k => `"${k}"`).join(',')})`;
    }
    if (status) jql += ` AND status = "${status}"`;
    if (type)   jql += ` AND issuetype = "${type}"`;
    jql += ' ORDER BY created DESC';

    console.log('[Issues] JQL:', jql);
    const result = await searchJQL(jql, 'summary,status,assignee,priority,issuetype,created,updated,duedate,labels,parent,project', Number(maxResults));
    res.json(result);
  } catch (err) { handleError(res, err); }
});

app.get('/api/issues/:issueKey', async (req, res) => {
  try {
    const r = await jira().get(`/issue/${req.params.issueKey}`);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

app.post('/api/issues', async (req, res) => {
  try {
    const { projectKey, summary, description, issueType, priority, assignee, dueDate, labels, parentKey } = req.body;
    const body = {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType || 'Task' },
        priority: { name: priority || 'Medium' },
        labels: labels || [],
      },
    };
    if (description) body.fields.description = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] };
    if (assignee)  body.fields.assignee = { accountId: assignee };
    if (dueDate)   body.fields.duedate = dueDate;
    if (parentKey) body.fields.parent = { key: parentKey };
    const r = await jira().post('/issue', body);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

app.put('/api/issues/:issueKey', async (req, res) => {
  try {
    const { summary, description, priority, assignee, dueDate, labels } = req.body;
    const fields = {};
    if (summary)            fields.summary = summary;
    if (priority)           fields.priority = { name: priority };
    if (assignee !== undefined) fields.assignee = assignee ? { accountId: assignee } : null;
    if (dueDate !== undefined)  fields.duedate = dueDate || null;
    if (labels)             fields.labels = labels;
    if (description)        fields.description = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] };
    await jira().put(`/issue/${req.params.issueKey}`, { fields });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

app.delete('/api/issues/:issueKey', async (req, res) => {
  try {
    await jira().delete(`/issue/${req.params.issueKey}`);
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// ─── TRANSITIONS ──────────────────────────────────────────────────────────────
app.get('/api/issues/:issueKey/transitions', async (req, res) => {
  try {
    const r = await jira().get(`/issue/${req.params.issueKey}/transitions`);
    res.json(r.data.transitions || []);
  } catch (err) { handleError(res, err); }
});

app.post('/api/issues/:issueKey/transitions', async (req, res) => {
  try {
    const { transitionId } = req.body;
    await jira().post(`/issue/${req.params.issueKey}/transitions`, { transition: { id: transitionId } });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
app.get('/api/issues/:issueKey/comments', async (req, res) => {
  try {
    const r = await jira().get(`/issue/${req.params.issueKey}/comment`);
    res.json(r.data.comments || []);
  } catch (err) { handleError(res, err); }
});

app.post('/api/issues/:issueKey/comments', async (req, res) => {
  try {
    const { body: commentBody } = req.body;
    const r = await jira().post(`/issue/${req.params.issueKey}/comment`, {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: commentBody }] }] },
    });
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// ─── BOARDS & SPRINTS ─────────────────────────────────────────────────────────
app.get('/api/boards', async (req, res) => {
  try {
    const r = await agile().get('/board?maxResults=50');
    res.json(r.data.values || []);
  } catch (err) { handleError(res, err); }
});

app.get('/api/boards/:boardId/sprints', async (req, res) => {
  try {
    const r = await agile().get(`/board/${req.params.boardId}/sprint?state=active,future,closed&maxResults=20`);
    res.json(r.data.values || []);
  } catch (err) { handleError(res, err); }
});

app.get('/api/sprints/:sprintId/issues', async (req, res) => {
  try {
    const r = await agile().get(`/sprint/${req.params.sprintId}/issue?maxResults=100&fields=summary,status,assignee,priority,issuetype,description`);
    res.json({ issues: r.data.issues || [], total: r.data.total || 0 });
  } catch (err) { handleError(res, err); }
});

app.post('/api/sprints/move', async (req, res) => {
  try {
    const { issueKey, transitionId } = req.body;
    await jira().post(`/issue/${issueKey}/transitions`, { transition: { id: transitionId } });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  try {
    const r = await jira().get('/users/search?maxResults=200');
    const humans = (r.data || []).filter(u => u.accountType === 'atlassian' && u.active !== false);
    res.json(humans);
  } catch (err) { handleError(res, err); }
});

app.get('/api/myself', async (req, res) => {
  try {
    const r = await jira().get('/myself');
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// ─── ANALYTICS OVERVIEW ───────────────────────────────────────────────────────
app.get('/api/analytics/overview', async (req, res) => {
  try {
    const keys = await getAllProjectKeys();
    if (keys.length === 0) {
      return res.json({ total: 0, byStatus: {}, byType: {}, byPriority: {}, overdue: 0, completionRate: 0, projectCount: 0 });
    }

    const jql = `project in (${keys.map(k => `"${k}"`).join(',')}) ORDER BY created DESC`;
    console.log('[Analytics Overview] JQL:', jql);
    const result = await searchJQL(jql, 'status,issuetype,priority,assignee,created,duedate', 500);

    const byStatus = {}, byType = {}, byPriority = {};
    let overdue = 0;
    const today = new Date();

    (result.issues || []).forEach(i => {
      const f = i.fields;
      const s = f.status?.name || 'Unknown';
      const t = f.issuetype?.name || 'Unknown';
      const p = f.priority?.name || 'Unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
      byType[t]   = (byType[t]   || 0) + 1;
      byPriority[p] = (byPriority[p] || 0) + 1;
      if (f.duedate && new Date(f.duedate) < today && s !== 'Done') overdue++;
    });

    const done = byStatus['Done'] || 0;
    const total = result.total || result.issues.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    res.json({ total, byStatus, byType, byPriority, overdue, completionRate, projectCount: keys.length });
  } catch (err) { handleError(res, err); }
});

// ─── ANALYTICS PER-PROJECT ────────────────────────────────────────────────────
app.get('/api/analytics/projects', async (req, res) => {
  try {
    const pr = await jira().get('/project/search?maxResults=50');
    const projects = pr.data.values || [];
    if (projects.length === 0) return res.json([]);

    const stats = await Promise.all(projects.map(async proj => {
      try {
        const jql = `project = "${proj.key}" ORDER BY created DESC`;
        const result = await searchJQL(jql, 'status,duedate', 500);
        const issues = result.issues || [];
        const total  = result.total || issues.length;
        const done   = issues.filter(i => i.fields?.status?.name === 'Done').length;
        const today  = new Date();
        const overdue = issues.filter(i => {
          const d = i.fields?.duedate;
          return d && new Date(d) < today && i.fields?.status?.name !== 'Done';
        }).length;
        return {
          name:       proj.key,
          fullName:   proj.name,
          total,
          done,
          overdue,
          completion: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      } catch {
        return { name: proj.key, fullName: proj.name, total: 0, done: 0, overdue: 0, completion: 0 };
      }
    }));
    res.json(stats);
  } catch (err) { handleError(res, err); }
});

// ─── AI PROXY — Google Gemini (free tier) ────────────────────────────────────
// Free tier: 15 req/min, 1500 req/day — plenty for governance insights
// Get your free key at: https://aistudio.google.com/app/apikey
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY not set in server/.env — get a free key at https://aistudio.google.com/app/apikey'
      });
    }

    // Build Gemini contents array from messages
    // Gemini uses "user"/"model" roles (not "assistant")
    const contents = [];

    // If there's a system prompt, prepend it as first user turn + model ack
    if (system) {
      contents.push({ role: 'user', parts: [{ text: `[System context]\n${system}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }

    // Add conversation messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const GEMINI_MODEL = 'gemini-2.0-flash'; // free, fast, smart
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await axios.post(url, {
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Extract text from Gemini response
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    // Return in same shape our frontend expects (content[0].text)
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error('[Gemini AI] Error:', err?.response?.data || err.message);
    const msg = err?.response?.data?.error?.message || err.message || 'AI service error';
    res.status(500).json({ error: msg });
  }
});

// ─── ISSUE DETAIL — full fields including description, subtasks, comments ─────
app.get('/api/issues/:issueKey/detail', async (req, res) => {
  try {
    const r = await jira().get(`/issue/${req.params.issueKey}?fields=summary,status,assignee,priority,issuetype,created,updated,duedate,description,labels,subtasks,parent,project,comment,reporter,watches,votes,attachment`);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// Create subtask
app.post('/api/issues/:issueKey/subtask', async (req, res) => {
  try {
    const { summary, description, assignee, priority } = req.body;
    const parent = await jira().get(`/issue/${req.params.issueKey}?fields=project`);
    const projectKey = parent.data.fields.project.key;
    const body = {
      fields: {
        project: { key: projectKey },
        parent: { key: req.params.issueKey },
        summary,
        issuetype: { name: 'Subtask' },
        priority: { name: priority || 'Medium' },
      },
    };
    if (description) body.fields.description = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] };
    if (assignee) body.fields.assignee = { accountId: assignee };
    const r = await jira().post('/issue', body);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// ─── CONFLUENCE CLIENT ────────────────────────────────────────────────────────
const confluence = () => axios.create({
  baseURL: `${JIRA_BASE}/wiki/api/v2`,
  headers: {
    Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Get all Confluence spaces
app.get('/api/confluence/spaces', async (req, res) => {
  try {
    const r = await confluence().get('/spaces?limit=50');
    res.json(r.data.results || []);
  } catch (err) { handleError(res, err); }
});

// Get pages in a space
app.get('/api/confluence/spaces/:spaceId/pages', async (req, res) => {
  try {
    const r = await confluence().get(`/spaces/${req.params.spaceId}/pages?limit=50&sort=-created-date`);
    res.json(r.data.results || []);
  } catch (err) { handleError(res, err); }
});

// Get all pages (recent)
app.get('/api/confluence/pages', async (req, res) => {
  try {
    const r = await confluence().get('/pages?limit=30&sort=-created-date');
    res.json(r.data.results || []);
  } catch (err) { handleError(res, err); }
});

// Get single page with body
app.get('/api/confluence/pages/:pageId', async (req, res) => {
  try {
    const r = await confluence().get(`/pages/${req.params.pageId}?body-format=storage`);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// Create a page
app.post('/api/confluence/pages', async (req, res) => {
  try {
    const { spaceId, title, body, parentId } = req.body;
    const payload = {
      spaceId,
      title,
      body: { representation: 'storage', value: body || `<p>${title}</p>` },
    };
    if (parentId) payload.parentId = parentId;
    const r = await confluence().post('/pages', payload);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// Update a page
app.put('/api/confluence/pages/:pageId', async (req, res) => {
  try {
    const { title, body, version } = req.body;
    const r = await confluence().put(`/pages/${req.params.pageId}`, {
      id: req.params.pageId,
      title,
      version: { number: version },
      body: { representation: 'storage', value: body },
    });
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// Delete a page
app.delete('/api/confluence/pages/:pageId', async (req, res) => {
  try {
    await confluence().delete(`/pages/${req.params.pageId}`);
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// Create sprint report page in Confluence
app.post('/api/confluence/sprint-report', async (req, res) => {
  try {
    const { spaceId, sprintName, projectKey, issues, completionRate, totalIssues, doneIssues } = req.body;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const issueRows = (issues || []).map(i =>
      `<tr><td>${i.key}</td><td>${i.summary}</td><td>${i.status}</td><td>${i.priority}</td><td>${i.assignee || '—'}</td></tr>`
    ).join('');

    const htmlBody = `
<h2>Sprint Report — ${sprintName}</h2>
<p><strong>Project:</strong> ${projectKey} | <strong>Generated:</strong> ${date}</p>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Total Issues</td><td>${totalIssues}</td></tr>
  <tr><td>Done</td><td>${doneIssues}</td></tr>
  <tr><td>Completion Rate</td><td>${completionRate}%</td></tr>
</table>
<h3>Issues</h3>
<table>
  <tr><th>Key</th><th>Summary</th><th>Status</th><th>Priority</th><th>Assignee</th></tr>
  ${issueRows}
</table>
<p><em>Auto-generated by APNILEAP Governance OS</em></p>`;

    const payload = {
      spaceId,
      title: `Sprint Report: ${sprintName} — ${date}`,
      body: { representation: 'storage', value: htmlBody },
    };
    const r = await confluence().post('/pages', payload);
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// Create meeting notes page
app.post('/api/confluence/meeting-notes', async (req, res) => {
  try {
    const { spaceId, title, attendees, agenda, notes, decisions, actionItems } = req.body;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const actionRows = (actionItems || []).map(a =>
      `<tr><td>${a.action}</td><td>${a.owner || '—'}</td><td>${a.dueDate || '—'}</td></tr>`
    ).join('');

    const htmlBody = `
<h2>${title || 'Meeting Notes'}</h2>
<p><strong>Date:</strong> ${date}</p>
<p><strong>Attendees:</strong> ${(attendees || []).join(', ') || '—'}</p>
<h3>Agenda</h3><p>${agenda || '—'}</p>
<h3>Notes</h3><p>${notes || '—'}</p>
<h3>Decisions Made</h3><p>${decisions || '—'}</p>
<h3>Action Items</h3>
<table>
  <tr><th>Action</th><th>Owner</th><th>Due Date</th></tr>
  ${actionRows}
</table>
<p><em>Auto-generated by APNILEAP Governance OS</em></p>`;

    const r = await confluence().post('/pages', {
      spaceId,
      title: `${title || 'Meeting Notes'} — ${date}`,
      body: { representation: 'storage', value: htmlBody },
    });
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// ─── AUTOMATION: Sprint close detection + AI summary pushed to Confluence ─────
app.post('/api/automation/sprint-close', async (req, res) => {
  try {
    const { sprintId, sprintName, boardId, spaceId } = req.body;

    // 1. Get all sprint issues
    const r = await agile().get(`/sprint/${sprintId}/issue?maxResults=200&fields=summary,status,priority,assignee`);
    const issues = r.data.issues || [];
    const done = issues.filter(i => i.fields?.status?.name === 'Done').length;
    const total = issues.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // 2. Generate AI summary if Gemini key available
    let aiSummary = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        const issueList = issues.slice(0, 15).map(i => `${i.key}: ${i.fields?.summary} [${i.fields?.status?.name}]`).join('\n');
        const prompt = `Write a concise sprint completion report for "${sprintName}". Total: ${total}, Done: ${done}, Completion: ${completionRate}%.\n\nIssues:\n${issueList}\n\nInclude: summary, wins, risks, recommendations. Keep it under 200 words.`;
        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 500 } }
        );
        aiSummary = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e) { console.error('[Sprint Close AI] Error:', e.message); }
    }

    // 3. Push to Confluence if spaceId given
    let confluencePage = null;
    if (spaceId) {
      const issueRows = issues.map(i =>
        `<tr><td>${i.key}</td><td>${i.fields?.summary}</td><td>${i.fields?.status?.name}</td><td>${i.fields?.priority?.name || '—'}</td><td>${i.fields?.assignee?.displayName || '—'}</td></tr>`
      ).join('');
      const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const htmlBody = `
<h2>Sprint Completion Report: ${sprintName}</h2>
<p><strong>Date:</strong> ${date} | <strong>Completion:</strong> ${completionRate}% (${done}/${total})</p>
${aiSummary ? `<h3>AI Summary</h3><p>${aiSummary.replace(/\n/g, '<br/>')}</p>` : ''}
<h3>All Issues</h3>
<table><tr><th>Key</th><th>Summary</th><th>Status</th><th>Priority</th><th>Assignee</th></tr>${issueRows}</table>
<p><em>Auto-generated by APNILEAP Governance OS</em></p>`;
      try {
        const cp = await confluence().post('/pages', {
          spaceId,
          title: `Sprint Report: ${sprintName} — ${date}`,
          body: { representation: 'storage', value: htmlBody },
        });
        confluencePage = { id: cp.data.id, title: cp.data.title, url: `${JIRA_BASE}/wiki${cp.data._links?.webui || ''}` };
      } catch (e) { console.error('[Sprint Close Confluence] Error:', e.message); }
    }

    // 4. Add comment to all sprint issues
    const commentText = `✅ Sprint "${sprintName}" completed with ${completionRate}% completion rate (${done}/${total} issues done).${aiSummary ? '\n\nAI Summary: ' + aiSummary.substring(0, 200) + '...' : ''}\n\n— APNILEAP Governance OS`;
    let commented = 0;
    for (const issue of issues.slice(0, 20)) {
      try {
        await jira().post(`/issue/${issue.key}/comment`, {
          body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: commentText }] }] },
        });
        commented++;
      } catch {}
    }

    res.json({ success: true, total, done, completionRate, aiSummary, confluencePage, commented });
  } catch (err) { handleError(res, err); }
});

// AI escalation: generate summary and post as comment to high-priority overdue issues
app.post('/api/automation/ai-escalation', async (req, res) => {
  try {
    const jql = `duedate < now() AND status != Done AND priority in (Highest, High) ORDER BY duedate ASC`;
    const result = await searchJQL(jql, 'summary,status,priority,assignee,duedate,description', 20);
    const issues = result.issues;

    if (issues.length === 0) return res.json({ success: true, escalated: 0, message: 'No high-priority overdue issues found.' });

    let escalated = 0;
    for (const issue of issues) {
      try {
        let comment = `🚨 APNILEAP AI Escalation Alert\n\nIssue ${issue.key} is HIGH PRIORITY and overdue since ${issue.fields?.duedate}.\n`;
        if (process.env.GEMINI_API_KEY) {
          const prompt = `Write a 2-sentence governance escalation message for Jira issue: "${issue.fields?.summary}" which is ${issue.fields?.priority?.name} priority and overdue since ${issue.fields?.duedate}. Be professional and urgent.`;
          const gr = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 150 } }
          );
          comment = gr.data?.candidates?.[0]?.content?.parts?.[0]?.text || comment;
        }
        await jira().post(`/issue/${issue.key}/comment`, {
          body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }] },
        });
        escalated++;
      } catch {}
    }
    res.json({ success: true, escalated, total: issues.length, issues: issues.map(i => ({ key: i.key, summary: i.fields?.summary })) });
  } catch (err) { handleError(res, err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ASSIGNMENT SYSTEM — Institution assigns work to colleges (spokes)
// Uses Jira Epics as "Work Packages" with labels to track assignment
// ═══════════════════════════════════════════════════════════════════════════════

// Get all work packages (Epics labeled as work assignments)
app.get('/api/workassign/packages', async (req, res) => {
  try {
    const keys = await getAllProjectKeys();
    if (!keys.length) return res.json([]);
    const jql = `issuetype = Epic ORDER BY created DESC`;
    const result = await searchJQL(jql, 'summary,status,assignee,priority,labels,duedate,description,project,comment', 200);
    const packages = result.issues.map(i => {
      const labels = i.fields?.labels || [];
      const assignedTo = labels.find(l => l.startsWith('assigned-to:'))?.replace('assigned-to:', '') || null;
      const workType = labels.find(l => l.startsWith('work-type:'))?.replace('work-type:', '') || 'General';
      const approved = labels.includes('apnileap-approved');
      const rejected = labels.includes('apnileap-rejected');
      const submitted = labels.includes('apnileap-submitted');
      return { ...i, assignedTo, workType, approved, rejected, submitted };
    });
    res.json(packages);
  } catch (err) { handleError(res, err); }
});

// Create a work package (Epic) and assign to a spoke
app.post('/api/workassign/packages', async (req, res) => {
  try {
    const { projectKey, title, description, assignToSpoke, workType, dueDate, priority } = req.body;
    const labels = ['apnileap-work-package'];
    if (assignToSpoke) labels.push(`assigned-to:${assignToSpoke}`);
    if (workType) labels.push(`work-type:${workType}`);

    const body = {
      fields: {
        project: { key: projectKey },
        summary: title,
        issuetype: { name: 'Epic' },
        priority: { name: priority || 'Medium' },
        labels,
      },
    };
    if (description) body.fields.description = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] };
    if (dueDate) body.fields.duedate = dueDate;

    const r = await jira().post('/issue', body);

    // Add assignment comment
    if (assignToSpoke) {
      await jira().post(`/issue/${r.data.key}/comment`, {
        body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: `📋 APNILEAP Work Assignment\n\nThis work package has been assigned to: ${assignToSpoke}\nWork Type: ${workType || 'General'}\nDue: ${dueDate || 'Not set'}\n\nPlease acknowledge receipt and begin planning.` }] }] },
      });
    }
    res.json(r.data);
  } catch (err) { handleError(res, err); }
});

// Assign/reassign a work package to a spoke
app.put('/api/workassign/packages/:issueKey/assign', async (req, res) => {
  try {
    const { spokeKey, assigneeId } = req.body;
    const issue = await jira().get(`/issue/${req.params.issueKey}?fields=labels,summary`);
    const labels = (issue.data.fields?.labels || [])
      .filter(l => !l.startsWith('assigned-to:'));
    if (spokeKey) labels.push(`assigned-to:${spokeKey}`);

    await jira().put(`/issue/${req.params.issueKey}`, { fields: { labels, ...(assigneeId ? { assignee: { accountId: assigneeId } } : {}) } });

    await jira().post(`/issue/${req.params.issueKey}/comment`, {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: `🔄 APNILEAP: Work package reassigned to ${spokeKey}. Please review and begin work.` }] }] },
    });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// Submit work for approval (college submits)
app.post('/api/workassign/packages/:issueKey/submit', async (req, res) => {
  try {
    const { notes } = req.body;
    const issue = await jira().get(`/issue/${req.params.issueKey}?fields=labels`);
    const labels = (issue.data.fields?.labels || [])
      .filter(l => l !== 'apnileap-approved' && l !== 'apnileap-rejected');
    if (!labels.includes('apnileap-submitted')) labels.push('apnileap-submitted');

    await jira().put(`/issue/${req.params.issueKey}`, { fields: { labels } });
    await jira().post(`/issue/${req.params.issueKey}/comment`, {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: `📤 Work submitted for approval by college.\n\n${notes ? 'Notes: ' + notes : ''}\n\nAwaiting APNILEAP moderation review.` }] }] },
    });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// Approve a work package
app.post('/api/workassign/packages/:issueKey/approve', async (req, res) => {
  try {
    const { feedback } = req.body;
    const issue = await jira().get(`/issue/${req.params.issueKey}?fields=labels`);
    const labels = (issue.data.fields?.labels || [])
      .filter(l => l !== 'apnileap-rejected' && l !== 'apnileap-submitted');
    if (!labels.includes('apnileap-approved')) labels.push('apnileap-approved');

    await jira().put(`/issue/${req.params.issueKey}`, { fields: { labels } });
    await jira().post(`/issue/${req.params.issueKey}/comment`, {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: `✅ APNILEAP APPROVED\n\nThis work package has been reviewed and approved by the moderator.\n\n${feedback ? 'Feedback: ' + feedback : 'No additional feedback.'}\n\n— APNILEAP Governance OS` }] }] },
    });

    // Transition to Done if possible
    try {
      const trans = await jira().get(`/issue/${req.params.issueKey}/transitions`);
      const done = trans.data.transitions?.find(t => t.to?.name === 'Done' || t.name?.toLowerCase().includes('done'));
      if (done) await jira().post(`/issue/${req.params.issueKey}/transitions`, { transition: { id: done.id } });
    } catch {}

    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// Reject a work package
app.post('/api/workassign/packages/:issueKey/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const issue = await jira().get(`/issue/${req.params.issueKey}?fields=labels`);
    const labels = (issue.data.fields?.labels || [])
      .filter(l => l !== 'apnileap-approved' && l !== 'apnileap-submitted');
    if (!labels.includes('apnileap-rejected')) labels.push('apnileap-rejected');

    await jira().put(`/issue/${req.params.issueKey}`, { fields: { labels } });
    await jira().post(`/issue/${req.params.issueKey}/comment`, {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: `❌ APNILEAP REJECTED\n\nThis work package has been reviewed and requires revision.\n\nReason: ${reason || 'Not specified'}\n\nPlease revise and resubmit.\n\n— APNILEAP Governance OS` }] }] },
    });
    res.json({ success: true });
  } catch (err) { handleError(res, err); }
});

// Work assignment stats
app.get('/api/workassign/stats', async (req, res) => {
  try {
    const jql = `issuetype = Epic ORDER BY created DESC`;
    const result = await searchJQL(jql, 'labels,status,project', 500);
    const issues = result.issues || [];
    const stats = { total: issues.length, assigned: 0, submitted: 0, approved: 0, rejected: 0, unassigned: 0, bySpoke: {} };
    issues.forEach(i => {
      const labels = i.fields?.labels || [];
      const spoke = labels.find(l => l.startsWith('assigned-to:'))?.replace('assigned-to:', '');
      if (spoke) { stats.assigned++; stats.bySpoke[spoke] = (stats.bySpoke[spoke] || 0) + 1; }
      else stats.unassigned++;
      if (labels.includes('apnileap-submitted')) stats.submitted++;
      if (labels.includes('apnileap-approved')) stats.approved++;
      if (labels.includes('apnileap-rejected')) stats.rejected++;
    });
    res.json(stats);
  } catch (err) { handleError(res, err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CENTER — track mentions, alerts, governance events
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/notifications', async (req, res) => {
  try {
    const jql = `comment ~ "APNILEAP" AND updated >= -7d ORDER BY updated DESC`;
    const result = await searchJQL(jql, 'summary,status,updated,comment,project', 30);
    const notifications = (result.issues || []).map(i => {
      const comments = i.fields?.comment?.comments || [];
      const apniComments = comments.filter(c => adfTextContains(c.body, 'APNILEAP'));
      return apniComments.map(c => ({
        id: `${i.key}-${c.id}`,
        issueKey: i.key,
        issueSummary: i.fields?.summary,
        project: i.fields?.project?.key,
        type: getNotifType(c.body),
        author: c.author?.displayName,
        created: c.created,
        preview: adfToPlainText(c.body).substring(0, 100),
      }));
    }).flat().sort((a,b) => new Date(b.created) - new Date(a.created));
    res.json(notifications);
  } catch (err) { handleError(res, err); }
});

const adfToPlainText = (adf) => {
  if (!adf || typeof adf === 'string') return adf || '';
  const walk = (n) => { if (!n) return ''; if (n.type==='text') return n.text||''; if (n.content) return n.content.map(walk).join(''); return ''; };
  return walk(adf);
};
const adfTextContains = (adf, text) => adfToPlainText(adf).includes(text);
const getNotifType = (body) => {
  const t = adfToPlainText(body);
  if (t.includes('APPROVED')) return 'approved';
  if (t.includes('REJECTED')) return 'rejected';
  if (t.includes('submitted')) return 'submitted';
  if (t.includes('Escalation')) return 'escalation';
  if (t.includes('overdue') || t.includes('Alert')) return 'alert';
  if (t.includes('assigned')) return 'assigned';
  return 'info';
};

// ═══════════════════════════════════════════════════════════════════════════════
// RISK REGISTER — dedicated risk tracking across all projects
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/risks', async (req, res) => {
  try {
    const keys = await getAllProjectKeys();
    if (!keys.length) return res.json({ risks: [], total: 0 });
    const jql = `issuetype in (Risk, Bug) ORDER BY priority DESC, created DESC`;
    const result = await searchJQL(jql, 'summary,status,priority,assignee,labels,duedate,description,project,created', 200);
    res.json({ risks: result.issues || [], total: result.total });
  } catch (err) { handleError(res, err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE PERSISTENCE — save roles to a JSON file on server
// ═══════════════════════════════════════════════════════════════════════════════
const ROLES_FILE = './roles.json';

app.get('/api/roles', (req, res) => {
  try {
    if (fs.existsSync(ROLES_FILE)) res.json(JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8')));
    else res.json({});
  } catch { res.json({}); }
});

app.post('/api/roles', (req, res) => {
  try {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Could not save roles' }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEADLINES / MILESTONES TRACKER
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/milestones', async (req, res) => {
  try {
    const jql = `issuetype in (Milestone, Epic) AND duedate is not EMPTY ORDER BY duedate ASC`;
    const result = await searchJQL(jql, 'summary,status,priority,duedate,assignee,project,labels', 100);
    const today = new Date();
    const milestones = (result.issues || []).map(i => {
      const due = new Date(i.fields.duedate);
      const daysLeft = Math.ceil((due - today) / 86400000);
      return { ...i, daysLeft, overdue: daysLeft < 0 && i.fields.status?.name !== 'Done', urgent: daysLeft >= 0 && daysLeft <= 7 };
    });
    res.json(milestones);
  } catch (err) { handleError(res, err); }
});

// ─── CRON: daily overdue check ────────────────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Running overdue check...');
  try {
    const jql = `duedate < now() AND status != Done ORDER BY duedate ASC`;
    const result = await searchJQL(jql, 'summary', 50);
    for (const issue of result.issues) {
      await jira().post(`/issue/${issue.key}/comment`, {
        body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: `⚠️ APNILEAP Governance Alert: This issue is overdue. Please update the status or escalate.` }] }] },
      });
    }
    console.log(`[CRON] Flagged ${result.issues.length} overdue issues.`);
  } catch (e) { console.error('[CRON] Error:', e.message); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 APNILEAP Backend running on port ${PORT}`);
  console.log(`   Jira: ${JIRA_BASE}`);
  console.log(`   AI:   ${process.env.GEMINI_API_KEY ? '✓ Gemini key set' : '✗ no key (add GEMINI_API_KEY to .env)'}`);
});
