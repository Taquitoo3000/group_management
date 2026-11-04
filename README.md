# Familia Segoviano Caudillo

Pendientes, wishlists, cumpleaños e intercambio navideño. Vite + JS + Firebase.

## Características
1. Proyecto en https://console.firebase.google.com
2. Authentication > Sign-in method > **Google**.
3. Firestore Database NoSQL compatible con MongoDB.
4. Pestaña **Reglas** de Firestore: Contenido de `firestore.rules` y publica.
5. Configuración del proyecto > Tus apps > Web: `src/firebase.js`.
6. En Firestore crea a mano tu primer admin:
   colección `allowed` > ID del documento = tu correo en minúsculas > campo `admin` (boolean) = true.
7. `npm install && npm run dev`
8. Entra con Google. Como admin verás en Inicio el campo para permitir los correos del resto de la familia.

## Deploy
`npm run build` y sube `dist/` a Firebase Hosting (`firebase deploy --only hosting`), Netlify o Vercel.
En Authentication > Settings > Authorized domains agrega tu dominio final.
