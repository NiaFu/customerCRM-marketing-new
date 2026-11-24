import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { api, clearLogin, del, patch, post, put, setLogin } from './api'
import {
  STAGES, emptyCustomer,
  type Activity, type Customer, type CustomerDraft, type Deal, type Session, type Sms, type Tag
} from './types'

type Page = 'dashboard' | 'customers' | 'pipeline' | 'tags'
const nav: { id: Page; label: string; symbol: string }[] = [
  { id: 'dashboard', label: 'Overview', symbol: '◫' },
  { id: 'customers', label: 'Customers', symbol: '♧' },
  { id: 'pipeline', label: 'Sales pipeline', symbol: '▥' },
  { id: 'tags', label: 'Customer tags', symbol: '◇' },
]

const currency = (value: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value)
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const getError = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong'
function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  return <div className="modal-shade" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Close">×</button></div>
      {children}
    </section>
  </div>
}

function CustomerFields({ draft, onChange }: {
  draft: CustomerDraft; onChange: (draft: CustomerDraft) => void
}) {
  const field = (key: keyof CustomerDraft, value: string | boolean) => onChange({ ...draft, [key]: value })
  return <div className="form-grid">
    <label>Full name *<input required maxLength={160} value={draft.name} onChange={e => field('name', e.target.value)} placeholder="e.g. Alex Morgan" /></label>
    <label>Phone *<input required type="tel" value={draft.phone} onChange={e => field('phone', e.target.value)} placeholder="04xx xxx xxx or +61..." /></label>
    <label>Email<input type="email" value={draft.email} onChange={e => field('email', e.target.value)} placeholder="name@example.com" /></label>
    <label>Customer source<input value={draft.source} onChange={e => field('source', e.target.value)} placeholder="Showroom / website / referral" /></label>
    <label>Showroom<input value={draft.location} onChange={e => field('location', e.target.value)} placeholder="Chatswood / Alexandria" /></label>
    <label className="full">Notes<textarea rows={3} maxLength={3000} value={draft.notes} onChange={e => field('notes', e.target.value)} placeholder="What matters to the customer?" /></label>
    <div className="full consent-panel">
      <label className="check-line"><input type="checkbox" checked={draft.marketingConsent} disabled={draft.optedOut} onChange={e => field('marketingConsent', e.target.checked)} /> Marketing SMS consent explicitly confirmed</label>
      {draft.marketingConsent && <label>Consent source *<input required maxLength={140} value={draft.consentSource} onChange={e => field('consentSource', e.target.value)} placeholder="e.g. showroom opt-in form, 24 Nov 2026" /></label>}
      <label className="check-line"><input type="checkbox" checked={draft.optedOut} onChange={e => onChange({ ...draft, optedOut: e.target.checked, marketingConsent: e.target.checked ? false : draft.marketingConsent })} /> Customer opted out of marketing</label>
      <small>Only mark consent if there is genuine evidence. Do not infer consent from a purchase or visit.</small>
    </div>
  </div>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [page, setPage] = useState<Page>('dashboard')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [messages, setMessages] = useState<Sms[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [editor, setEditor] = useState<{ id: number | null; draft: CustomerDraft } | null>(null)
  const [newDealOpen, setNewDealOpen] = useState(false)
  const [dealDraft, setDealDraft] = useState({ customerId: '', product: '', amount: '', followUpAt: '', notes: '' })
  const [newTag, setNewTag] = useState('')
  const [newTagColor, setNewTagColor] = useState('#2563eb')
  const [note, setNote] = useState('')
  const [smsBody, setSmsBody] = useState('')
  const [smsPurpose, setSmsPurpose] = useState<'MARKETING' | 'SERVICE'>('MARKETING')
  const [smsRequestId, setSmsRequestId] = useState(crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const selected = customers.find(c => c.id === selectedId) || null
  const filtered = useMemo(() => customers.filter(c =>
    (tagFilter === 'all' || c.tags.some(t => String(t.id) === tagFilter)) &&
    (!search.trim() || [c.name, c.phone, c.email, c.source, c.location]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase().trim())))
  ), [customers, search, tagFilter])

  const wonTotal = deals.filter(d => d.stage === 'WON').reduce((sum, d) => sum + (d.amount || 0), 0)
  const openDeals = deals.filter(d => !['WON', 'LOST'].includes(d.stage))

  async function reload() {
    const [c, t, d] = await Promise.all([
      api<Customer[]>('/customers'), api<Tag[]>('/tags'), api<Deal[]>('/deals')
    ])
    setCustomers(c); setTags(t); setDeals(d)
  }

  async function loadCustomerInfo(id: number) {
    const [a, m] = await Promise.all([
      api<Activity[]>('/customers/' + id + '/activities'),
      api<Sms[]>('/customers/' + id + '/sms')
    ])
    setActivities(a); setMessages(m)
  }

  useEffect(() => {
    if (!session) return
    void reload().catch(e => setFeedback(getError(e)))
  }, [session])

  useEffect(() => {
    if (selectedId === null || !session) return
    void loadCustomerInfo(selectedId).catch(e => setFeedback(getError(e)))
  }, [selectedId, session])

  async function run(action: () => Promise<void>) {
    setFeedback(''); setBusy(true)
    try { await action() } catch (error) { setFeedback(getError(error)) }
    finally { setBusy(false) }
  }

  function notify(text: string) { setFeedback(text) }

  async function signIn(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      setLogin(username.trim(), password)
      try {
        const result = await api<Session>('/me')
        setSession(result); setPassword('')
      } catch (e) { clearLogin(); throw e }
    })
  }

  function signOut() {
    clearLogin(); setSession(null); setSelectedId(null); setCustomers([]); setDeals([]); setTags([])
    setFeedback(''); setPassword(''); setPage('dashboard')
  }

  function openCustomerEditor(customer?: Customer) {
    const draft = customer
      ? {
          name: customer.name, phone: customer.phone, email: customer.email || '',
          source: customer.source || '', location: customer.location || '',
          notes: customer.notes || '', marketingConsent: customer.marketingConsent,
          consentSource: customer.consentSource || '', optedOut: customer.optedOut
        }
      : { ...emptyCustomer }
    setEditor({ id: customer?.id || null, draft })
  }

  async function saveCustomer(e: FormEvent) {
    e.preventDefault()
    if (!editor) return
    await run(async () => {
      const customer = editor.id
        ? await put<Customer>('/customers/' + editor.id, editor.draft)
        : await post<Customer>('/customers', editor.draft)
      setEditor(null); await reload(); setSelectedId(customer.id); setPage('customers')
      notify(editor.id ? 'Customer updated' : 'Customer created')
    })
  }

  async function createTag(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      await post<Tag>('/tags', { name: newTag.trim(), color: newTagColor })
      setNewTag(''); await reload(); notify('Tag created')
    })
  }

  async function removeTag(id: number) {
    if (!window.confirm('Delete this tag from all customers?')) return
    await run(async () => { await del('/tags/' + id); await reload(); notify('Tag deleted') })
  }

  async function tagCustomer(tagId: number, adding: boolean) {
    if (!selected) return
    await run(async () => {
      const path = '/customers/' + selected.id + '/tags/' + tagId
      if (adding) await post<Customer>(path, {})
      else await del(path)
      await reload()
    })
  }

  async function createDeal(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      await post<Deal>('/deals', {
        customerId: Number(dealDraft.customerId), product: dealDraft.product,
        stage: 'NEW', amount: dealDraft.amount ? Number(dealDraft.amount) : null,
        followUpAt: dealDraft.followUpAt || null, notes: dealDraft.notes
      })
      setNewDealOpen(false)
      setDealDraft({ customerId: '', product: '', amount: '', followUpAt: '', notes: '' })
      await reload(); notify('Deal created')
    })
  }

  async function moveDeal(id: number, stage: string) {
    await run(async () => { await patch<Deal>('/deals/' + id + '/stage', { stage }); await reload() })
  }

  async function addNote(e: FormEvent) {
    e.preventDefault()
    if (!selected || !note.trim()) return
    await run(async () => {
      await post<Activity>('/customers/' + selected.id + '/activities', { body: note.trim() })
      setNote(''); await loadCustomerInfo(selected.id); notify('Note saved')
    })
  }

  async function sendSms(e: FormEvent) {
    e.preventDefault()
    if (!selected || !smsBody.trim()) return
    if (smsPurpose === 'MARKETING' && (!selected.marketingConsent || selected.optedOut)) {
      notify('Marketing message blocked: explicit consent is required and opt-outs must be honoured.')
      return
    }
    const verb = session?.smsMode === 'preview' ? 'Record a preview (NOT sent)' : 'Send a real SMS'
    if (!window.confirm(verb + ' to ' + selected.name + ' (' + selected.phone + ')?\n\n' + smsBody)) return
    await run(async () => {
      const result = await post<Sms>('/sms/send', {
        customerId: selected.id, body: smsBody.trim(), purpose: smsPurpose,
        requestId: smsRequestId, confirmed: true
      })
      await loadCustomerInfo(selected.id)
      if (['PREVIEW', 'QUEUED'].includes(result.status)) {
        setSmsBody(''); setSmsRequestId(crypto.randomUUID())
      }
      notify(result.status === 'PREVIEW' ? 'Preview saved — no SMS was sent' :
        result.status === 'QUEUED' ? 'Accepted by ClickSend for queueing; not yet delivered' :
        'Status: ' + result.status + '. ' + (result.errorMessage || 'Review the record before retrying.'))
    })
  }

  if (!session) return <main className="login-screen">
    <div className="login-art">
      <div className="brand-icon">S</div>
      <h1>Build lasting<br /><em>customer relationships.</em></h1>
      <p>A focused workspace for customer records, sales opportunities, follow-ups and messaging.</p>
      <div className="login-pill">SYMPHORA · CRM</div>
    </div>
    <form className="login-card" onSubmit={signIn}>
      <div className="login-logo">S</div>
      <h2>Welcome back</h2>
      <p>Sign in to your CRM workspace.</p>
      <label>Username<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {feedback && <div className="alert error">{feedback}</div>}
      <button className="primary-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to CRM →'}</button>
      <small>Private workspace. Never store customer data in a public GitHub repository.</small>
    </form>
  </main>

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon small">S</span><span><strong>SYMPHORA</strong><small>Customer CRM</small></span></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>
        {nav.map(item => <button key={item.id} onClick={() => setPage(item.id)}
          className={'nav-button ' + (page === item.id ? 'active' : '')}>
          <span className="nav-symbol">{item.symbol}</span>{item.label}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="side-mode"><span className={'mode-dot ' + (session.smsMode === 'preview' ? 'orange' : '')} />
          SMS: {session.smsMode === 'preview' ? 'Preview only' : 'Live provider'}</div>
        <button className="nav-button" onClick={signOut}><span className="nav-symbol">↪</span>Sign out</button>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><span>Workspace <span className="crumb">/ {nav.find(n => n.id === page)?.label}</span></span>
        <div className="topbar-user"><span className="user-avatar">{session.username.slice(0, 1).toUpperCase()}</span>{session.username}</div>
      </header>
      <main className="content">
        {feedback && <div className="alert" role="status"><span>{feedback}</span><button onClick={() => setFeedback('')} aria-label="Dismiss">×</button></div>}

        {page === 'dashboard' && <>
          <div className="page-header">
            <div><div className="eyebrow">YOUR WORKSPACE</div><h1>Overview</h1>
              <p>A clear picture of your customers and sales progress.</p></div>
            <button className="primary-btn" onClick={() => openCustomerEditor()}>+ Add customer</button>
          </div>
          <div className="stat-grid">
            <div className="stat"><small>Total customers</small><strong>{customers.length}</strong><span>In customer database</span></div>
            <div className="stat"><small>Open opportunities</small><strong>{openDeals.length}</strong><span>Across your pipeline</span></div>
            <div className="stat"><small>Deals won</small><strong>{deals.filter(d => d.stage === 'WON').length}</strong><span>Marked as completed</span></div>
            <div className="stat"><small>Won value</small><strong>{currency(wonTotal)}</strong><span>Sum of won opportunities</span></div>
          </div>
          <div className="two-columns">
            <section className="panel">
              <div className="panel-heading"><h2>Recent customers</h2><button className="text-button" onClick={() => setPage('customers')}>View all →</button></div>
              {customers.length === 0 ? <div className="empty">No customers yet. Add your first test contact.</div> :
                customers.slice(0, 6).map(c => <button className="list-person" key={c.id}
                  onClick={() => { setSelectedId(c.id); setPage('customers') }}>
                  <span className="avatar">{c.name.charAt(0).toUpperCase()}</span>
                  <span><strong>{c.name}</strong><small>{c.phone}</small></span><span className="row-arrow">→</span>
                </button>)}
            </section>
            <section className="panel">
              <div className="panel-heading"><h2>Next follow-ups</h2><button className="text-button" onClick={() => setPage('pipeline')}>Pipeline →</button></div>
              {openDeals.filter(d => d.followUpAt).length === 0 ? <div className="empty">No follow-up dates have been added yet.</div> :
                [...openDeals].filter(d => d.followUpAt).sort((a, b) => (a.followUpAt || '').localeCompare(b.followUpAt || '')).slice(0, 6)
                  .map(d => <div key={d.id} className="followup-row"><span><strong>{d.customerName}</strong><small>{d.product}</small></span>
                    <span className="date-chip">{date(d.followUpAt)}</span></div>)}
            </section>
          </div>
          <div className="hint">Tip: Add a customer, assign a tag, create an opportunity, and try an SMS preview to complete the first workflow.</div>
        </>}

        {page === 'customers' && <>
          <div className="page-header"><div><div className="eyebrow">YOUR CONTACTS</div><h1>Customers</h1>
            <p>Keep contact information, preferences and communication history together.</p></div>
            <button className="primary-btn" onClick={() => openCustomerEditor()}>+ Add customer</button>
          </div>
          <div className="workspace-columns">
            <section className="panel customer-list">
              <div className="filter-row">
                <input aria-label="Search customers" placeholder="Search name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
                <select aria-label="Filter by tag" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
                  <option value="all">All tags</option>{tags.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="list-caption">{filtered.length} customer{filtered.length === 1 ? '' : 's'} shown</div>
              {filtered.length === 0 ? <div className="empty">No matching customers.</div> :
                filtered.map(c => <button key={c.id} className={'customer-row ' + (selectedId === c.id ? 'selected' : '')}
                  onClick={() => setSelectedId(c.id)}>
                  <span className="avatar">{c.name.charAt(0).toUpperCase()}</span>
                  <span className="row-info"><strong>{c.name}</strong><small>{c.phone} · {c.location || 'No showroom'}</small>
                    <span className="tiny-tags">{c.tags.slice(0, 2).map(t => <span key={t.id} className="tag-mini" style={{ borderColor: t.color }}>{t.name}</span>)}</span>
                  </span><span className="row-arrow">›</span>
                </button>)}
            </section>
            <section className="panel detail-panel">
              {!selected ? <div className="detail-empty"><div className="empty-illustration">♧</div><h2>Select a customer</h2>
                <p>See contact details, assign tags, track notes and send one-to-one SMS.</p></div> : <>
                <div className="detail-head">
                  <div className="avatar large">{selected.name.charAt(0).toUpperCase()}</div>
                  <div className="detail-title"><h2>{selected.name}</h2><span>{selected.location || 'No showroom'} · Added {date(selected.createdAt)}</span></div>
                  <button className="outline-btn small-btn" onClick={() => openCustomerEditor(selected)}>Edit</button>
                </div>
                <div className="contact-grid">
                  <div><small>PHONE</small><strong>{selected.phone}</strong></div>
                  <div><small>EMAIL</small><strong>{selected.email || 'Not provided'}</strong></div>
                  <div><small>SOURCE</small><strong>{selected.source || 'Not specified'}</strong></div>
                  <div><small>MARKETING SMS</small><strong className={selected.marketingConsent && !selected.optedOut ? 'positive' : 'warning'}>
                    {selected.optedOut ? 'Opted out' : selected.marketingConsent ? 'Consented' : 'No consent'}</strong></div>
                </div>
                {selected.notes && <div className="plain-notes"><strong>Customer notes</strong><p>{selected.notes}</p></div>}
                <div className="section-heading"><h3>Customer tags</h3><span>{selected.tags.length}</span></div>
                <div className="tag-wrap">
                  {tags.map(t => {
                    const added = selected.tags.some(x => x.id === t.id)
                    return <button key={t.id} disabled={busy} className={'tag-pill ' + (added ? 'chosen' : '')}
                      onClick={() => void tagCustomer(t.id, !added)} style={{ borderColor: t.color }}>
                      <span style={{ background: t.color }} className="tag-dot" />{t.name}{added ? ' ×' : ' +'}
                    </button>
                  })}
                  {tags.length === 0 && <small>No tags created yet.</small>}
                </div>
                <div className="detail-divider" />
                <div className="section-heading"><h3>Activity notes</h3></div>
                <form className="inline-form" onSubmit={addNote}>
                  <input value={note} maxLength={2000} onChange={e => setNote(e.target.value)}
                    placeholder="Add a follow-up note…" aria-label="Activity note" />
                  <button className="outline-btn" disabled={!note.trim() || busy}>Add note</button>
                </form>
                <div className="history">{activities.length === 0 ? <p className="muted">No notes yet.</p> :
                  activities.map(a => <div className="history-item" key={a.id}><div>{a.body}</div><small>{date(a.createdAt)}</small></div>)}</div>
                <div className="detail-divider" />
                <div className="section-heading"><h3>Manual SMS</h3><span className={'status ' + (session.smsMode === 'preview' ? 'preview' : 'queued')}>{session.smsMode === 'preview' ? 'Preview only' : 'Live SMS'}</span></div>
                <form onSubmit={sendSms} className="sms-form">
                  <label>Message purpose<select value={smsPurpose} onChange={e => setSmsPurpose(e.target.value as 'MARKETING' | 'SERVICE')}>
                    <option value="MARKETING">Marketing / sales follow-up</option><option value="SERVICE">Genuine service / delivery notification</option>
                  </select></label>
                  {smsPurpose === 'MARKETING' && (!selected.marketingConsent || selected.optedOut) && <div className="inline-warning">Marketing SMS blocked until genuine consent is recorded and any opt-out is resolved.</div>}
                  <textarea value={smsBody} maxLength={800} onChange={e => { setSmsBody(e.target.value); setSmsRequestId(crypto.randomUUID()) }}
                    rows={4} placeholder="Hi, thanks for visiting our showroom…" aria-label="SMS body" />
                  <div className="sms-actions"><span>{smsBody.length}/800 characters</span>
                    <button disabled={busy || !smsBody.trim() || (smsPurpose === 'MARKETING' && (!selected.marketingConsent || selected.optedOut))}
                      className="primary-btn small-btn">{session.smsMode === 'preview' ? 'Save SMS preview' : 'Confirm & send SMS'}</button></div>
                  <small>{session.smsMode === 'preview' ? 'No message will be sent or charged in preview mode.' :
                    'ClickSend queue acceptance is not delivery confirmation. Double-check the recipient and consent.'}</small>
                </form>
                <div className="history">{messages.map(m => <div className="history-item" key={m.id}>
                  <div className="sms-history-header"><span className={'status ' + m.status.toLowerCase()}>{m.status}</span><small>{date(m.createdAt)} · {m.purpose}</small></div>
                  <p>{m.body}</p>{m.errorMessage && <small className="warning">{m.errorMessage}</small>}
                </div>)}</div>
              </>}
            </section>
          </div>
        </>}

        {page === 'pipeline' && <>
          <div className="page-header"><div><div className="eyebrow">SALES WORKFLOW</div><h1>Sales pipeline</h1>
            <p>Track each opportunity through the sales process.</p></div>
            <button className="primary-btn" onClick={() => setNewDealOpen(true)}>+ New opportunity</button>
          </div>
          <div className="pipeline-board">{STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage.id)
            return <div className="pipeline-column" key={stage.id}>
              <div className="pipeline-col-head"><h3>{stage.label}</h3><span>{stageDeals.length}</span></div>
              <div className="pipeline-col-value">{currency(stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0))}</div>
              {stageDeals.map(d => <article className="deal-card" key={d.id}>
                <div className="deal-customer">{d.customerName}</div><h4>{d.product}</h4>
                <div className="deal-amount">{d.amount === null ? 'No quote yet' : currency(d.amount)}</div>
                {d.followUpAt && <div className="deal-date">Follow-up: {date(d.followUpAt)}</div>}
                <label className="stage-control">Move to<select disabled={busy} value={d.stage} onChange={e => void moveDeal(d.id, e.target.value)}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select></label>
              </article>)}
              {stageDeals.length === 0 && <div className="column-empty">No opportunities</div>}
            </div>
          })}</div>
        </>}

        {page === 'tags' && <>
          <div className="page-header"><div><div className="eyebrow">SEGMENTATION</div><h1>Customer tags</h1>
            <p>Create reusable labels to organize customers by product, interest or lifecycle stage.</p></div></div>
          <div className="two-columns tags-columns">
            <section className="panel">
              <div className="panel-heading"><h2>Your tags</h2><span className="count-chip">{tags.length}</span></div>
              {tags.map(t => <div key={t.id} className="tag-line"><span className="tag-dot" style={{ background: t.color }} />
                <strong>{t.name}</strong><span className="tag-count">{customers.filter(c => c.tags.some(x => x.id === t.id)).length} customers</span>
                <button className="icon-button" disabled={busy} onClick={() => void removeTag(t.id)} aria-label={'Delete tag ' + t.name}>×</button></div>)}
              {tags.length === 0 && <div className="empty">Create your first tag.</div>}
            </section>
            <section className="panel">
              <div className="panel-heading"><h2>Create new tag</h2></div>
              <form onSubmit={createTag} className="tag-form">
                <label>Tag name<input required maxLength={80} value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="e.g. Interested in ROBO" /></label>
                <label>Colour<input aria-label="Tag colour" type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} /></label>
                <button className="primary-btn" disabled={busy || !newTag.trim()}>Create tag</button>
              </form>
              <p className="muted">Assign multiple tags to each customer from their detail page.</p>
            </section>
          </div>
        </>}
      </main>
    </div>

    {editor && <Modal title={editor.id ? 'Edit customer' : 'New customer'} close={() => setEditor(null)}>
      <form onSubmit={saveCustomer} className="modal-form"><CustomerFields draft={editor.draft} onChange={draft => setEditor({ ...editor, draft })} />
        <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setEditor(null)}>Cancel</button>
          <button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : editor.id ? 'Save changes' : 'Create customer'}</button></div>
      </form>
    </Modal>}

    {newDealOpen && <Modal title="New sales opportunity" close={() => setNewDealOpen(false)}>
      <form onSubmit={createDeal} className="modal-form">
        <div className="form-grid">
          <label className="full">Customer *<select required value={dealDraft.customerId} onChange={e => setDealDraft({ ...dealDraft, customerId: e.target.value })}>
            <option value="">Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
          </select></label>
          <label className="full">Product / opportunity *<input required maxLength={160} value={dealDraft.product} onChange={e => setDealDraft({ ...dealDraft, product: e.target.value })} placeholder="e.g. OGAWA ROBO" /></label>
          <label>Quote amount (AUD)<input type="number" min="0" step="0.01" value={dealDraft.amount} onChange={e => setDealDraft({ ...dealDraft, amount: e.target.value })} placeholder="5000" /></label>
          <label>Follow-up date<input type="date" value={dealDraft.followUpAt} onChange={e => setDealDraft({ ...dealDraft, followUpAt: e.target.value })} /></label>
          <label className="full">Opportunity notes<textarea rows={3} value={dealDraft.notes} onChange={e => setDealDraft({ ...dealDraft, notes: e.target.value })} placeholder="Any details about the quote…" /></label>
        </div>
        <div className="modal-actions"><button type="button" className="outline-btn" onClick={() => setNewDealOpen(false)}>Cancel</button>
          <button disabled={busy || !dealDraft.customerId} className="primary-btn">Create opportunity</button></div>
      </form>
    </Modal>}
  </div>
}
