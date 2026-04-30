import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_BASE_URL = ''

async function apiRequest(baseUrl, path, { method = 'GET', body } = {}) {
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && payload.error) ||
      `Request failed (${res.status})`
    const error = new Error(message)
    error.status = res.status
    error.payload = payload
    throw error
  }

  return payload
}

function App() {
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL,
    [],
  )

  const [healthState, setHealthState] = useState({ loading: false })
  const [dbHealthState, setDbHealthState] = useState({ loading: false })
  const [getItemState, setGetItemState] = useState({ loading: false })
  const [reserveState, setReserveState] = useState({ loading: false })

  const [itemId, setItemId] = useState('item-1')
  const [reserveItemId, setReserveItemId] = useState('item-1')
  const [quantity, setQuantity] = useState(1)

  async function runHealthCheck() {
    setHealthState({ loading: true })
    try {
      const data = await apiRequest(baseUrl, '/api/inventory/health')
      setHealthState({ loading: false, data })
    } catch (err) {
      setHealthState({ loading: false, error: err.message, details: err.payload })
    }
  }

  async function runDbHealthCheck() {
    setDbHealthState({ loading: true })
    try {
      const data = await apiRequest(baseUrl, '/api/inventory/db-health')
      setDbHealthState({ loading: false, data })
    } catch (err) {
      setDbHealthState({ loading: false, error: err.message, details: err.payload })
    }
  }

  async function runGetItem(e) {
    e.preventDefault()
    setGetItemState({ loading: true })
    try {
      const safeId = encodeURIComponent(itemId.trim())
      const data = await apiRequest(baseUrl, `/api/inventory/items/${safeId}`)
      setGetItemState({ loading: false, data })
    } catch (err) {
      setGetItemState({ loading: false, error: err.message, details: err.payload })
    }
  }

  async function runReserve(e) {
    e.preventDefault()
    setReserveState({ loading: true })
    try {
      const safeId = encodeURIComponent(reserveItemId.trim())
      const data = await apiRequest(baseUrl, `/api/inventory/items/${safeId}/reserve`, {
        method: 'POST',
        body: { quantity: Number(quantity) },
      })
      setReserveState({ loading: false, data })
    } catch (err) {
      setReserveState({ loading: false, error: err.message, details: err.payload })
    }
  }

  const apiHint = baseUrl
    ? `Using base URL: ${baseUrl}`
    : 'Using same-origin base URL ("/api/")'

  return (
    <div className="page">
      <header className="header">
        <h1>Inventory Console</h1>
        <p>
          Talks to the inventory API and its Postgres-backed item store.
        </p>
        <p className="hint">
          {apiHint}. Set <code>VITE_API_BASE_URL</code> to override.
        </p>
      </header>

      <main className="grid">
        <section className="card" aria-label="Health check">
          <h2>Health</h2>
          <p>Checks service status and the active inventory count.</p>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={runHealthCheck}
              disabled={healthState.loading}
            >
              {healthState.loading ? 'Checking…' : 'Run health check'}
            </button>
          </div>
          <ResultBox state={healthState} />
        </section>

        <section className="card" aria-label="Database health">
          <h2>Database health</h2>
          <p>Verifies the service can reach Postgres and run a query.</p>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={runDbHealthCheck}
              disabled={dbHealthState.loading}
            >
              {dbHealthState.loading ? 'Checking…' : 'Run DB check'}
            </button>
          </div>
          <ResultBox state={dbHealthState} />
        </section>

        <section className="card" aria-label="Get item">
          <h2>Get item</h2>
          <p>Fetches item details by id from Postgres when configured.</p>
          <form onSubmit={runGetItem} className="form">
            <label className="field">
              <span>Item ID</span>
              <input
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="item-1"
                autoComplete="off"
              />
            </label>
            <button type="submit" className="btn" disabled={getItemState.loading}>
              {getItemState.loading ? 'Loading…' : 'Fetch item'}
            </button>
          </form>
          <ResultBox state={getItemState} />
        </section>

        <section className="card" aria-label="Reserve stock">
          <h2>Reserve stock</h2>
          <p>Reserves stock transactionally in Postgres if available.</p>
          <form onSubmit={runReserve} className="form">
            <label className="field">
              <span>Item ID</span>
              <input
                value={reserveItemId}
                onChange={(e) => setReserveItemId(e.target.value)}
                placeholder="item-1"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Quantity</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="1"
                step="1"
              />
            </label>
            <button type="submit" className="btn" disabled={reserveState.loading}>
              {reserveState.loading ? 'Reserving…' : 'Reserve'}
            </button>
          </form>
          <ResultBox state={reserveState} />
        </section>
      </main>
    </div>
  )
}

function ResultBox({ state }) {
  if (state.loading) {
    return (
      <div className="result" role="status" aria-live="polite">
        <pre>Loading…</pre>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="result error" role="alert">
        <pre>
          {JSON.stringify({ error: state.error, details: state.details }, null, 2)}
        </pre>
      </div>
    )
  }

  if (state.data) {
    return (
      <div className="result">
        <pre>{JSON.stringify(state.data, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="result muted">
      <pre>Run the action to see a response…</pre>
    </div>
  )
}

export default App
