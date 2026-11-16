import { neonAuth } from "@/server/auth";

// Point d'entrée Neon Auth (connexion, session, déconnexion) : relais vers le service d'authentification.
export const { GET, POST } = neonAuth().handler();
