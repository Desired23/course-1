




export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  name: string
  email: string
  password: string
  role?: 'user' | 'instructor'
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    roles: string[]
    avatar?: string
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


const MOCK_USERS = [
  {
    id: '1',
    email: 'john@example.com',
    password: 'password123',
    name: 'John Doe',
    roles: ['user'],
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
  },
  {
    id: '2',
    email: 'jane@example.com',
    password: 'password123',
    name: 'Jane Smith',
    roles: ['user', 'instructor'],
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane'
  },
  {
    id: '3',
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    roles: ['admin'],
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
  }
]

export async function mockLogin(credentials: LoginCredentials): Promise<AuthResponse> {
  await delay(800)

  const user = MOCK_USERS.find(u => u.email === credentials.email)

  if (!user) {
    throw new Error('User not found')
  }

  if (user.password !== credentials.password) {
    throw new Error('Invalid password')
  }


  const token = `mock_jwt_token_${user.id}_${Date.now()}`

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      avatar: user.avatar
    }
  }
}

export async function mockSignup(data: SignupData): Promise<AuthResponse> {
  await delay(1000)


  if (MOCK_USERS.some(u => u.email === data.email)) {
    throw new Error('Email already exists')
  }

  const newUser = {
    id: Date.now().toString(),
    email: data.email,
    password: data.password,
    name: data.name,
    roles: [data.role || 'user'],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`
  }

  MOCK_USERS.push(newUser)

  const token = `mock_jwt_token_${newUser.id}_${Date.now()}`

  return {
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roles: newUser.roles,
      avatar: newUser.avatar
    }
  }
}

export async function mockLogout(): Promise<void> {
  await delay(300)

}

export async function mockGetCurrentUser(token: string): Promise<AuthResponse['user'] | null> {
  await delay(400)


  const match = token.match(/mock_jwt_token_(\d+)/)
  if (!match) return null

  const userId = match[1]
  const user = MOCK_USERS.find(u => u.id === userId)

  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    avatar: user.avatar
  }
}

export async function mockRefreshToken(token: string): Promise<string> {
  await delay(500)

  const user = await mockGetCurrentUser(token)
  if (!user) {
    throw new Error('Invalid token')
  }

  return `mock_jwt_token_${user.id}_${Date.now()}`
}
