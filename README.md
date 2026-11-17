# Ally

Frontend React + Vite para el planificador personal de estudio.

## Desarrollo

Configura `VITE_API_URL` con la URL base de la API Django. Para desarrollo local:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Inicia la interfaz con `npm run dev`. El backend debe permitir el origen del frontend en su configuración CORS.

## Validación

- `npm run test`: pruebas de autenticación, validación y calendario.
- `npm run lint`: análisis estático.
- `npm run build`: compilación de producción.

## Asistente local

En el calendario, «Planear con Ally» usa Qwen2.5-1.5B-Instruct con WebLLM y WebGPU. El modelo se carga solo cuando la persona lo solicita, se ejecuta en un Web Worker y WebLLM almacena sus archivos en la caché del navegador. La primera carga requiere conexión y memoria gráfica suficiente (estimación de WebLLM: 1,6 GB). El navegador debe ofrecer WebGPU y ejecutarse en un contexto seguro, como `localhost` o HTTPS.

El texto se interpreta en el dispositivo. Antes de guardar, la persona puede corregir los datos; la hora límite y una categoría existente son obligatorias. Solo al confirmar se crea la meta y se solicita la planificación al backend. Sin WebGPU, el formulario de metas normal sigue disponible.
