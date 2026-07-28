// Test using actual db.ts
process.env.DATABASE_URL = 'libsql://panya-ai-siriwat08.aws-ap-northeast-1.turso.io'
process.env.TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUxNTM4MjUsImlkIjoiMDE5ZmEzNzQtYjAwMS03MWZiLWJiZjYtNjQ2YThkMzNmMWViIiwia2lkIjoiLWg1N1RSRmlJT0dMdldjYmpRSU9uVDJLU0tZWW4xZE1zYi1yMlk1TzVLMCIsInJpZCI6ImUxODZhMzBkLWIwY2ItNDhjYi04YWFlLTZhMGE2OWU1YmYxNCJ9.eNurd9wbZmJNd23Ci5kV3h8BSVZ9BxHe7_HD2ujUbwqKFxpDWQEtXzTAs93_RuXzJmc6EZNSPUv_afJ5mK_oCg'
process.env.NODE_ENV = 'production'

const { db } = await import('../src/lib/db')
try {
  const count = await db.law.count()
  console.log('✓ Law count:', count)
  const sample = await db.law.findFirst({ select: { lawNameTh: true } })
  console.log('✓ Sample law:', sample?.lawNameTh)
} catch (e: any) {
  console.error('✗ Error:', e.message.slice(0, 300))
}
process.exit(0)
