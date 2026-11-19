// Utilidades compartidas: URL del motor, instancia principal y manejo de errores de los workers.
const BASE_URL = process.env.CAMUNDA_URL || "http://localhost:8080/engine-rest";

/**
 * Si la tarea está dentro de un subproceso (Call Activity), busca la instancia principal.
 * Así los registros quedan ligados al proceso que inició el caso.
 */
async function instanciaPrincipal(processInstanceId) {
  let actual = processInstanceId;
  for (let i = 0; i < 5; i++) {
    const resp = await fetch(`${BASE_URL}/process-instance?subProcessInstance=${actual}`);
    if (!resp.ok) throw new Error(`Camunda respondió ${resp.status} al buscar la instancia principal`);
    const padres = await resp.json();
    if (!padres.length) return actual;
    actual = padres[0].id;
  }
  return actual;
}

/**
 * Envuelve un worker. Si falla:
 *  - por datos inválidos (400, 404, 409) se crea un incidente de una vez (no sirve reintentar),
 *  - por conexión u otro error se reintenta 3 veces cada 10 s y después queda el incidente.
 * El incidente se ve en Cockpit con el mensaje de error.
 */
function conManejoDeErrores(topic, worker) {
  return async ({ task, taskService }) => {
    try {
      await worker({ task, taskService });
    } catch (e) {
      const datosInvalidos = [400, 404, 409].includes(e.status);
      const intentos = datosInvalidos ? 0 : (task.retries == null ? 3 : task.retries - 1);
      console.error(`[${topic}] Falló: ${e.message}. Reintentos que quedan: ${Math.max(intentos, 0)}`);
      await taskService.handleFailure(task, {
        errorMessage: String(e.message).slice(0, 600),
        errorDetails: e.stack || String(e),
        retries: Math.max(intentos, 0),
        retryTimeout: 10000
      });
    }
  };
}

module.exports = { BASE_URL, instanciaPrincipal, conManejoDeErrores };
