import type { AuthUser } from "./types"

const encoder = new TextEncoder()

export async function hashPassword(password: string): Promise<string> {
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

let _demoUsers: AuthUser[] | null = null

async function getDemoUsers(): Promise<AuthUser[]> {
  if (_demoUsers) return _demoUsers

  _demoUsers = [
    {
      id: "demo-admin",
      name: "Admin Minthy",
      email: "admin@minty.demo",
      passwordHash: await hashPassword("Admin123!"),
      role: "ADMIN",
      avatar: "AM",
    },
    {
      id: "demo-trainer",
      name: "Carlos Entrenador",
      email: "trainer@minty.demo",
      passwordHash: await hashPassword("Trainer123!"),
      role: "TRAINER",
      avatar: "CE",
    },
    {
      id: "demo-user",
      name: "Alex Trainer",
      email: "user@minty.demo",
      passwordHash: await hashPassword("User123!"),
      role: "USER",
      avatar: "AT",
    },
  ]
  return _demoUsers
}

let _registeredUsers: AuthUser[] = []

export async function findUserByEmail(email: string): Promise<AuthUser | undefined> {
  const demo = await getDemoUsers()
  return [...demo, ..._registeredUsers].find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  )
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const existing = await findUserByEmail(email)
  if (existing) throw new Error("Email already registered")

  const user: AuthUser = {
    id: `user-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    role: "USER",
    avatar: name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
  }
  _registeredUsers.push(user)
  return user
}
