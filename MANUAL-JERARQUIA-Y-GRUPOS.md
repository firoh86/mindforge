# MindForge — Manual de jerarquía, plegado y grupos

Este documento recoge, en orden lógico, **todas las reglas y casuísticas** de cómo se comportan los nodos y las
conexiones cuando se pliegan ramas, se contraen grupos o se ocultan nodos. Está pensado como manual de referencia:
cada sección explica una pieza y la siguiente se apoya en la anterior.

> Los nombres entre `código` apuntan a la implementación (`src/js/`): `08a-tree.js` (jerarquía y plegado),
> `08b-groups.js` (grupos), `08-edges.js` y `09-edge-thickness.js` (conexiones).

---

## Índice

1. [Conceptos básicos](#1-conceptos-básicos)
2. [La jerarquía sale de las flechas](#2-la-jerarquía-sale-de-las-flechas)
3. [Plegar una rama](#3-plegar-una-rama)
4. [Grupos (cuadros de texto con nodos dentro)](#4-grupos-cuadros-de-texto-con-nodos-dentro)
5. [Contraer un grupo](#5-contraer-un-grupo)
6. [Qué queda oculto: la regla del «padre visible»](#6-qué-queda-oculto-la-regla-del-padre-visible)
7. [Conexiones cuando hay nodos ocultos](#7-conexiones-cuando-hay-nodos-ocultos)
8. [Flechas discontinuas y «Ver principal / Ver todo»](#8-flechas-discontinuas-y-ver-principal--ver-todo)
9. [Reparto de puntos de anclaje en los bordes](#9-reparto-de-puntos-de-anclaje-en-los-bordes)
10. [Mover, copiar y borrar con ramas y grupos](#10-mover-copiar-y-borrar-con-ramas-y-grupos)
11. [Tabla resumen de casos](#11-tabla-resumen-de-casos)
12. [Límites conocidos](#12-límites-conocidos)

---

## 1. Conceptos básicos

| Término | Significado |
|---|---|
| **Nodo** | Cualquier tarjeta del lienzo (burbuja, texto, imagen, comentario, tarea…). |
| **Conexión / flecha** | Une dos nodos. Puede ser continua o discontinua, con o sin texto. |
| **Padre / hijo** | Dentro de una conexión, el nodo al que apunta la flecha es el **hijo**; el otro es el **padre**. |
| **Rama** | Un nodo y todo lo que cuelga de él (sus hijos, los hijos de sus hijos…). |
| **Plegado** | Ocultar la rama de un nodo. El nodo plegado muestra un botón `+N` con cuántos nodos oculta. |
| **Grupo** | Un cuadro de texto que contiene nodos «bloqueados» (los **miembros**). |
| **Contraer** | Reducir un grupo a su cabecera (solo el nombre y los botones). Es distinto de plegar. |
| **Oculto** | Nodo que no se dibuja ahora mismo, por una rama plegada o por un grupo contraído. |
| **Ocultador** | El nodo visible que provoca que otro esté oculto (el nodo plegado o el grupo contraído). |

**Plegar y contraer son dos mecanismos distintos** que pueden combinarse. Un nodo está oculto si *cualquiera* de los dos
lo oculta; las reglas de este manual explican cómo se resuelve cada combinación.

---

## 2. La jerarquía sale de las flechas

No hay un «árbol» aparte: la jerarquía se calcula siempre a partir de las conexiones.

1. **Flecha normal** (`origen → destino`): el origen es el padre y el destino es el hijo.
2. **Flecha invertida** (`origen ← destino`, la punta está en el origen): el padre pasa a ser el **destino** y el hijo el
   origen. Es decir, **la punta de la flecha siempre apunta al hijo**. Invertir una flecha intercambia padre e hijo.
3. **Flecha doble** (punta en ambos extremos): **no es jerarquía**. Une pares (hermanos, «A y B van juntos») y nunca
   convierte a ninguno en padre del otro. Por tanto, no se pliega ni se oculta nada a través de una flecha doble.
4. **Un nodo puede tener varios padres** (varias flechas le llegan). Esto es clave para la regla del «padre visible»
   (sección 6).
5. **Los miembros de un grupo cuelgan del cuadro del grupo**: a efectos de ocultar, el cuadro es el «padre» de sus
   miembros (aunque no haya flecha). Pero **plegar el propio cuadro nunca oculta a sus miembros** (ver sección 3.4).
6. Una conexión de un nodo consigo mismo no cuenta.

---

## 3. Plegar una rama

El botón de la esquina del nodo (`−` / `+N`) pliega o despliega su rama.

### 3.1 Qué se oculta
Al plegar un nodo se ocultan **todos sus descendientes** (hijos, nietos…), siguiendo solo conexiones reales.

### 3.2 El botón solo aparece si hay rama propia
Si todos los hijos de un nodo tienen *otro* padre visible (y no plegado), no hay nada que plegar y **no se muestra el
botón**. El contador `+N` indica el número de nodos que realmente quedan ocultos, no el de hijos directos.

### 3.3 Plegado en cadena
Si un nodo plegado tiene dentro otro nodo plegado, solo se ve el de más arriba. Al desplegarlo, el de dentro **sigue
plegado** (cada nodo conserva su propio estado).

### 3.4 Plegar un cuadro de texto de grupo
Plegar un cuadro que es grupo oculta lo que **cuelga de sus flechas**, no a sus miembros. Los miembros se ocultan con el
**grupo contraído** o cuando se oculta el propio cuadro (sección 6.3).

### 3.5 Crear un hijo en un nodo plegado
Al añadir un hijo (tecla Tab o desde la bolita de conexión), el nodo plegado se **despliega** automáticamente para que se
vea el nuevo nodo.

### 3.6 Mover una rama plegada
Al arrastrar un nodo plegado, **su rama oculta se mueve con él** (mantiene las posiciones relativas), de modo que al
desplegar no aparece lejos.

---

## 4. Grupos (cuadros de texto con nodos dentro)

### 4.1 Cómo se forma un grupo
Se arrastra un nodo y se mantiene con su **centro dentro** de un cuadro de texto que esté **por detrás** de él (o enviado
al fondo) durante ~1,2 s. El nodo pasa a ser **miembro** y queda **bloqueado** (icono de candado).

### 4.2 Qué significa estar bloqueado
- El miembro **solo se mueve con su cuadro**.
- Para liberarlo: clic directo en el candado, o mantener pulsado el nodo ~1,2 s.
- Si se suelta (o se redimensiona el cuadro de modo que el centro queda fuera), el miembro **sale del grupo** y aparece el
  aviso «Fuera del grupo».

### 4.3 Un cuadro con grupo solo lleva su nombre
Al convertirse en grupo, el texto del cuadro se reduce a **una línea** de hasta 60 caracteres (la primera).

### 4.4 Orden visual
Un miembro nunca queda **por detrás** de su cuadro (se perdería bajo el fondo). El programa reordena y quita «al fondo» si
hace falta.

### 4.5 Un grupo nunca anida otro grupo
- Un cuadro que **ya tiene miembros** no puede meterse dentro de otro cuadro.
- Un nodo que **ya es miembro** no puede convertirse a la vez en cuadro de grupo.
- Un cuadro de texto «vacío» (sin miembros) **sí** puede ser miembro de un grupo; mientras no tenga miembros propios, se
  comporta como un nodo más.
- Un cuadro de texto enviado al fondo puede bloquear a un nodo de texto normal, pero **no** a un cuadro que ya funciona
  como grupo.

---

## 5. Contraer un grupo

El botón `⌄` de la cabecera contrae el grupo: **solo se ve la cabecera** (el nombre, el candado, el botón de contraer y
el `(i)`). El ancho se ajusta al nombre; al expandir recupera su ancho y se recalcula para abarcar a todos sus miembros.

### 5.1 Qué se oculta al contraer
1. **Todos los miembros** del grupo.
2. **Todo lo que cuelga de los miembros**, salvo lo que tenga **otro padre visible** (sección 6).

### 5.2 Efectos al expandir
Todo vuelve a su sitio y **las conexiones recuperan su estado real**. Los nodos que estaban plegados de forma independiente
siguen plegados.

### 5.3 Contraer y plegar a la vez
Si el cuadro de un grupo queda oculto (porque está en una rama plegada, o es miembro de otro grupo contraído), **sus
miembros se ocultan siempre con él**, y con ellos lo que cuelga solo de ellos. Esto se repite en cadena hasta que no
cambia nada.

---

## 6. Qué queda oculto: la regla del «padre visible»

Esta es la regla central. Sirve igual para ramas plegadas y para grupos contraídos.

> **Un nodo candidato a ocultarse permanece visible si tiene al menos otro padre que está visible y no plegado.**

Se aplica de forma iterativa: al quedar visible un nodo, también sus propios descendientes pueden «salvarse» si cuelgan de
él.

### 6.1 Ejemplo A — un hijo con dos padres
```
   P1 ──▶ X          P1 plegado:  X sigue visible porque su otro padre P2 está visible.
   P2 ──▶ X
```

### 6.2 Ejemplo B — dos padres, ambos plegados u ocultos
Si **todos** los padres de X están ocultos o plegados, X se oculta.

### 6.3 Ejemplo C — rama colgando de un miembro de grupo
Un grupo con miembros `M1`, `M2`, y `B2` colgando solo de `M2`. Al contraer el grupo, se ocultan `M1`, `M2` **y `B2`**.
Si `B2` además colgara de un nodo `Z` visible y sin plegar, `B2` **permanece visible** (padre visible).

### 6.4 Ejemplo D — grupo dentro de una rama plegada
`T1 ──▶ G1(miembro M1)`. Al plegar `T1`: se oculta `G1`; **`M1` se oculta con el cuadro** aunque no tenga flecha
propia, y lo que cuelga solo de `M1` también.

### 6.5 Orden de resolución
1. Se calcula lo oculto por ramas plegadas y se aplica la regla del padre visible.
2. Se calcula lo oculto por grupos contraídos y se aplica la misma regla.
3. Se propaga: los miembros de cualquier cuadro oculto se ocultan, y lo que cuelga solo de ellos (se repite hasta estabilizar).
4. Para cada nodo oculto se recuerda **quién lo oculta** (el plegado o el grupo contraído): se usa para dibujar las
   conexiones (sección 7).

---

## 7. Conexiones cuando hay nodos ocultos

Cuando un extremo de una conexión queda oculto hay cuatro situaciones. La clave es: **¿el extremo visible está dentro del
ocultador (su propia rama) o es otro nodo?**

### 7.1 Los dos extremos visibles
Se dibuja la flecha normal (con su texto y su dirección).

### 7.2 Los dos extremos ocultos
No se dibuja nada.

### 7.3 Flecha continua desde fuera hacia un miembro de un grupo contraído («flecha virtual»)
La flecha **se acorta hasta la cabecera del grupo**, con la **misma dirección** y **el mismo texto**. Solo es visual:
al expandir el grupo, la flecha vuelve a ir al miembro real.
- Si varias flechas comparten origen, destino (el grupo) y dirección, se dibuja **una sola**, con el texto de la primera
  que lo tenga.
- Esta flecha virtual **no se selecciona ni se edita** (para editarla, se expande el grupo).

### 7.4 Flecha continua entre un nodo visible y un nodo oculto que *no* es de su rama («tramo con bola»)
Se dibuja un **tramo que sale del nodo visible y llega casi hasta el ocultador**, y termina en una **bola** en lugar de
punta de flecha. Significa: «aquí hay nodos ocultos con los que existe una relación».
- **Texto**: si la conexión tenía texto, se mantiene visible en mitad del tramo y **se puede editar con doble clic**.
- **Punta**: si la flecha apuntaba al nodo visible, **conserva su punta** en ese extremo.
- **Discontinua**: si la conexión es discontinua, el tramo también lo es.
- **Unificación**: los tramos del mismo nodo visible hacia varios ocultos del mismo grupo se unen en uno solo.
- Si no se puede saber qué nodo lo oculta, el tramo es corto y apunta hacia donde estaría el nodo oculto.
- Solo es visual: el tramo **no se selecciona** (solo su texto es editable).

### 7.5 Conexión del propio nodo plegado con su rama
No se dibuja ningún tramo: ya lo indica el botón `+N`.

### 7.6 Resumen según tipo de línea

| Situación | Continua | Discontinua |
|---|---|---|
| Extremo oculto = miembro de un grupo contraído | Flecha virtual hasta la cabecera (con texto) | **Se oculta** |
| Extremo oculto por una rama plegada ajena | Tramo con bola | Tramo con bola (discontinuo) |
| Extremo oculto de la rama del propio nodo plegado | Nada (botón `+N`) | Nada |

---

## 8. Flechas discontinuas y «Ver principal / Ver todo»

### 8.1 Qué es discontinuo
Toda conexión que toque un nodo de tipo **texto, comentario o tarea** se dibuja discontinua: indica una relación
«accesoria», no estructural.

### 8.2 Ver principal / Ver todo
Un interruptor (menú contextual del lienzo, debajo de «Centrar vista», y el 5.º botón de arriba a la derecha) oculta o
muestra **todas las flechas discontinuas**, para ver de un vistazo la jerarquía principal. El estado se guarda en el
tablero.

En «Ver principal» también se ocultan los tramos con bola de conexiones discontinuas.

---

## 9. Reparto de puntos de anclaje en los bordes

Cuando varias conexiones llegan o salen **por el mismo lado** de un nodo, no se dibujan solapadas: se reparten a lo largo
del lado. Los extremos se agrupan en **tres tipos**:

1. **Con punta de flecha**
2. **Sin punta** (origen de una flecha normal)
3. **Con bola** (tramo hacia nodos ocultos, en el nodo ocultador)

Cada tipo que conviva en el mismo lado recibe **su propio punto**; los extremos del mismo tipo comparten punto. Los puntos
se ordenan según la posición del nodo del otro extremo (para que las líneas no se crucen) y se separan como máximo 28 px.

**Lado elegido**: si el otro nodo está por debajo → lado inferior; por encima → superior; si se solapan en vertical →
derecho o izquierdo según su posición.

**Límite**: las flechas virtuales hasta un grupo contraído salen del centro del lado; solo los tramos con bola se reparten.

---

## 10. Mover, copiar y borrar con ramas y grupos

| Acción | Qué ocurre |
|---|---|
| **Mover un nodo plegado** | Se mueve con toda su rama oculta. |
| **Mover un grupo** | Se mueve con todos sus miembros (también los de la rama oculta de un grupo contraído). |
| **Mover un miembro** | Está bloqueado: no se puede mover por separado salvo que se libere. |
| **Borrar un cuadro con grupo** | Pregunta: **Eliminar todo el grupo** (cuadro + miembros) o **Solo el cuadro** (los miembros quedan libres, o pasan al grupo superior si el cuadro era miembro). |
| **Borrar un nodo** | Se borran también sus conexiones. Los hijos que quedan sin padre pasan a ser raíces. |
| **Copiar** | El grupo se conserva si se copia entero (cuadro + miembros); si no, los copiados quedan libres. |
| **Ocultos y selección** | Un nodo oculto se quita solo de la selección; una conexión seleccionada deja de estarlo si alguno de sus extremos se oculta. |

---

## 11. Tabla resumen de casos

| # | Situación | Resultado |
|---|---|---|
| 1 | Plegar nodo con hijos propios | Se ocultan hijos y descendientes; botón `+N`. |
| 2 | Plegar nodo cuyos hijos tienen otro padre visible | No hay botón; nada se oculta. |
| 3 | Hijo con dos padres, uno plegado | El hijo sigue visible. |
| 4 | Hijo con dos padres, ambos plegados | El hijo se oculta. |
| 5 | Flecha doble | No cuenta como jerarquía: nunca oculta nada. |
| 6 | Flecha invertida | Padre = destino, hijo = origen. |
| 7 | Plegar el cuadro de un grupo | Oculta lo que cuelga de sus flechas, **no** a los miembros. |
| 8 | Contraer grupo | Oculta miembros y lo que cuelga solo de ellos. |
| 9 | Descendiente de un miembro con otro padre visible | Permanece visible al contraer. |
| 10 | Cuadro oculto por una rama plegada | Sus miembros se ocultan con él. |
| 11 | Grupo dentro de grupo | No permitido. |
| 12 | Flecha continua externa → miembro, grupo contraído | Se muestra hasta la cabecera, con su texto. |
| 13 | Flecha discontinua externa → miembro, grupo contraído | Se oculta. |
| 14 | Flecha entre visible y oculto (rama ajena) | Tramo con bola hasta el ocultador; texto editable. |
| 15 | Flecha del nodo plegado con su propia rama | Nada (botón `+N`). |
| 16 | Varias flechas al mismo grupo contraído | Una sola, con el texto de la primera que tenga. |
| 17 | Añadir hijo a un nodo plegado | Se despliega. |
| 18 | Borrar cuadro con grupo | Pregunta: todo el grupo o solo el cuadro. |
| 19 | «Ver principal» activo | Se ocultan todas las discontinuas, incluidos sus tramos con bola. |
| 20 | Varios tipos de extremo en un mismo lado | Reparto en hasta 3 puntos (flecha, sin punta, bola). |

---

## 12. Límites conocidos

- Todo se ha probado en navegador con pruebas automáticas; **no** en la aplicación Tauri real.
- Las flechas virtuales (hasta la cabecera del grupo) y los tramos con bola **no se seleccionan ni se editan** (salvo el
  texto del tramo con bola).
- Varias flechas distintas que llegan a la cabecera de un grupo contraído por el mismo lado pueden **solaparse** (las
  virtuales no entran en el reparto de anclajes).
- Una flecha real que atraviesa visualmente un grupo hacia un miembro puede pasar muy cerca de la bola de un tramo.
- El nodo que oculta a otro se resuelve siguiendo la cadena de ocultadores (hasta 50 pasos); en estructuras patológicas
  (ciclos) se usa el tramo corto.
