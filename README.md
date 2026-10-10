# Jeopardy: Educación Financiera - Estudio A
## "La Película de tu Vida" (Branch A vs Branch B)
### Proyecto "El Set de Cine": Activación Interactiva • UACM

Juego interactivo multijugador en tiempo real con sistema de pulsador (buzzer) para celulares, sintetizador de voz con Web Speech API en español latino, generador dinámico de código QR, tablero 5x5 con taxonomía de Bloom y podio olímpico con lluvia de confeti.

---

## 🚀 Despliegue en Render (Paso a Paso)

1. Sube este repositorio a **GitHub**.
2. Entra a tu panel en [Render.com](https://render.com) y haz clic en **New +** -> **Web Service**.
3. Conecta tu repositorio de GitHub.
4. Configura los parámetros:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** `Free` (o el de tu preferencia).
5. Haz clic en **Create Web Service**. ¡Listo! Render te proporcionará tu URL pública permanente (ej: `https://jeopardy-finanzas.onrender.com`).

---

## 💻 Ejecución Local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor:
   ```bash
   node server.js
   ```
3. Abre en tu navegador:
   - **Pantalla del Docente / Proyector:** [http://localhost:3000](http://localhost:3000)
   - **Pulsador para Celulares:** [http://localhost:3000/buzzer.html](http://localhost:3000/buzzer.html)

---

## 🎮 Controles del Docente (Atajos de Teclado)
- `[Espacio]`: Activar Buzzer / Permitir pulsaciones.
- `[C]`: Marcar respuesta como **¡Correcta!** (+Puntos y fanfarria).
- `[X]`: Marcar respuesta como **Incorrecta** (habilita rebote).
- `[R]`: Ver / Ocultar respuesta correcta en silencio.
- `[Esc]`: Cerrar modal y volver al tablero.
- Botón **🤖 Reflexión IA**: Reproduce en voz alta con Web Speech API (`es-MX` / `es-419`) la lección pedagógica.
