# Hisense Portal Técnico — Documentación para Desarrolladores

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| Next.js 14.2 | Framework frontend/backend |
| Supabase | Auth + Base de datos + Storage |
| Resend | Envío de correos |
| Vercel | Deploy y hosting |
| next-intl | Internacionalización ES/PT |
| Tailwind CSS | Estilos |
| xlsx | Lectura de archivos Excel |

---

## Arquitectura del Proyecto

```
src/
├── app/
│   ├── (auth)/                        ← Rutas públicas de autenticación
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/                   ← Rutas protegidas por middleware
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx         ← Redirección por rol
│   │   ├── technician/page.tsx
│   │   ├── technician/inspect/[id]/page.tsx
│   │   ├── admin/page.tsx
│   │   └── engineer/page.tsx
│   ├── auth/
│   │   ├── confirm/route.ts           ← Verificación OTP (recuperación + registro)
│   │   └── reset-password/page.tsx   ← Formulario nueva contraseña
│   ├── api/
│   │   ├── auth/callback/route.ts
│   │   └── send-inspection-email/route.ts
│   ├── layout.tsx                     ← NextIntlClientProvider
│   └── page.tsx                       ← redirect("/dashboard")
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordClient.tsx    ← "use client" - maneja sesión activa
│   ├── technician/
│   │   ├── TechnicianDashboard.tsx
│   │   └── InspectionForm.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   └── ExcelUploader.tsx
│   ├── engineer/
│   │   └── EngineerDashboard.tsx      ← Con modal de fotos
│   └── ui/
│       └── LanguageSelector.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  ← createBrowserClient
│   │   └── server.ts                  ← createServerClient
│   └── types.ts
├── messages/
│   ├── es.json
│   └── pt.json
├── i18n/request.ts
├── middleware.ts
next-intl.config.ts
```

---

## Base de Datos Supabase

### Tablas

```sql
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text,
  full_name text,
  role text,           -- 'admin' | 'technician' | 'engineer'
  language text,       -- 'es' | 'pt'
  is_active boolean
)

stores (
  id uuid PRIMARY KEY,
  name text,
  city text,
  country text,        -- 'ES' | 'PT'
  address text,
  is_active boolean
)

assignments (
  id uuid PRIMARY KEY,
  technician_id uuid REFERENCES profiles,
  store_id uuid REFERENCES stores,
  visit_date date,
  status text          -- 'pending' | 'completed' | 'cancelled'
)

assigned_units (
  id uuid PRIMARY KEY,
  assignment_id uuid REFERENCES assignments,
  store_model text,
  store_serial text,
  return_reason text,
  status text          -- 'pending' | 'completed'
)

inspections (
  id uuid PRIMARY KEY,
  assigned_unit_id uuid REFERENCES assigned_units,
  technician_id uuid REFERENCES profiles,
  verified_model text,
  verified_serial text,
  model_matches boolean,
  serial_matches boolean,
  fault_category text,
  fault_detail text,
  photo_model_url text,
  photo_serial_url text,
  photo_fault_url text,
  is_editable boolean,
  created_at timestamptz
)

edit_requests (
  id uuid PRIMARY KEY,
  inspection_id uuid REFERENCES inspections,
  technician_id uuid REFERENCES profiles,
  reason text,
  status text          -- 'pending' | 'approved' | 'rejected'
)
```

### Trigger para nuevos usuarios

```sql
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, language, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'technician'),
      'es',
      true
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Queries SQL Útiles

### Gestión de usuarios y roles

```sql
-- Ver todos los usuarios
SELECT email, full_name, role, is_active FROM profiles ORDER BY role;

-- Cambiar roles
UPDATE profiles SET role = 'admin' WHERE email = 'correo@ejemplo.com';
UPDATE profiles SET role = 'engineer' WHERE email = 'correo@ejemplo.com';
UPDATE profiles SET role = 'technician' WHERE email = 'correo@ejemplo.com';

-- Activar/desactivar usuario
UPDATE profiles SET is_active = true WHERE email = 'correo@ejemplo.com';
UPDATE profiles SET is_active = false WHERE email = 'correo@ejemplo.com';

-- Eliminar usuario completo (respetar orden por foreign keys)
DELETE FROM inspections WHERE technician_id = (SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com');
DELETE FROM assigned_units WHERE assignment_id IN (
  SELECT id FROM assignments WHERE technician_id = (SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com')
);
DELETE FROM assignments WHERE technician_id = (SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com');
DELETE FROM profiles WHERE email = 'correo@ejemplo.com';
DELETE FROM auth.users WHERE email = 'correo@ejemplo.com';
```

### Gestión de datos

```sql
-- Ver inspecciones recientes
SELECT * FROM inspections ORDER BY created_at DESC LIMIT 20;

-- Ver asignaciones pendientes
SELECT * FROM assignments WHERE status = 'pending';

-- Resetear una revisión a pendiente
UPDATE assigned_units SET status = 'pending' WHERE id = 'uuid-aqui';
UPDATE assignments SET status = 'pending' WHERE id = 'uuid-aqui';

-- Estadísticas generales
SELECT 
  COUNT(*) as total_inspecciones,
  COUNT(CASE WHEN model_matches AND serial_matches THEN 1 END) as coincidencias,
  COUNT(CASE WHEN NOT model_matches OR NOT serial_matches THEN 1 END) as discrepancias,
  COUNT(CASE WHEN fault_category = 'no_fault_found' THEN 1 END) as nff
FROM inspections;

-- Inspecciones por técnico
SELECT p.full_name, COUNT(i.id) as total
FROM inspections i
JOIN profiles p ON i.technician_id = p.id
GROUP BY p.full_name
ORDER BY total DESC;
```

### Limpieza total (producción limpia)

```sql
-- Ejecutar en este orden
DELETE FROM inspections;
DELETE FROM assigned_units;
DELETE FROM assignments;
DELETE FROM stores;
DELETE FROM profiles;
DELETE FROM auth.users;
```

---

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NEXT_PUBLIC_APP_URL=https://inspecciones.hisense-iberia.com
RESEND_API_KEY=re_tu_api_key
```

---

## Configuración Supabase

### Authentication → URL Configuration
```
Site URL: https://inspecciones.hisense-iberia.com
Redirect URLs:
  https://inspecciones.hisense-iberia.com/auth/callback
  https://inspecciones.hisense-iberia.com/auth/confirm
  https://inspecciones.hisense-iberia.com/auth/reset-password
  https://inspecciones.hisense-iberia.com/**
```

### Authentication → Email (SMTP)
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: re_tu_api_key
Sender email: soporte@hisense-iberia.com
Sender name: Hisense Portal
```

### Authentication → Email OTP Expiration
```
86400 segundos (24 horas)
```

### Email Templates

**Reset Password - Subject:**
```
Hisense Iberia | Restablece tu contraseña / Redefina a sua palavra-passe
```

**Reset Password - Body (usar siempre {{ .ConfirmationURL }}):**
```html
<h2>Restablece tu contraseña / Redefina a sua palavra-passe</h2>
<p>Haz clic en el enlace para restablecer tu contraseña:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer contraseña / Redefinir palavra-passe</a></p>
<p>Si no solicitaste este cambio, ignora este correo.</p>
```

**⚠️ IMPORTANTE:** Nunca uses comillas dobles `"` dentro de atributos `href` en los templates de Supabase. Causa error `"<" in attribute name`. Usa siempre `{{ .ConfirmationURL }}` o comillas simples `'`.

**Confirm Signup - Subject:**
```
Hisense Iberia | Confirma tu cuenta / Confirme a sua conta
```

---

## Storage (Fotos)

- **Bucket:** `inspection-photos`
- **Visibilidad:** Public bucket ✅
- **Estructura:** `inspection-photos/{technician_id}/{timestamp}-{type}.jpg`
- **Tipos:** `model`, `serial`, `fault`
- **URLs:** `https://{project}.supabase.co/storage/v1/object/public/inspection-photos/{path}`

⚠️ El bucket debe estar configurado como **Public** para que las URLs funcionen directamente. Si es privado las URLs generadas incluyen un token de firma que expira.

---

## Flujo de Recuperación de Contraseña (PKCE)

Este fue el problema más complejo. La solución definitiva:

1. `ForgotPasswordForm.tsx` llama a `supabase.auth.resetPasswordForEmail()` con `redirectTo: APP_URL/auth/reset-password`
2. Supabase envía correo con `{{ .ConfirmationURL }}`
3. El usuario hace clic → Supabase verifica el token → redirige a `/auth/reset-password` con sesión activa
4. `ResetPasswordClient.tsx` llama a `supabase.auth.getSession()` para verificar sesión activa
5. Si hay sesión → muestra formulario → `supabase.auth.updateUser({ password })`

### Problemas encontrados y soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| Error 500 al enviar correo | Template HTML con `\"` en atributos href | Usar `{{ .ConfirmationURL }}` sin estilos inline |
| OTP expirado inmediatamente | PKCE code verifier se pierde en redirect | Usar `{{ .ConfirmationURL }}` nativo de Supabase |
| 404 en `/auth/reset-password` | Ruta dentro del grupo `(auth)` | Mover a `src/app/auth/reset-password/` fuera del group |
| "Error al actualizar contraseña" | Sesión no persistía entre redirects | Usar `getSession()` en cliente en lugar de intercambiar código en servidor |
| Bucket fotos da 404 | Bucket privado, URLs sin token | Activar "Public bucket" en Storage settings |

---

## Deploy en Vercel

1. Subir código a GitHub (repositorio privado recomendado)
2. Importar en Vercel → configurar variables de entorno
3. Agregar en `next.config.mjs`:

```javascript
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}
```

4. Dominio personalizado: agregar registro CNAME en Squarespace:
   - Tipo: `CNAME`
   - Alojamiento: `inspecciones`
   - Datos: `{id}.vercel-dns-017.com.`

---

## Internacionalización (next-intl)

La preferencia de idioma se guarda en:
1. Cookie `language` (para next-intl server-side)
2. Tabla `profiles.language` en Supabase (persistencia)

Archivos de traducción: `src/messages/es.json` y `src/messages/pt.json`

---

## RLS (Row Level Security)

⚠️ **PENDIENTE para producción**

Actualmente RLS está desactivado para evitar problemas de recursión infinita. Reconfigurar antes de un deploy en producción real.

```sql
-- Estado actual (desarrollo)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
```
