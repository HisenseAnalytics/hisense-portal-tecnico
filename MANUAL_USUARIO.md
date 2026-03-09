# Hisense Portal Técnico — Manual de Usuario

---

# 📱 Manual del Técnico

## Acceso al Portal

1. Abre el navegador y ve a **inspecciones.hisense-iberia.com**
2. Introduce tu **email** y **contraseña**
3. Haz clic en **Iniciar sesión**

> Si es tu primera vez, recibirás un correo de confirmación. Haz clic en el enlace del correo antes de iniciar sesión.

---

## ¿Olvidaste tu contraseña?

1. En la pantalla de login haz clic en **¿Olvidaste tu contraseña?**
2. Introduce tu email
3. Revisa tu bandeja de entrada
4. Haz clic en el enlace del correo
5. Introduce tu nueva contraseña y confirma

---

## Dashboard del Técnico

Al iniciar sesión verás:

- **Revisiones pendientes** — número de equipos que debes revisar
- **Revisiones completadas** — equipos ya inspeccionados
- **Lista de asignaciones** — tiendas con equipos pendientes

Cada asignación muestra el nombre y ciudad de la tienda, la fecha de visita y el número de equipos pendientes.

---

## Completar una Revisión

1. En el dashboard haz clic en un equipo pendiente
2. Rellena el formulario de inspección:

   **Datos del equipo:**
   - Verifica el **modelo** del equipo físico
   - Verifica el **número de serie** del equipo físico
   - Si no coinciden con los datos de la tienda aparecerá una alerta ⚠️

   **Fotografías:**
   - Foto del **modelo** del equipo
   - Foto del **número de serie**
   - Foto del **fallo o estado** del equipo

   **Clasificación del fallo:**
   - Selecciona la categoría de fallo correspondiente
   - Añade detalles adicionales si es necesario

3. Haz clic en **Completar revisión**
4. El equipo desaparecerá de tu lista de pendientes
5. Se enviará automáticamente un correo de confirmación

> ⚠️ Una vez completada la revisión no podrás modificarla sin autorización del administrador.

---

## Cambiar Idioma

En la esquina superior derecha encontrarás el selector **ES / PT**. Tu preferencia se guardará automáticamente.

---

## Cerrar Sesión

Haz clic en **Salir** en la esquina superior derecha.

---
---

# 🛠️ Manual del Administrador

## Acceso al Portal

1. Ve a **inspecciones.hisense-iberia.com**
2. Inicia sesión con tu cuenta de administrador

---

## Panel de Administración

El panel tiene 4 secciones:

1. **Asignaciones** — gestión de visitas técnicas
2. **Técnicos** — gestión de usuarios técnicos
3. **Tiendas** — gestión de tiendas ES/PT
4. **Solicitudes de edición** — revisión de cambios solicitados

---

## Crear una Asignación

1. Ve a la pestaña **Asignaciones**
2. Haz clic en **Nueva asignación**
3. Selecciona el técnico, la tienda y la fecha de visita
4. Descarga la **plantilla Excel** haciendo clic en **Descargar plantilla**
5. Rellena los datos: modelo, serie y motivo de devolución
6. Sube el archivo Excel completado
7. Haz clic en **Crear asignación**

El técnico verá la asignación inmediatamente en su dashboard.

---

## Plantilla Excel

| Columna | Descripción |
|---------|-------------|
| Modelo | Modelo del equipo según la tienda |
| Serie | Número de serie según la tienda |
| Motivo | Motivo de devolución o revisión |

---

## Gestión de Técnicos

En la pestaña **Técnicos** puedes activar o desactivar técnicos. Los técnicos desactivados no pueden iniciar sesión.

---

## Gestión de Tiendas

En la pestaña **Tiendas** puedes activar o desactivar tiendas de España y Portugal.

---

## Solicitudes de Edición

Cuando un técnico solicita modificar una revisión completada:

1. La solicitud aparece en esta pestaña con el motivo
2. **Aprobar** → el técnico podrá editar la revisión
3. **Rechazar** → la revisión queda bloqueada

---

## Gestión de Roles via SQL

Para cambiar el rol de un usuario ve a **Supabase → SQL Editor**:

```sql
-- Cambiar a administrador
UPDATE profiles SET role = 'admin' WHERE email = 'correo@ejemplo.com';

-- Cambiar a ingeniero
UPDATE profiles SET role = 'engineer' WHERE email = 'correo@ejemplo.com';

-- Cambiar a técnico
UPDATE profiles SET role = 'technician' WHERE email = 'correo@ejemplo.com';
```

---

## Queries SQL de Mantenimiento

```sql
-- Ver todos los usuarios
SELECT email, full_name, role, is_active FROM profiles ORDER BY role;

-- Activar/desactivar usuario
UPDATE profiles SET is_active = true WHERE email = 'correo@ejemplo.com';
UPDATE profiles SET is_active = false WHERE email = 'correo@ejemplo.com';

-- Eliminar usuario completo
DELETE FROM inspections WHERE technician_id = (SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com');
DELETE FROM assigned_units WHERE assignment_id IN (
  SELECT id FROM assignments WHERE technician_id = (SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com')
);
DELETE FROM assignments WHERE technician_id = (SELECT id FROM auth.users WHERE email = 'correo@ejemplo.com');
DELETE FROM profiles WHERE email = 'correo@ejemplo.com';
DELETE FROM auth.users WHERE email = 'correo@ejemplo.com';

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

-- Limpieza total (solo para resetear a producción limpia)
DELETE FROM inspections;
DELETE FROM assigned_units;
DELETE FROM assignments;
DELETE FROM stores;
DELETE FROM profiles;
DELETE FROM auth.users;
```

---
---

# 📊 Manual del Ingeniero

## Acceso al Portal

1. Ve a **inspecciones.hisense-iberia.com**
2. Inicia sesión con tu cuenta de ingeniero

---

## Panel del Ingeniero

El panel muestra estadísticas y una tabla con todas las inspecciones realizadas.

**Estadísticas rápidas:**

| Métrica | Descripción |
|---------|-------------|
| Total revisiones | Número total de inspecciones completadas |
| Coincidencias OK | Equipos donde modelo y serie coinciden |
| Discrepancias | Equipos con diferencias en modelo o serie |
| Sin avería (NFF) | Equipos sin fallo encontrado |

---

## Filtros de Búsqueda

| Filtro | Descripción |
|--------|-------------|
| Búsqueda | Modelo, número de serie o nombre del técnico |
| Tipo de fallo | Filtra por categoría de avería |
| Tienda | Filtra por tienda específica |
| Coincidencia | Muestra solo coincidencias o solo discrepancias |

Los filtros se aplican en tiempo real.

---

## Ver Fotos de una Inspección

1. En la tabla busca la inspección que te interesa
2. Si tiene fotos verás el botón **Ver fotos** en la última columna
3. Haz clic para abrir el visor de fotos
4. Verás tres fotos: **Modelo**, **Número de serie** y **Fallo**
5. Haz clic en cada miniatura para ampliarla

---

## Exportar a CSV

1. Aplica los filtros que necesites
2. Haz clic en **Exportar CSV** en la esquina superior derecha
3. Se descargará el archivo `revisiones_YYYY-MM-DD.csv`

El CSV incluye todas las columnas de la tabla más los datos de referencia de la tienda.

---

## Categorías de Fallos

| Código | Descripción |
|--------|-------------|
| aesthetic_damage | Daño estético |
| structural_impact | Golpe estructural |
| water_damage | Daño por agua |
| used_merchandise | Mercancía usada |
| damaged_packaging | Embalaje dañado |
| incomplete_product | Producto incompleto |
| no_power | No enciende |
| electrical_fault | Avería eléctrica |
| mechanical_fault | Avería mecánica |
| software_fault | Fallo de software |
| abnormal_noise | Ruido anormal |
| gas_leak | Pérdida de gas |
| no_fault_found | Sin avería (NFF) |
