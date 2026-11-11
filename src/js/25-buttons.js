"use strict";
/* =====================  Botones  ===================== */
      $("#clearBtn").onclick = clearAll;
      $("#undoBtn").onclick = undo;
$("#redoBtn").onclick = redo;
$("#zIn").onclick = () => zoomCenter(1.2);
$("#zOut").onclick = () => zoomCenter(1 / 1.2);
$("#fitBtn").onclick = fit;
// «Ver principal» / «Ver todo»: oculta o muestra las flechas discontinuas (las de comentarios, tareas y cuadros de texto)
function toggleMainOnly() {
  board.mainOnly = !board.mainOnly;
  renderEdges();
  toast(board.mainOnly ? "Flechas discontinuas ocultas" : "Flechas discontinuas visibles");
  scheduleSave();
}
$("#mainBtn").onclick = toggleMainOnly;
// «Esquivar nodos»: las flechas rodean los nodos que se interpongan (pueden seguir cruzándose entre sí)
$("#avoidBtn").onclick = () => {
  board.avoid = !board.avoid;
  renderEdges();
  toast(board.avoid ? "Las flechas esquivan los nodos" : "Las flechas van en línea recta entre nodos");
  scheduleSave();
};
$("#snapBtn").onclick = (e) => {
  snapOn = !snapOn;
  e.currentTarget.classList.toggle("on", snapOn);
  toast(
    snapOn
      ? "Imán a la rejilla: activado"
      : "Imán a la rejilla: desactivado",
  );
};
