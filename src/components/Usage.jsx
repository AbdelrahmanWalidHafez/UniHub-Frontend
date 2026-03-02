import React, { useEffect, useMemo, useState } from 'react'
import { get } from '../utils/api'

const ROLE_COLORS = ['#9DD957', '#0EA5E9', '#F59E0B', '#A855F7', '#EF4444', '#14B8A6']
const GENDER_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#6B7280']

function toEntries(mapLike) {
  if (!mapLike || typeof mapLike !== 'object') return []
  return Object.entries(mapLike).map(([name, value]) => ({
    name,
    value: Number(value) || 0
  }))
}

function PieCard({ title, entries, colors }) {
  const normalized = useMemo(() => entries.filter((item) => item.value > 0), [entries])
  const total = normalized.reduce((sum, item) => sum + item.value, 0)

  const gradient = useMemo(() => {
    if (!total || normalized.length === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)'

    let start = 0
    const parts = normalized.map((item, index) => {
      const sweep = (item.value / total) * 360
      const end = start + sweep
      const color = colors[index % colors.length]
      const chunk = `${color} ${start}deg ${end}deg`
      start = end
      return chunk
    })

    return `conic-gradient(${parts.join(', ')})`
  }, [colors, normalized, total])

  return (
    <section style={styles.chartCard}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <div style={styles.chartBody}>
        <div style={{ ...styles.pie, background: gradient }}>
          <div style={styles.pieCenter}>
            <div style={styles.pieTotal}>{total}</div>
            <div style={styles.pieLabel}>Total</div>
          </div>
        </div>

        <div style={styles.legend}>
          {normalized.length === 0 ? (
            <div style={styles.emptyLegend}>No data available</div>
          ) : (
            normalized.map((item, index) => (
              <div key={item.name} style={styles.legendRow}>
                <span style={{ ...styles.legendDot, backgroundColor: colors[index % colors.length] }} />
                <span style={styles.legendName}>{item.name.replace('ROLE_', '').replace(/_/g, ' ')}</span>
                <span style={styles.legendValue}>{item.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default function Usage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({
    totalUsers: 0,
    totalColleges: 0,
    usersByRole: {},
    usersByGender: {},
    usersPerCollege: []
  })

  useEffect(() => {
    let mounted = true

    async function fetchUsage() {
      setLoading(true)
      setError('')
      try {
        const response = await get('http://localhost:8082/unihub/usage/api/v1/usage')
        if (!mounted) return

        setData({
          totalUsers: Number(response?.totalUsers) || 0,
          totalColleges: Number(response?.totalColleges) || 0,
          usersByRole: response?.usersByRole || {},
          usersByGender: response?.usersByGender || {},
          usersPerCollege: Array.isArray(response?.usersPerCollege) ? response.usersPerCollege : []
        })
      } catch (err) {
        if (!mounted) return
        setError(err.message || 'Failed to load usage analytics')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchUsage()
    return () => {
      mounted = false
    }
  }, [])

  const roleEntries = useMemo(() => toEntries(data.usersByRole), [data.usersByRole])
  const genderEntries = useMemo(() => toEntries(data.usersByGender), [data.usersByGender])

  return (
    <div style={styles.container}>
      <div style={styles.headerSection}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Usage</h1>
          <p style={styles.subtitle}>System activity and users analytics overview</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      <section style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Users</div>
          <div style={styles.kpiValue}>{loading ? '...' : data.totalUsers}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Colleges</div>
          <div style={styles.kpiValue}>{loading ? '...' : data.totalColleges}</div>
        </div>
      </section>

      <section style={styles.chartsGrid}>
        <PieCard title="Users by Role" entries={roleEntries} colors={ROLE_COLORS} />
        <PieCard title="Users by Gender" entries={genderEntries} colors={GENDER_COLORS} />
      </section>

      <section style={styles.tableCard}>
        <div style={styles.tableTitle}>Users Per College</div>
        <table style={styles.table}>
          <thead>
            <tr style={{ backgroundColor: '#000' }}>
              <th style={styles.th}>COLLEGE</th>
              <th style={styles.th}>USERS COUNT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`usage-skeleton-${index}`}>
                  <td style={styles.td}><div style={styles.skeletonLine} /></td>
                  <td style={styles.td}><div style={{ ...styles.skeletonLine, width: '50%' }} /></td>
                </tr>
              ))
            ) : data.usersPerCollege.length === 0 ? (
              <tr>
                <td colSpan={2} style={styles.emptyCell}>No usage records available</td>
              </tr>
            ) : (
              data.usersPerCollege.map((item, index) => (
                <tr key={`${item.collegeName}-${index}`} style={{ borderBottom: index === data.usersPerCollege.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
                  <td style={styles.td}>{item.collegeName || '—'}</td>
                  <td style={styles.td}>{Number(item.userCount) || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

const styles = {
  container: {
    padding: '36px 60px',
    maxWidth: 'calc(100% - 120px)',
    margin: '0 auto',
    minHeight: 'auto'
  },
  headerSection: {
    display: 'flex',
    alignItems: 'flex-end',
    marginBottom: '28px',
    gap: 20,
    justifyContent: 'space-between'
  },
  headerLeft: {
    flex: '0 0 auto'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    color: '#111827'
  },
  subtitle: {
    fontSize: '14px',
    color: '#9CA3AF',
    margin: 0,
    fontWeight: '500'
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #EF4444',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#991B1B',
    fontSize: '14px',
    fontWeight: '500'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  kpiCard: {
    backgroundColor: 'white',
    borderRadius: '14px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 2px 8px rgba(58,74,82,0.06)',
    padding: '20px'
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px'
  },
  kpiValue: {
    fontSize: '32px',
    color: '#111827',
    fontWeight: '800',
    lineHeight: 1
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '14px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 2px 8px rgba(58,74,82,0.06)',
    padding: '16px'
  },
  cardTitle: {
    margin: '0 0 14px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  chartBody: {
    display: 'grid',
    gridTemplateColumns: '170px 1fr',
    gap: '16px',
    alignItems: 'center'
  },
  pie: {
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto'
  },
  pieCenter: {
    width: '86px',
    height: '86px',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  pieTotal: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#111827',
    lineHeight: 1
  },
  pieLabel: {
    fontSize: '11px',
    color: '#6B7280',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  legendRow: {
    display: 'grid',
    gridTemplateColumns: '12px 1fr auto',
    alignItems: 'center',
    gap: '8px'
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  legendName: {
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  legendValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: '700'
  },
  emptyLegend: {
    fontSize: '13px',
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(58,74,82,0.08)'
  },
  tableTitle: {
    padding: '16px 20px',
    borderBottom: '1px solid #F3F4F6',
    fontSize: '12px',
    color: '#000000',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em'
  },
  td: {
    padding: '16px 20px',
    fontSize: '13px',
    color: '#6B7280',
    fontWeight: '500'
  },
  emptyCell: {
    padding: '48px 20px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#9CA3AF'
  },
  skeletonLine: {
    width: '70%',
    height: '12px',
    borderRadius: '6px',
    backgroundColor: '#F3F4F6'
  }
}
