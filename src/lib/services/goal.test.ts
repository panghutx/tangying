import { createGoal } from './goal'
import { prisma } from '@/lib/prisma'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      create: jest.fn(),
    },
  },
}))

// Mock Next.js cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('createGoal', () => {
  it('should create a goal with correct data', async () => {
    const mockGoal = {
      id: 'goal-1',
      userId: 'user-1',
      type: 'ASSET',
      name: 'One Million',
      targetAmount: 1000000,
      status: 'ACTIVE',
      createdAt: new Date(),
    }

    ;(prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal)

    const result = await createGoal({
      userId: 'user-1',
      type: 'ASSET',
      name: 'One Million',
      targetAmount: 1000000,
    })

    expect(result.id).toBe('goal-1')
    expect(prisma.goal.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'ASSET',
        name: 'One Million',
        targetAmount: 1000000,
        status: 'ACTIVE',
      },
    })
  })
})