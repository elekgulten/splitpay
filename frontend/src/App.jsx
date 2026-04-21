import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

const SPLITPAY_ADDRESS = '0x3F1D8860c5bD46fdcc3C8Db2c1f0D84762e82aDA'
const SPLITPAY_ABI = [
  'function createGroup(string memory _title, uint256 _memberCount) external returns (uint256)',
  'function payShare(uint256 _groupId) external payable',
  'function getGroup(uint256 _groupId) external view returns (tuple(uint256 id, address creator, string title, uint256 totalAmount, uint256 perPerson, uint256 memberCount, uint256 paidCount, bool settled))',
  'function groupCount() view returns (uint256)',
]

export default function App() {
  const [wallet, setWallet] = useState(null)
  const [page, setPage] = useState('home')
  const [title, setTitle] = useState('')
  const [members, setMembers] = useState('')
  const [amount, setAmount] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groupInfo, setGroupInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [shareLink, setShareLink] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/\/group\/(\d+)/)
    if (match) {
      setGroupId(match[1])
      setPage('pay')
    }
  }, [])

  const connectWallet = async () => {
    if (!window.ethereum) return alert('MetaMask required!')
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWallet({ provider, signer, address })
      setMessage('✅ Wallet connected: ' + address.slice(0, 6) + '...' + address.slice(-4))
    } catch (e) {
      setMessage('❌ Connection rejected')
    }
  }

  const createGroup = async () => {
    if (!wallet) return alert('Connect wallet first!')
    if (!title || !members) return alert('Enter title and member count!')
    if (parseInt(members) < 2) return alert('Need at least 2 members!')
    setLoading(true)
    setMessage('')
    try {
      const contract = new ethers.Contract(SPLITPAY_ADDRESS, SPLITPAY_ABI, wallet.signer)
      const tx = await contract.createGroup(title, parseInt(members), { gasLimit: 300000 })
      setMessage('⏳ Creating group, please wait...')
      await tx.wait()
      const id = Number(await contract.groupCount())
      const link = window.location.origin + window.location.pathname + '#/group/' + id
      setShareLink(link)
      setGroupId(id.toString())
      setMessage('✅ Group created! ID: ' + id)
      setPage('pay')
      loadGroupById(id)
    } catch (e) {
      if (e.code === 4001 || e.message?.includes('rejected')) {
        setMessage('❌ Transaction rejected by user')
      } else {
        setMessage('❌ Error: ' + e.message)
      }
    }
    setLoading(false)
  }

  const payShare = async () => {
    if (!wallet) return alert('Connect wallet first!')
    if (!groupId || !amount) return alert('Enter group ID and amount!')
    setLoading(true)
    setMessage('')
    try {
      const contract = new ethers.Contract(SPLITPAY_ADDRESS, SPLITPAY_ABI, wallet.signer)
      const value = ethers.parseUnits(amount, 18)
      const tx = await contract.payShare(parseInt(groupId), { value, gasLimit: 300000 })
      setMessage('⏳ Processing payment...')
      await tx.wait()
      setMessage('✅ Payment successful!')
      loadGroupById(parseInt(groupId))
    } catch (e) {
      if (e.code === 4001 || e.message?.includes('rejected')) {
        setMessage('❌ Transaction rejected by user')
      } else {
        setMessage('❌ Error: ' + e.message)
      }
    }
    setLoading(false)
  }

  const loadGroupById = async (id) => {
    if (!wallet) return
    try {
      const contract = new ethers.Contract(SPLITPAY_ADDRESS, SPLITPAY_ABI, wallet.signer)
      const g = await contract.getGroup(id)
      setGroupInfo({
        id: Number(g.id),
        title: g.title,
        totalAmount: ethers.formatUnits(g.totalAmount, 18),
        perPerson: ethers.formatUnits(g.perPerson, 18),
        memberCount: Number(g.memberCount),
        paidCount: Number(g.paidCount),
        settled: g.settled,
        creator: g.creator
      })
      const link = window.location.origin + window.location.pathname + '#/group/' + id
      setShareLink(link)
    } catch (e) {
      setMessage('❌ Group not found')
    }
  }

  const loadGroup = () => {
    if (groupId) loadGroupById(parseInt(groupId))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setMessage('✅ Link copied! Share it with your friends.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div onClick={() => setPage('home')} style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa', cursor: 'pointer' }}>💸 SplitPay</div>
        <button onClick={connectWallet}
          style={{ background: wallet ? '#166534' : '#1f6feb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          {wallet ? '✅ ' + wallet.address.slice(0, 6) + '...' + wallet.address.slice(-4) : 'Connect Wallet'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{ background: message.includes('❌') ? '#2e1a1a' : '#1a1a2e', border: '1px solid ' + (message.includes('❌') ? '#5e2a2a' : '#2a2a5e'), margin: '16px 24px', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', color: message.includes('❌') ? '#fca5a5' : '#93c5fd' }}>
          {message}
        </div>
      )}

      {/* Nav */}
      <div style={{ display: 'flex', gap: '12px', padding: '24px 24px 0' }}>
        {[['home', '🏠 Home'], ['create', '➕ Create Group'], ['pay', '💳 Pay']].map(([p, label]) => (
          <button key={p} onClick={() => setPage(p)}
            style={{ background: page === p ? '#1f6feb' : '#1a1a1a', color: '#fff', border: '1px solid #333', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px' }}>
        {/* Home */}
        {page === 'home' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💸</div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '16px' }}>SplitPay</h1>
            <p style={{ color: '#888', fontSize: '18px', marginBottom: '32px' }}>
              Split expenses with friends and pay with USDC. On-chain, on Arc Network.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button onClick={() => setPage('create')}
                style={{ background: '#1f6feb', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>
                ➕ Create Group
              </button>
              <button onClick={() => setPage('pay')}
                style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #333', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>
                💳 Pay Now
              </button>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '48px' }}>
              {[['🍕', 'Dinner & Food'], ['🏨', 'Hotel & Travel'], ['🎉', 'Events']].map(([icon, text]) => (
                <div key={text} style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
                  <div style={{ color: '#888', fontSize: '13px' }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create */}
        {page === 'create' && (
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>➕ Create New Group</h2>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Group Name</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bodrum trip"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 14px', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Number of Members</label>
                <input value={members} onChange={e => setMembers(e.target.value)} placeholder="e.g. 4" type="number" min="2"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 14px', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
              <button onClick={createGroup} disabled={loading}
                style={{ width: '100%', background: loading ? '#333' : '#1f6feb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '700' }}>
                {loading ? '⏳ Processing...' : '✅ Create Group'}
              </button>
            </div>
          </div>
        )}

        {/* Pay */}
        {page === 'pay' && (
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>💳 Pay Your Share</h2>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Group ID</label>
                <input value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="e.g. 1" type="number"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 14px', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Amount (USDC)</label>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 25" type="number"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '10px 14px', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={loadGroup}
                  style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: '1px solid #333', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  🔍 View Group
                </button>
                <button onClick={payShare} disabled={loading}
                  style={{ flex: 2, background: loading ? '#333' : '#238636', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
                  {loading ? '⏳ Processing...' : '💳 Pay Now'}
                </button>
              </div>
            </div>

            {shareLink && (
              <div style={{ background: '#1a1a2e', border: '1px solid #2a2a5e', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ color: '#93c5fd', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>🔗 Share Link</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, background: '#0a0a1a', border: '1px solid #333', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shareLink}
                  </div>
                  <button onClick={copyLink}
                    style={{ background: '#1f6feb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    📋 Copy
                  </button>
                </div>
                <div style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                  Share this link with friends — they'll land directly on the payment page.
                </div>
              </div>
            )}

            {groupInfo && (
              <div style={{ background: '#0d2e1a', border: '1px solid #166534', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '12px' }}>📊 {groupInfo.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    ['Per Person', groupInfo.perPerson === '0.0' ? 'Set on first payment' : groupInfo.perPerson + ' USDC'],
                    ['Total Collected', groupInfo.totalAmount + ' USDC'],
                    ['Paid', groupInfo.paidCount + '/' + groupInfo.memberCount],
                    ['Status', groupInfo.settled ? '✅ Settled' : '⏳ Pending'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#0a1f10', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ color: '#4ade80', fontSize: '11px', marginBottom: '4px' }}>{k}</div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ color: '#4ade80', fontSize: '12px', marginBottom: '6px' }}>Progress</div>
                  <div style={{ background: '#0a1f10', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#4ade80', height: '100%', width: (groupInfo.paidCount / groupInfo.memberCount * 100) + '%', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}