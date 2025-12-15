import { UserRepository } from "@template/database"
import { loginSchema, signupSchema, validate } from "@template/shared"
import { Hono } from "hono"

export const authRoutes = new Hono()

/**
 * POST /api/auth/signup - Inscription
 */
authRoutes.post("/signup", async (c) => {
  const body = await c.req.json()
  const validation = validate(signupSchema, body)

  if (!validation.success) {
    return c.json({ error: "Validation error", details: validation.errors }, 400)
  }

  const { username, email } = validation.data

  // Vérifier si l'utilisateur existe
  if (await UserRepository.usernameExists(username)) {
    return c.json({ error: "Username already taken" }, 409)
  }

  if (await UserRepository.emailExists(email)) {
    return c.json({ error: "Email already taken" }, 409)
  }

  // TODO: Hasher le mot de passe avec bcrypt
  const user = await UserRepository.create({
    username,
    email,
    // passwordHash: await hash(password),
  })

  return c.json({ user }, 201)
})

/**
 * POST /api/auth/login - Connexion
 */
authRoutes.post("/login", async (c) => {
  const body = await c.req.json()
  const validation = validate(loginSchema, body)

  if (!validation.success) {
    return c.json({ error: "Validation error", details: validation.errors }, 400)
  }

  const { email } = validation.data

  const user = await UserRepository.findByEmail(email)
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401)
  }

  // TODO: Vérifier le mot de passe
  // TODO: Générer un JWT

  await UserRepository.updateLastLogin(user._id.toString())

  return c.json({ user })
})

/**
 * POST /api/auth/guest - Connexion en tant qu'invité
 */
authRoutes.post("/guest", async (c) => {
  const body = await c.req.json()
  const { username } = body

  if (!username || username.length < 2) {
    return c.json({ error: "Username required" }, 400)
  }

  // Créer un utilisateur invité temporaire
  const guestId = crypto.randomUUID()

  return c.json({
    guest: {
      id: guestId,
      username,
      isGuest: true,
    },
  })
})

/**
 * POST /api/auth/logout - Déconnexion
 */
authRoutes.post("/logout", async (c) => {
  // TODO: Invalider le JWT
  return c.json({ success: true })
})

