# OSZ AI — web pública

Web informativa de OSZ AI, una rama de OneSecureZone. Dominio previsto: **https://ai.onesecurezone.com**.

Astro estático + TypeScript + Three.js + GSAP. Fuentes locales, sin llamadas a APIs de IA ni base de datos. No incluye el ejecutable de OSZ AI.

## Desarrollo local

Usar Node 24 LTS (probado con 24.19.0) y npm 10 o superior. El Node 16 actualmente instalado como predeterminado en este equipo no es compatible.

```sh
npm ci
npm run dev
npm run build
npm test
npm run preview
```

## Cloudflare Pages

1. Conectar el repositorio de esta carpeta con Cloudflare Pages.
2. Build: `npm run build`. Directorio de salida: `dist`.
3. Node: 24.19.0, definido en `.node-version`; puede fijarse también como `NODE_VERSION` en el panel.
4. Registrar `ai.onesecurezone.com` en **Custom domains** del proyecto Pages. Seguir el registro DNS que proporcione Cloudflare. No cambiar el dominio raíz de OneSecureZone.
5. Comprobar HTTPS y las rutas `/`, `/descargas`, `/desarrollo` y la página 404.

También se puede cargar `dist` mediante Direct Upload. Es salida HTML estática; no necesita adaptador de servidor ni Functions. No se ha desplegado ni cambiado DNS desde esta tarea.

Documentación: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/

## Instalar nuevas versiones de descarga

Los instaladores todavía no se han proporcionado. `src/data/releases.ts` contiene las plataformas y una lista vacía `packages` por sistema. Para publicar, añadir únicamente artefactos reales:

```ts
packages: [{ label: 'Arquitectura y formato confirmados', version: 'Versión real', url: 'https://URL-REAL-DEL-INSTALADOR' }]
```

El sitio muestra «Próximamente» mientras la lista esté vacía. Al añadir una publicación, actualizar también el aviso de descargas, las preguntas frecuentes y las novedades con la información real. No inventar compatibilidad, fechas, firma digital o funciones.

Cloudflare Pages limita cada archivo a 25 MiB: alojar ejecutables mayores en **Cloudflare R2 con dominio de descarga propio** o en releases de un proveedor y enlazarlos desde el catálogo. Mantener los instaladores fuera de `public/` y del repositorio del sitio. Configurar Content-Type y Content-Disposition en el alojamiento del archivo; publicar requisitos, versión, checksum y firma cuando existan.

Referencia: https://developers.cloudflare.com/pages/platform/limits/

## Diseño y animación

- `src/styles/global.css`: identidad, disposición y responsive.
- `src/styles/appearance.css`: colores de ambos temas, navbar de vidrio y controles. Los acentos azul, amarillo, verde y morado tienen contraste adaptado a cada tema.
- `src/styles/immersive.css`: composición del orbe, superficies glass y recorrido horizontal responsive.
- `src/scripts/particles.ts`: nube 3D a pantalla completa. Los shaders desplazan los puntos en la GPU según el puntero y el scroll vertical/horizontal; una sola llamada de dibujo. Menor densidad y resolución en móvil, máximo 30 FPS en móvil y 45 en escritorio. Se detiene al ocultar la pestaña y dispone de fondo estático si WebGL falla.
- `src/scripts/experience.ts`: carga diferida de Three.js y videos, pausa fuera de pantalla, recorrido horizontal y preferencia de movimiento. Empieza pausado con movimiento reducido o ahorro de datos; el botón permite elegir y recordar la elección (`osz-ai-motion`). No intercepta el scroll vertical.
- `src/components/Orb.astro`: integra el video de Veo con la identidad OSZ AI y adaptación a ambos temas.
- `src/components/AgentJourney.astro`: tarjetas navegables con trackpad, gesto táctil, botones y flechas del teclado cuando el recorrido tiene el foco.
- El sitio se presenta en oscuro fijo (`data-theme="dark"` en `Layout.astro`) y sin botón de tema. `ThemeInit.astro`, `ThemeToggle.astro` y los estilos claros se conservan sin activar por si se solicita recuperar el selector. Las preferencias claras guardadas anteriormente no cambian el tema actual.
- `src/components/Core.astro`: diagrama conceptual por capas, con botón para separar/reunir. Respeta `prefers-reduced-motion`.
- `src/layouts/Layout.astro`: navegación, metadatos y vínculos de marca.
- `src/pages/`: páginas con rutas limpias.

El diagrama no representa funciones confirmadas del ejecutable. Es la primera exploración visual. Cuando lleguen las imágenes definitivas, exportar sus piezas en capas transparentes con el mismo lienzo y punto de anclaje; integrarlas en el componente y animar transformaciones con GSAP. Si solo hay una imagen plana, primero debe prepararse la separación de piezas. Para un giro 3D real se necesita geometría 3D; una imagen plana no contiene la parte posterior del objeto.

Pendientes de producto: función principal, capturas reales, instaladores, arquitecturas, requisitos, política de datos y condiciones comerciales.

## Música de fondo

`BackgroundMusic.astro` incluye reproducción/pausa y volumen, con preferencias locales (`osz-ai-music` y `osz-ai-music-volume`). Intenta reproducir al entrar; si el navegador bloquea el audio automático, reintenta con el primer clic, toque o pulsación de tecla en la página. El botón Música también permite activarla. Respeta la elección de apagarla y pausa mientras la pestaña está oculta. No se puede garantizar audio al cargar sin interacción en todos los navegadores.

`public/media/background-music.mp3` es una copia optimizada (96 kbps, unos 749 KiB) de la canción proporcionada en `design-inbox/songs`, recortada desde 1:28 hasta el final. El original permanece intacto. Tiene volumen reducido 8 dB y fundidos suaves; el control comienza al 25 %. El bucle vuelve al comienzo del fragmento (1:28 del original), también al abrir otra página.

## Videos integrados

El original `design-inbox/videos/animacion veo.mp4` se conserva intacto (4K, 8 segundos, aproximadamente 5.9 MB). Las copias públicas en `public/media/` eliminan audio y usan un pequeño fundido entre el final y el inicio para suavizar el bucle:

- `veo-orb-1440.mp4`: versión de escritorio, aproximadamente 523 KB.
- `veo-orb-768.mp4`: versión móvil, aproximadamente 179 KB.
- `veo-orb-poster.webp`: imagen inicial y alternativa cuando no se reproduce.
- `glow-ia.webm`: Glow IA original de 150 × 150, usado como detalle de marca pequeño para evitar pixelación.
- `glow-ia-poster.webp`: alternativa estática con transparencia.

Los videos se cargan al entrar en pantalla si el movimiento está activo. El original 4K y las referencias de `design-inbox/` no se incluyen en la salida pública. Para cambiar el video, sustituir las copias optimizadas y el poster; mantener las rutas o actualizarlas en `Orb.astro`. El test de medios impide publicar por accidente un video de más de 1 MB o un poster de más de 50 KB.
